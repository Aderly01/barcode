// 1 - Invocamos a Express
const express = require('express');
const app = express();


//2 - Para poder capturar los datos del formulario (sin urlencoded nos devuelve "undefined")
app.use(express.urlencoded({extended:false}));
app.use(express.json());//además le decimos a express que vamos a usar json

//3- Invocamos a dotenv
const dotenv = require('dotenv');
dotenv.config({ path: './env/.env'});

//4 -seteamos el directorio de assets
app.use('/resources',express.static('public'));
app.use('/resources', express.static(__dirname + '/public'));

//5 - Establecemos el motor de plantillas
app.set('view engine','ejs');

//6 -Invocamos a bcrypt
const bcrypt = require('bcryptjs');

//7- variables de session
const session = require('express-session');
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));

// 8 - Invocamos a la conexion de la DB
const connection = require('./database/db');
const { render } = require('ejs');
const { query } = require('./database/db');


const { get } = require('http');
const pdf = require('html-pdf');
const fs = require('fs');
const { print } = require('pdf-to-printer');
const { getPrinters } = require('pdf-to-printer');

const { rest,adminDefault } = require('./configDB.js');

//9 - establecemos las rutas
app.get('/login',(req, res)=>{
	res.render('login');
})

	//limpiar el buscador
app.get('/clear',(req, res)=>{
	res.redirect('/');
})
app.get('/clear-2',(req, res)=>{
	res.redirect('/bundle-search');
})

app.post('/search-update',(req, res)=>{
		let art = req.body.searchArt;
		connection.query('SELECT * FROM bundle WHERE articulo = ?',[art],(error, results)=>{
			if (error || results.length== 0) {
				console.log(error);
				res.render('bundle',{
					login: true,
					name: req.session.name,
					rol:req.session.rol
				});
				
			}else{
				res.render('bundle',{
					login: true,
					name: req.session.name,
					rol:req.session.rol,
					cod:results[0].codigo,
					des:results[0].descripcion,
					art:results[0].articulo
					
				});
			}
			
		});
});
	
//10 - Método para la REGISTRACIÓN
app.post('/register', async (req, res)=>{
	const user = req.body.user;
	const name = req.body.name;
    const rol = req.body.rol;
	const pass = req.body.pass;
	let passwordHash = await bcrypt.hash(pass, 8);
    connection.query('INSERT INTO users SET ?',{user:user, name:name, rol:rol, pass:passwordHash}, async (error, results)=>{
        if(error){
			res.redirect('/users');
            console.log(error);
        }else{       
			if (req.session.loggedin) {
				res.redirect('/users');		
			} else {
				res.render('login',{
					login:false,		
				});				
			}
			res.end();  
            //res.redirect('/');         
        }
	});
});
app.post('/register-bundle', async (req, res)=>{
	const art = req.body.articulo;
	const cod = req.body.codigo;
    const des = req.body.descripcion;
    connection.query('INSERT INTO bundle SET ?',{articulo:art,codigo:cod,descripcion:des}, async (error, results)=>{
        if(error){
			res.redirect('/bundle-register')
            console.log(error);
        }else{       
			if (req.session.loggedin) {
				res.render('bundleRegister',{
					login: true,
					name: req.session.name,
					rol:req.session.rol
				});		
			} else {
				res.render('login',{
					login:false,		
				});				
			}
			res.end();  
            //res.redirect('/');         
        }
	});
});
app.post('/update-bundle', async (req, res)=>{
	const art = req.body.articulo;
	const cod = req.body.codigo;
    const des = req.body.descripcion;
    connection.query('UPDATE bundle SET codigo=?, descripcion=? WHERE articulo=?',[cod,des,art], async (error, results)=>{
        if(error){
            console.log(error);
        }else{       
			if (req.session.loggedin) {
				res.render('bundle',{
					login: true,
					name: req.session.name,
					rol:req.session.rol,
					art:art,
					cod:cod,
					des:des

				});
			} else {
				res.render('login',{
					login:false,		
				});				
			}
			res.end();  
            //res.redirect('/');         
        }
	});
});

//11 - Metodo para la autenticacion
app.post('/auth', async (req, res)=> {
	const user = req.body.user;
	const pass = req.body.pass; 
	if(user === adminDefault.name && pass === adminDefault.password){
		req.session.loggedin = true;                
					req.session.name = adminDefault.name;
					req.session.rol = adminDefault.rol;
					res.render('login', {
						alert: true,
						alertTitle: "Conexión exitosa",
						alertMessage: "¡LOGIN CORRECTO!",
						alertIcon:'success',
						showConfirmButton: false,
						timer: 700,
						ruta: ''
					}); 
	}else{
		if (user && pass) {
			connection.query('SELECT * FROM users WHERE user = ?', [user], async (error, results, fields)=> {
				if( results.length == 0 || !(await bcrypt.compare(pass, results[0].pass)) ) {    
					res.render('login', {
							alert: true,
							alertTitle: "Error",
							alertMessage: "USUARIO y/o PASSWORD incorrectas",
							alertIcon:'error',
							showConfirmButton: true,
							timer: false,
							ruta: 'login'    
						});
								
				} else {         
					//creamos una var de session y le asignamos true si INICIO SESSION       
					req.session.loggedin = true;                
					req.session.name = results[0].name;
					req.session.rol = results[0].rol;
					res.render('login', {
						alert: true,
						alertTitle: "Conexión exitosa",
						alertMessage: "¡LOGIN CORRECTO!",
						alertIcon:'success',
						showConfirmButton: false,
						timer: 700,
						ruta: ''
					});        			
				}			
				res.end();
			});
		} else {	
			res.send('Please enter user and Password!');
			res.end();
		}
	}
});

//12 - Método para controlar que está auth en todas las páginas
app.get('/', (req, res)=> {
	if (req.session.loggedin) {
		res.render('index',{
			login: true,
			name: req.session.name,
			rol:req.session.rol
		});		
	} else {
		res.render('login',{
			login:false,		
		});				
	}
	res.end();
});
//ruta que muestra la vista de bundle
app.get('/bundle-search', (req, res)=> {
	if (req.session.loggedin) {
		if (req.session.rol == 'admin') {
			res.render('bundle',{
				login: true,
				name: req.session.name,
				rol:req.session.rol
			});	
		}else{
			res.render('index',{
				login: true,
				name: req.session.name,
				rol:req.session.rol
			});
		}
			
	} else {
		res.render('login',{
			login:false,		
		});				
	}
	res.end();
});
//ruta que muestra la vista de bundle register
app.get('/bundle-register', (req, res)=> {
	if (req.session.loggedin) {
		if (req.session.rol == 'admin') {
			res.render('bundleRegister',{
				login: true,
				name: req.session.name,
				rol:req.session.rol
			});	
		}else{
			res.render('index',{
				login: true,
				name: req.session.name,
				rol:req.session.rol
			});
		}	
	} else {
		res.render('login',{
			login:false,		
		});				
	}
	res.end();
});
app.get('/users', (req, res)=> {
	connection.query('SELECT * FROM users',(error, results)=>{
		if (req.session.loggedin) {
			if (req.session.rol == 'super-admin') {
				res.render('users',{
					login: true,
					name: req.session.name,
					rol:req.session.rol,
					users:results
				});
			}else{
				res.render('index',{
					login: true,
					name: req.session.name,
					rol:req.session.rol
				});
			}
			
	} else {
		res.render('login',{
			login:false,		
		});				
	}
	res.end();
	})
	
});

//Editar y eliminar users
app.get('/edit/:id',(req, res)=>{
	const id = req.params.id;
	connection.query('SELECT * FROM users WHERE id=?',[id], (error, results)=>{
		if(error){
            console.log(error);
        }else{       
			if (req.session.loggedin) {
				res.render('editUsers',{
					login: true,
					name: req.session.name,
					rol:req.session.rol,
					usere: results[0]
				});		
				console.log(results);
			} else {
				res.render('login',{
					login:false,		
				});				
			}
			res.end();       
        }
	});
})
app.post('/update',async(req, res)=>{
	const id = req.body.id;
	const user = req.body.user;
	const name = req.body.name;
	const rol = req.body.rol;
	const pass = req.body.pass
	let passwordHash = await bcrypt.hash(pass, 8);
	connection.query('UPDATE users SET ? WHERE id=?',[{user:user,name:name,rol:rol,pass:passwordHash},id],async (error, results)=>{
		if(error){
            console.log(error);
        }else{       
			if (req.session.loggedin) {
				res.redirect('/users');
			} else {
				res.render('login',{
					login:false,		
				});				
			}
			res.end();       
        }
	});
});
app.get('/delete/:id',(req, res)=>{
	const id = req.params.id;
	connection.query('DELETE FROM users WHERE id=?',[id], (error, results)=>{
		if(error){
            console.log(error);
        }else{       
			if (req.session.loggedin) {
				res.redirect('/users');		
				console.log(results);
			} else {
				res.render('login',{
					login:false,		
				});				
			}
			res.end();       
        }
	});
})
//función para limpiar la caché luego del logout
app.use(function(req, res, next) {
    if (!req.user)
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    next();
});

 //Logout
//Destruye la sesión.
app.get('/logout', function (req, res) {
	req.session.destroy(() => {
	  res.redirect('/')
	})
});


const options = {height: "27mm",width: "48mm"};
const optionsP = {
	printer: "ZDesigner ZD230-203dpi ZPL",
	win32: ['-print-settings "fit"'],
	unix: ["-o fit-to-page"]
  };
const options2 = {height: "60mm",width: "110mm"};
const optionsP2 = {
	  printer: "ZDesigner ZD230-203dpi ZPL",
	  win32: ['-print-settings "fit"'],
	  unix: ["-o fit-to-page"],
	};

app.post('/imprimirBundle',async(req,res)=>{
	const des = req.body.textarea;
	const cod = req.body.codigo;
	const cant = req.body.cant;
	res.render('pdf2',{
		des:des,
		cod:cod
		},function(err,html){
		pdf.create(html,options).toFile(`./pdf/bundle.pdf`,function(error,results){
			if(error){
				console.log(error);
			}else{
				console.log(results)
				var datafile = fs.readFileSync(`./pdf/bundle.pdf`);
				res.header('content-type','application/pdf');
				res.send(datafile); 
				
				/* for(let count = 1;count <= cant;count++){
					print("./pdf/bundle.pdf", optionsP).then(console.log);
				}
				res.redirect('/bundle-search') */
			}
		})
	})
});
app.post('/imprimirBulk',(req,res)=>{
	const des = req.body.textarea;
	const cod = req.body.codigo;
	const cant = req.body.cant;
	res.render('pdf',{
		des:des,
		cod:cod
		},function(err,html){
		pdf.create(html,options2).toFile(`./pdf/bulk.pdf`,function(error,results){
			if(error){
				console.log(error);
			}else{
				console.log(results)
				var datafile = fs.readFileSync(`./pdf/bulk.pdf`);
				res.header('content-type','application/pdf');
				res.send(datafile); 
				
				/* for(let count = 1;count <= cant;count++){
					print("./pdf/bundle.pdf", optionsP).then(console.log);
				}
				res.redirect('/bundle-search') */
			}
		})
	})
});

app.listen(3000, (req, res)=>{
    console.log('SERVER RUNNING IN http://localhost:3000');
});


app.post('/search',(req,res)=>{
	let art = req.body.searchArt;
	setTimeout(async ()=> {
		const show =await rest.executeQuery('SELECT [ARTICULO],[DESCRIPCION],[CODIGO_CORPORATIVO] FROM [exactus].[h335].[ARTICULO_COMPRA] WHERE [ARTICULO] = @id',[{name:'id',type:'varchar',value: art}])
		if(show.data == false){
			res.redirect('/')
		}else{
		
			if(show.data[0][0]['CODIGO_CORPORATIVO'] == null){
				res.render('index',{
					login: true,
					name: req.session.name,
					rol:req.session.rol,
					codigo: '0',
					cantidad: '0',
					descripcion: 'Este articulo no tiene codigo corporativo',
					articulo: ' '
				})
			}else{
				const codigo = show.data[0][0]['CODIGO_CORPORATIVO'];
				const codQtv = codigo.split('-');
				res.render('index',{
					login: true,
					name: req.session.name,
					rol:req.session.rol,
					codigo: codQtv[0],
					cantidad: codQtv[1],
					descripcion: show.data[0][0]['DESCRIPCION'],
					articulo: show.data[0][0]['ARTICULO']
				});
			}
		}	
	})
});

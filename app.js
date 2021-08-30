// 1 - Invocamos a Express
const express = require('express');
const app = express();
/* app.get('/ejemplo',(req,res)=>{
	res.render('ejemplo');
}) */
const JsBarcode = require('jsbarcode');
const { Canvas } = require("canvas");

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


//9 - establecemos las rutas
	app.get('/login',(req, res)=>{
		res.render('login');
	})

	app.get('/register',(req, res)=>{
		res.render('register');
	})
	//limpiar el buscador
	app.get('/clear',(req, res)=>{
		res.redirect('/');
	})
	app.get('/clear-2',(req, res)=>{
		res.redirect('/bundle-search');
	})
	app.post('/search',(req, res)=>{
		let art = req.body.searchArt;
		connection.query('SELECT * FROM bundle WHERE articulo = ?',[art],(error, results)=>{
			/* const canvas = new Canvas();
			JsBarcode(canvas,results[0].codigo,{format:'ean13'}); */
			if (error || results.length== 0) {
				console.log(error);
				res.render('index',{
					login: true,
					name: req.session.name,
					rol:req.session.rol
				});
				
			}else{
				res.render('index',{
					login: true,
					name: req.session.name,
					rol:req.session.rol,
					cod:results[0].codigo,
					des:results[0].descripcion,
					art:results[0].articulo
					// barra:canvas
				});	 
				console.log(results);
			}
			
		});
	});
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
				console.log(results);
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
            console.log(error);
        }else{            
			res.render('register', {
				alert: true,
				alertTitle: "Registration",
				alertMessage: "¡Successful Registration!",
				alertIcon:'success',
				showConfirmButton: false,
				timer: 1000,
				ruta: ''
			});
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
				console.log(results)
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

app.listen(3000, (req, res)=>{
    console.log('SERVER RUNNING IN http://localhost:3000');
});
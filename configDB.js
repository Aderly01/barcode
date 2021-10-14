const rest = new (require('rest-mssql-nodejs'))({
    user:"adm-rodrice",
	password:"Eternal2021",
	server:"10.202.101.6",
	database:"exactus",
    options: { 
        encrypt: true // this is optional, by default is false
    } 
});
const adminDefault = {
    name: 'ICTmanager',
    rol:'admin',
    password: 'Eternal2021'
}

module.exports = {
    rest,
    adminDefault
}
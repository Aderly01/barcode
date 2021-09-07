const rest = new (require('rest-mssql-nodejs'))({
    user:"adm-rodrice",
	password:"Eternal2021",
	server:"10.202.101.6",
	database:"exactus",
    options: { 
        encrypt: true // this is optional, by default is false
    } 
});

module.exports = {
    rest
}
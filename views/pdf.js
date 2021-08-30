const PDF = require('pdfkit');
const fs = require('fs');

var doc = new PDF();
doc.pipe(fs.createWriteStream('./generar.pdf'));
doc.image()

doc.end();
const http = require('http')
const mysql = require('mysql')
const fs = require('fs')
const { parse } = require('path')
const path = require('path')

const db = mysql.createConnection({
    host: 'db',
    user: 'root',
    database: 'myDB'
})

db.connect((err) => {
    if (err) {
        console.error('Something is not working in SQL', err)
    }
    else {
        console.log('Sucessfully connected to mySQL DB')
    }
})

const server = http.createServer((req, res) => {

    if (req.method === 'GET' && req.url === '/') {
        fs.readFile(path.join(__dirname, 'index.htm'), (err, content) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server Error: Cannot load index page');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(content);
            }
        });
    }
    else if (req.method == 'POST' && req.url == '/submit') {

        let storage = '';

        req.on('data', tmp => {
            storage += tmp.toString();
        });

        req.on('end', () => {
            const parsedData = new URLSearchParams(storage)
            const name = parsedData.get('uName')
            const email = parsedData.get('uMail')

            console.log(`Received info for ${name} <${email}>`)

            const queryText = `INSERT INTO users VALUES(${name},${email})`

            db.query(queryText, (err, result) => {
                if (err) {
                    console.error('Failed during Database update:', err)
                    res.writeHead(500, { 'content-Type': 'text/plain' })
                    return res.end('Internal Server Error: Could not save data.')
                }
                else {
                    console.log(`Sucessfully Added Username: ${result.insertId}`)
                    res.writeHead(200, { 'content-Type': 'text/plain' })
                    res.end(`
                        <h2>Sucess!</h2>
                        <p>Thank you, ${name} your email ${email} has been saved.</p>
                        <a href="javascript:history.back()">Go Back</a>
                        `)
                }
            })

            res.end('Data Received')
        })

    }
    else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Page Not Found');
    }
});

server.listen(5500);
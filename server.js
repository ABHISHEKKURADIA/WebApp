require('dotenv').config();

const http = require('http')
const mysql = require('mysql')
const fs = require('fs')
const { parse } = require('path')
const path = require('path')

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10
})

const PORT = process.env.PORT;

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

            const queryText = `INSERT INTO users (user_name, user_mail) VALUES (?, ?)`


            db.query(queryText, [name, email], (err, result) => {
                if (err) {
                    console.error('Failed during Database update:', err)
                    res.writeHead(500, { 'content-Type': 'text/plain' })
                    return res.end('Internal Server Error: Could not save data.')
                }

                console.log(`Sucessfully Added Username: ${result.insertId}`)
                res.writeHead(200, { 'content-Type': 'text/html' })
                res.end(`
                        <h2>Sucess!</h2>
                        <p>Thank you, ${name} your email ${email} has been saved.</p>
                        <a href="javascript:history.back()">Go Back</a>
                        `)

            })

            //res.end('Data Received')
        })

    }

    else if (req.method == 'GET' && req.url == '/display?') {
        const query = "SELECT * from users;"
        db.query(query, (err, result) => {
            if (err) {
                console.error('Error During Database Read: ', err);
                return;
            }
            console.log('Fetched Data: ', result)
            let htmlResponse = `
        <h2>Registered Users Are:</h2>
        <table>
        <tr>
        <th>Name</ht>
        <th>Email</th>
        </tr>
        `

            result.forEach(user => {
                htmlResponse += `
            <tr>
            <td>${user.user_name}</td>
            <td>${user.user_mail}</td>
            </tr>
            `
            });

            htmlResponse += `
        </table>
        <br><br>
        <a href="javascript:history.back()">Go Back</a>
        `
            res.writeHead(200, { "content-type": "text/html" });
            res.end(htmlResponse);


        })
    }

    else if (req.method == 'POST' && req.url == '/remove') {
        let storage = '';

        req.on('data', chunk => {
            storage += chunk.toString();
        })

        req.on('end', () => {
            const parsedData = new URLSearchParams(storage)
            const emailToDelete = parsedData.get('deleteMail')
            console.log(`Attempt to Delete ${emailToDelete}`)

            const query = 'DELETE FROM users WHERE user_mail=?'

            db.query(query, [emailToDelete], (err) => {
                if (err) {
                    console.error('Error During user id removal: ', err)
                    res.writeHead(500, { "content-type": "text/plain" })
                    return res.end('Internal Server Error')
                }
            })

            res.writeHead(200, { "content-type": "text/html" })
            res.end(`
                    <h2>Sucess!</h2>
                    <p>The User ${emailToDelete} is now removed.</p>
                    <br><br>
                    <a href="javascript:history.back()">Go Back</a>
                `)
        })

    }

    else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Page Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`Server Listening at port ${PORT}`)
});
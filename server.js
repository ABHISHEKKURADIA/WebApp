const http = require('http')

const server = http.createServer((req, res) => {
    if (req.method == 'POST' && req.url == '/submit') {

        let storage = '';

        req.on('data', tmp => {
            storage += tmp.toString();
        });

        req.on('end', () => {
            const parsedData = new URLSearchParams(storage)
            console.log(`Name is ${parsedData.get('uName')}`)
            console.log(`Email is ${parsedData.get('uMail')}`)
            console.log('complete data was', storage)

            res.end('Data Received')
        })

    }
    else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Page Not Found');
    }
});

server.listen(5500);
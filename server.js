require('dotenv').config();

const http = require('http');
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10
});

const PORT = process.env.PORT || 3000;

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderPage({ title, heading, message, body, actions = [] }) {
    const actionMarkup = actions.map((action) => `<a class="btn btn-outline-primary me-2" href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>`).join('');

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escapeHtml(title)}</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
            body {
                background: linear-gradient(135deg, #f8f9fa 0%, #eef2ff 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2rem;
            }
            .response-card {
                width: min(100%, 720px);
                border: 0;
                border-radius: 1rem;
                box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
            }
            .response-card .card-body {
                padding: 2rem;
            }
        </style>
    </head>
    <body>
        <div class="card response-card">
            <div class="card-body">
                <h1 class="h3 mb-3">${escapeHtml(heading)}</h1>
                <p class="lead mb-4">${escapeHtml(message)}</p>
                ${body}
                <div class="d-flex flex-wrap mt-4">
                    ${actionMarkup}
                </div>
            </div>
        </div>
    </body>
    </html>`;
}

function sendHtml(res, statusCode, html) {
    res.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
}

const server = http.createServer((req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && requestUrl.pathname === '/') {
        fs.readFile(path.join(__dirname, 'index.htm'), (err, content) => {
            if (err) {
                sendHtml(res, 500, renderPage({
                    title: 'Server Error',
                    heading: 'Unable to load the form',
                    message: 'The application could not load the form page.',
                    body: '<div class="alert alert-danger">Please try again in a moment.</div>',
                    actions: [{ label: 'Try again', href: '/' }]
                }));
            } else {
                sendHtml(res, 200, content);
            }
        });
    }
    else if (req.method === 'POST' && requestUrl.pathname === '/submit') {
        let storage = '';

        req.on('data', tmp => {
            storage += tmp.toString();
        });

        req.on('end', () => {
            const parsedData = new URLSearchParams(storage);
            const name = parsedData.get('uName') || '';
            const email = parsedData.get('uMail') || '';

            console.log(`Received info for ${name} <${email}>`);

            const queryText = 'INSERT INTO users (user_name, user_mail) VALUES (?, ?)';

            db.query(queryText, [name, email], (err, result) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        console.warn(`Duplicate email attempt for ${email}`);
                        return sendHtml(res, 409, renderPage({
                            title: 'Duplicate email',
                            heading: 'Unable to save user',
                            message: 'That email address is already registered.',
                            body: `<div class="alert alert-danger">Please choose a different email address or remove the existing record before trying again.</div>`,
                            actions: [{ label: 'Back to form', href: '/' }, { label: 'View all users', href: '/display' }]
                        }));
                    }

                    console.error('Failed during Database update:', err);
                    return sendHtml(res, 500, renderPage({
                        title: 'Database error',
                        heading: 'We could not save your details',
                        message: 'A database error occurred while saving the user.',
                        body: '<div class="alert alert-danger">Please try again later.</div>',
                        actions: [{ label: 'Back to form', href: '/' }]
                    }));
                }

                console.log(`Successfully added Username: ${result.insertId}`);
                sendHtml(res, 200, renderPage({
                    title: 'User saved',
                    heading: 'Success!',
                    message: `Thanks, ${name}. Your email address has been saved.`,
                    body: '<div class="alert alert-success">Your details are now available in the user list.</div>',
                    actions: [{ label: 'Back to form', href: '/' }, { label: 'View all users', href: '/display' }]
                }));
            });
        });
    }

    else if (req.method === 'GET' && requestUrl.pathname === '/display') {
        const query = 'SELECT * FROM users ORDER BY user_name';
        db.query(query, (err, result) => {
            if (err) {
                console.error('Error During Database Read: ', err);
                return sendHtml(res, 500, renderPage({
                    title: 'Display error',
                    heading: 'We could not load the user list',
                    message: 'A database error prevented the list from being displayed.',
                    body: '<div class="alert alert-danger">Please try again later.</div>',
                    actions: [{ label: 'Back to form', href: '/' }]
                }));
            }

            const rows = result.map((user) => `
                <tr>
                    <td>${escapeHtml(user.user_name)}</td>
                    <td>${escapeHtml(user.user_mail)}</td>
                </tr>`).join('');

            const tableBody = rows.length > 0 ? rows : '<tr><td colspan="2" class="text-center text-muted">No users have been registered yet.</td></tr>';
            const displayBody = `
                <div class="card border-0 bg-light">
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-striped align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th scope="col">Name</th>
                                        <th scope="col">Email</th>
                                    </tr>
                                </thead>
                                <tbody>${tableBody}</tbody>
                            </table>
                        </div>
                    </div>
                </div>`;

            sendHtml(res, 200, renderPage({
                title: 'Registered Users',
                heading: 'Registered users',
                message: 'Here is the current list of registered users.',
                body: displayBody,
                actions: [{ label: 'Back to form', href: '/' }, { label: 'Refresh', href: '/display' }]
            }));
        });
    }

    else if (req.method === 'POST' && requestUrl.pathname === '/remove') {
        let storage = '';

        req.on('data', chunk => {
            storage += chunk.toString();
        });

        req.on('end', () => {
            const parsedData = new URLSearchParams(storage);
            const emailToDelete = parsedData.get('deleteMail') || '';
            console.log(`Attempt to Delete ${emailToDelete}`);

            const query = 'DELETE FROM users WHERE user_mail=?';

            db.query(query, [emailToDelete], (err, result) => {
                if (err) {
                    console.error('Error During user removal: ', err);
                    return sendHtml(res, 500, renderPage({
                        title: 'Delete error',
                        heading: 'We could not remove that user',
                        message: 'A database error prevented the delete request from completing.',
                        body: '<div class="alert alert-danger">Please try again later.</div>',
                        actions: [{ label: 'Back to form', href: '/' }]
                    }));
                }

                const removed = result.affectedRows > 0;
                const alertClass = removed ? 'alert-success' : 'alert-warning';
                const statusMessage = removed
                    ? `The user with email ${emailToDelete} has been removed.`
                    : `No matching user was found for ${emailToDelete}.`;

                sendHtml(res, 200, renderPage({
                    title: removed ? 'User removed' : 'No matching user',
                    heading: removed ? 'User removed' : 'No matching user',
                    message: statusMessage,
                    body: `<div class="alert ${alertClass}">${escapeHtml(statusMessage)}</div>`,
                    actions: [{ label: 'Back to form', href: '/' }, { label: 'View all users', href: '/display' }]
                }));
            });
        });
    }

    else {
        sendHtml(res, 404, renderPage({
            title: 'Page not found',
            heading: 'Page not found',
            message: 'The page you requested could not be found.',
            body: '<div class="alert alert-warning">Please return to the form and try again.</div>',
            actions: [{ label: 'Back to form', href: '/' }]
        }));
    }
});

server.listen(PORT, () => {
    console.log(`Server Listening at port ${PORT}`);
});
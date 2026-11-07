'use strict';
const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const {timingSafeEqual} = require('node:crypto');

function createHandler({token, upstream, timeoutMs = 60000}) {
    if (!/^[a-f0-9]{64}$/.test(token || '')) throw new Error('A 256-bit hexadecimal access token is required');
    const target = new URL(upstream);
    if (target.protocol !== 'http:' || target.username || target.password) throw new Error('Invalid gateway upstream');
    const prefix = '/' + token;
    return function handle(request, response) {
        const value = String(request.url || '');
        const candidate = value.slice(0, prefix.length);
        const authorized = candidate.length === prefix.length &&
            Buffer.byteLength(candidate) === Buffer.byteLength(prefix) &&
            timingSafeEqual(Buffer.from(candidate), Buffer.from(prefix)) && value[prefix.length] === '/';
        if (!authorized) {
            response.writeHead(404, {'Cache-Control': 'no-store'});
            return response.end();
        }
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
            response.writeHead(405, {Allow: 'GET, HEAD, OPTIONS'});
            return response.end();
        }
        const headers = {...request.headers, host: target.host};
        delete headers.connection;
        const proxy = http.request({hostname: target.hostname, port: target.port || 80,
            path: value.slice(prefix.length), method: request.method, headers}, incoming => {
            response.writeHead(incoming.statusCode, incoming.headers);
            incoming.on('aborted', () => response.destroy());
            incoming.on('error', () => response.destroy());
            incoming.pipe(response);
        });
        proxy.setTimeout(timeoutMs, () => proxy.destroy(new Error('Upstream timeout')));
        proxy.on('error', () => {
            if (response.headersSent) return response.destroy();
            response.writeHead(502, {'Cache-Control': 'no-store'});
            response.end();
        });
        request.on('aborted', () => proxy.destroy());
        response.on('close', () => { if (!response.writableEnded) proxy.destroy(); });
        request.pipe(proxy);
    };
}

function reloadCertificate(server, {certPath, keyPath, read = fs.readFileSync}) {
    const cert = read(certPath);
    const key = read(keyPath);
    server.setSecureContext({cert, key});
}

if (require.main === module) {
    const certPath = process.env.TLS_CERT || '/cert/fullchain.pem';
    const keyPath = process.env.TLS_KEY || '/cert/privkey.pem';
    const handler = createHandler({token: process.env.ALLOHA_ACCESS_TOKEN, upstream: 'http://resolver:8790'});
    const server = https.createServer({cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath), minVersion: 'TLSv1.2'}, handler);
    server.headersTimeout = 15000;
    server.requestTimeout = 60000;
    server.listen(18443, '0.0.0.0', () => console.log('Alloha HTTPS gateway listening on 18443'));
    setInterval(() => {
        try { reloadCertificate(server, {certPath, keyPath}); }
        catch (error) { console.error('TLS certificate reload failed; retaining previous context'); }
    }, 60 * 60 * 1000).unref();
    process.on('SIGTERM', () => {
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 10000).unref();
    });
}

module.exports = {createHandler, reloadCertificate};

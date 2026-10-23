'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = new Map([
  ['/index.html', 'text/html; charset=utf-8'],
  ['/drone.html', 'text/html; charset=utf-8'],
  ['/drone.js', 'text/javascript; charset=utf-8'],
  ['/space-renderer.js', 'text/javascript; charset=utf-8'],
  ['/drone-core.js', 'text/javascript; charset=utf-8'],
  ['/flight-controls.js', 'text/javascript; charset=utf-8'],
  ['/calibration.html', 'text/html; charset=utf-8'],
  ['/calibration.js', 'text/javascript; charset=utf-8'],
  ['/sensor-math.js', 'text/javascript; charset=utf-8']
]);
const server = http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, {Allow: 'GET, HEAD'}); res.end(); return;
  }
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  const route = pathname === '/' ? '/index.html' : pathname;
  if (!files.has(route)) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(path.join(__dirname, route.slice(1)), (error, data) => {
    if (error) { res.writeHead(500); res.end('File unavailable'); return; }
    res.writeHead(200, {'Content-Type': files.get(route), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : data);
  });
});
server.on('error', error => { console.error('Local preview failed:', error.message); process.exitCode = 1; });
server.listen(8080, '127.0.0.1', () => console.log('DrhoneGame: http://127.0.0.1:8080/ (Ctrl+C to stop)'));



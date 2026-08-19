'use strict';
/*
 * Servidor estático mínimo (sem dependências externas) para servir o
 * index.html/manifest.json/sw.js reais do projeto num localhost:PORT,
 * usado pelos testes de secção 4 que precisam de um browser real
 * (Playwright/Lighthouse) — getBoundingClientRect(), CLS e FCP só fazem
 * sentido contra uma página efetivamente renderizada, não contra um sandbox
 * `vm` sem layout (ver tests/lib/load-app.js, usado nas secções 1/2).
 *
 * Uso:
 *   const { startServer } = require('./serve-static');
 *   const server = await startServer(); // server.url, server.close()
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent(req.url.split('?')[0]);
      if (urlPath === '/') urlPath = '/index.html';
      const filePath = path.join(ROOT, urlPath);
      // Nunca serve ficheiros fora da raiz do projeto.
      if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise(res => server.close(res)),
      });
    });
  });
}

module.exports = { startServer };

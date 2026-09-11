// Part 1 — server SKELETON.
// Boots cleanly, serves /health and the placeholder UI, and answers every API
// route with 501 not_implemented. Replace this file with your implementation
// (Node stdlib http + pg only — see part1/specs/API_CONTRACT.md).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const PORT = Number(process.env.PORT || 4318);
const WEB_DIR = resolve(process.env.WEB_DIR || 'part1/web');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(payload) });
  res.end(payload);
}

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const filePath = resolve(WEB_DIR, '.' + pathname);
  if (filePath !== WEB_DIR && !filePath.startsWith(WEB_DIR + sep)) {
    return sendJson(res, 404, { error: { code: 'not_found', message: 'Not found' } });
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'content-type': MIME[extname(filePath)] || 'application/octet-stream', 'content-length': data.length });
    res.end(data);
  } catch {
    sendJson(res, 404, { error: { code: 'not_found', message: 'Not found' } });
  }
}

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;

  if (pathname === '/health') {
    // Skeleton: never touches the database.
    return sendJson(res, 200, { status: 'ok', db: 'unknown' });
  }

  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return sendJson(res, 501, {
      error: { code: 'not_implemented', message: 'Not implemented. Complete the API per part1/specs/API_CONTRACT.md.' },
    });
  }

  return serveStatic(req, res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`part1 skeleton server listening on http://127.0.0.1:${PORT} (web dir: ${WEB_DIR})`);
});

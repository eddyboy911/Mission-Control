#!/usr/bin/env node
// ============================================================
//  Mission Control — Server Entry Point  v2.0
//  Port: process.env.PORT || 10000
//  Run:  node server.js
// ============================================================

const http = require('http');
const fs   = require('fs');
const path = require('path');

const { matchRoute } = require('./server/routes/index');

// ── Config ────────────────────────────────────────────────────
const PORT      = process.env.PORT || 10000;
const CLIENT_DIR = path.join(__dirname, 'client');

// ── MIME types ─────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.woff2':'font/woff2',
};

// ── ANSI ──────────────────────────────────────────────────────
const C = { reset:'\x1b[0m', bold:'\x1b[1m', dim:'\x1b[2m', green:'\x1b[32m', cyan:'\x1b[36m', yellow:'\x1b[33m', red:'\x1b[31m', blue:'\x1b[34m' };

function log(level, ...args) {
  const colors = { info: C.cyan, ok: C.green, warn: C.yellow, err: C.red };
  const tag    = { info: '[MC]', ok: '[OK]', warn: '[!!]', err: '[ERR]' };
  console.log(`${colors[level] || ''}${tag[level] || ''}${C.reset}`, ...args);
}

function logReq(method, path, status) {
  const col = status < 300 ? C.green : status < 400 ? C.yellow : C.red;
  console.log(`${C.dim}${new Date().toLocaleTimeString()}${C.reset}  ${C.bold}${method.padEnd(7)}${C.reset}${path.padEnd(35)} ${col}${status}${C.reset}`);
}

// ── HTTP helpers ──────────────────────────────────────────────

function send(res, status, body, ct = 'application/json') {
  const payload = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
  const headers = {
    'Content-Type':                ct,
    'Content-Length':              Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods':'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type, Authorization',
    'Cache-Control':               'no-cache',
  };
  res.writeHead(status, headers);
  res.end(payload);
}

/** Attach json() helper to res, body parsing to req */
function decorateReqRes(req, res) {
  res.json = (data, status = 200) => send(res, status, data);
  res.status = (code) => ({ json: (data) => send(res, code, data) });
  req.params = {};
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 2_000_000) reject(new Error('Body too large')); });
    req.on('end',  () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

// ── Static file server ─────────────────────────────────────────

function serveStatic(res, filePath, statusCode = 200) {
  if (!fs.existsSync(filePath)) {
    send(res, 404, { error: 'Not found' });
    return 404;
  }
  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  const data = fs.readFileSync(filePath);
  res.writeHead(statusCode, {
    'Content-Type':   mime,
    'Content-Length': data.length,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control':  'no-cache',
  });
  res.end(data);
  return statusCode;
}

// ── Main server ───────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url      = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const method   = req.method.toUpperCase();

  decorateReqRes(req, res);

  let statusCode = 200;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age':       '86400',
    });
    res.end();
    logReq(method, pathname, 204);
    return;
  }

  try {
    // ── API Routes ────────────────────────────────────────────
    if (pathname.startsWith('/api/')) {
      const match = matchRoute(method, pathname);

      if (!match) {
        send(res, 404, { error: `No route: ${method} ${pathname}` });
        statusCode = 404;
      } else {
        req.params = match.params;

        // Parse body for mutation methods
        if (['POST', 'PATCH', 'PUT'].includes(method)) {
          req.body = await readBody(req);
        } else {
          req.body = {};
        }

        await match.handler(req, res);
        statusCode = res.statusCode || 200;
      }

    // ── Dashboard root ────────────────────────────────────────
    } else if (pathname === '/' || pathname === '/index' || pathname === '/dashboard') {
      statusCode = serveStatic(res, path.join(CLIENT_DIR, 'index.html'));

    // ── Other static files ────────────────────────────────────
    } else {
      const safePath = path.resolve(CLIENT_DIR, '.' + pathname);
      if (!safePath.startsWith(CLIENT_DIR)) {
        send(res, 403, { error: 'Forbidden' });
        statusCode = 403;
      } else {
        statusCode = serveStatic(res, safePath);
      }
    }
  } catch (e) {
    log('err', 'Unhandled:', e.message);
    send(res, 500, { error: 'Internal server error' });
    statusCode = 500;
  }

  logReq(method, pathname, statusCode);
});

// ── Graceful shutdown ─────────────────────────────────────────
process.on('SIGINT',  () => { log('warn', 'SIGINT — shutting down'); server.close(() => process.exit(0)); });
process.on('SIGTERM', () => { log('warn', 'SIGTERM — shutting down'); server.close(() => process.exit(0)); });

// ── Start ─────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  const base = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  console.log('');
  console.log(`${C.bold}${C.blue}  ⚡ Mission Control  v2.0${C.reset}`);
  console.log(`${C.dim}  ─────────────────────────────────────────${C.reset}`);
  console.log(`  ${C.green}●${C.reset} Dashboard     →  ${C.bold}${base}${C.reset}`);
  console.log(`  ${C.cyan}●${C.reset} Tasks API     →  ${base}/api/tasks`);
  console.log(`  ${C.cyan}●${C.reset} Calendar API  →  ${base}/api/calendar`);
  console.log(`  ${C.cyan}●${C.reset} Agent Push    →  ${base}/api/agent-update`);
  console.log(`  ${C.cyan}●${C.reset} Agent Feed    →  ${base}/api/agent-updates`);
  console.log(`  ${C.cyan}●${C.reset} Status        →  ${base}/api/status`);
  console.log(`${C.dim}  ─────────────────────────────────────────${C.reset}`);
  console.log(`  ${C.dim}Node ${process.version}  |  PID ${process.pid}  |  ${new Date().toLocaleString()}${C.reset}`);
  console.log(`  ${C.dim}Ctrl+C to stop${C.reset}`);
  console.log('');
});

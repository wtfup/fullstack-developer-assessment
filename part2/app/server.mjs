#!/usr/bin/env node
// WTF Full-Stack Assessment — Part 2: "Class Booking Ops" lab app (synthetic data only).
//
// Node stdlib + `pg`. Serves the JSON API and the dependency-free UI in ./web.
//
// Env:
//   PORT          HTTP port (default 4320)
//   DATABASE_URL  Postgres connection string (default: local lab instance)
//   LAB_SCHEMA    Postgres schema applied as search_path (default part2_lab)
//   WEB_DIR       Static root (default: ./web next to this file)
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const PORT = Number(process.env.PORT || 4320);
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://fullstack:fullstack@127.0.0.1:55440/fullstack';
const LAB_SCHEMA = process.env.LAB_SCHEMA || 'part2_lab';
const WEB_DIR = path.resolve(process.env.WEB_DIR || fileURLToPath(new URL('./web', import.meta.url)));

const SCHEMA_PATTERN = /^part2_(lab|test_[a-f0-9]{24})$/;
if (!SCHEMA_PATTERN.test(LAB_SCHEMA)) {
  console.error(`[class-ops] LAB_SCHEMA must match ${SCHEMA_PATTERN} (got: ${LAB_SCHEMA})`);
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  options: `-c search_path=${LAB_SCHEMA} -c statement_timeout=10000`,
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
});

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const CLASS_SELECT = `
  SELECT c.id, c.title, c.starts_at, c.duration_min, c.capacity, c.coach, c.cancelled_at,
         (SELECT count(*)::int FROM bookings b WHERE b.class_id = c.id AND b.status <> 'cancelled') AS booked_count
  FROM classes c`;

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  });
  res.end(payload);
}

function sendError(res, status, code, message) {
  sendJson(res, status, { error: { code, message } });
}

function parseCount(raw, { fallback, max }) {
  if (raw === null || raw === undefined) return fallback;
  if (!/^\d+$/.test(String(raw))) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > max) return null;
  return value;
}

function parseOffset(raw) {
  if (raw === null || raw === undefined) return 0;
  if (!/^\d+$/.test(String(raw))) return null;
  return Number(raw);
}

function readJsonBody(req, limit = 16 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    const fail = (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    };
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        fail(Object.assign(new Error('payload_too_large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (settled) return;
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw.trim()) {
        settled = true;
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        settled = true;
        resolve(parsed);
      } catch {
        fail(Object.assign(new Error('invalid_json'), { status: 400 }));
      }
    });
    req.on('error', (error) => fail(error));
  });
}

function mapClass(row) {
  return {
    id: row.id,
    title: row.title,
    startsAt: row.starts_at.toISOString(),
    durationMin: row.duration_min,
    capacity: row.capacity,
    coach: row.coach,
    bookedCount: row.booked_count,
    cancelled: row.cancelled_at !== null,
  };
}

function mapBooking(row) {
  return {
    id: row.id,
    classId: row.class_id,
    memberId: row.member_id,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at.toISOString(),
  };
}

async function handleApi(req, res, url) {
  const { pathname } = url;

  if (req.method === 'GET' && pathname === '/api/members') {
    const rows = (await pool.query('SELECT id, name, email FROM members ORDER BY id ASC')).rows;
    return sendJson(res, 200, { items: rows.map((row) => ({ id: row.id, name: row.name, email: row.email })) });
  }

  if (req.method === 'GET' && pathname === '/api/classes') {
    const limit = parseCount(url.searchParams.get('limit'), { fallback: 20, max: 100 });
    const offset = parseOffset(url.searchParams.get('offset'));
    if (limit === null) return sendError(res, 400, 'validation', 'limit must be an integer between 1 and 100');
    if (offset === null) return sendError(res, 400, 'validation', 'offset must be a non-negative integer');
    const total = (await pool.query('SELECT count(*)::int AS n FROM classes')).rows[0].n;
    const rows = (await pool.query(
      `${CLASS_SELECT} ORDER BY c.starts_at ASC, c.id ASC LIMIT $1 OFFSET $2`,
      [limit, offset],
    )).rows;
    return sendJson(res, 200, { items: rows.map(mapClass), total, limit, offset });
  }

  if (req.method === 'GET' && pathname === '/api/classes/day') {
    const on = url.searchParams.get('on');
    if (!on || !ISO_DATE.test(on)) {
      return sendError(res, 400, 'validation', 'on must be a YYYY-MM-DD date');
    }
    const rows = (await pool.query(
      `${CLASS_SELECT} WHERE (c.starts_at AT TIME ZONE 'UTC')::date = $1::date ORDER BY c.starts_at ASC, c.id ASC`,
      [on],
    )).rows;
    return sendJson(res, 200, { items: rows.map(mapClass), on });
  }

  if (req.method === 'GET' && pathname === '/api/classes/popular') {
    const limit = parseCount(url.searchParams.get('limit'), { fallback: 5, max: 20 });
    if (limit === null) return sendError(res, 400, 'validation', 'limit must be an integer between 1 and 20');
    const rows = (await pool.query(
      `SELECT c.id, c.title, count(b.id)::int AS bookings
       FROM classes c
       JOIN bookings b ON b.class_id = c.id
       GROUP BY c.id, c.title
       ORDER BY bookings DESC, c.id ASC
       LIMIT $1`,
      [limit],
    )).rows;
    return sendJson(res, 200, { items: rows.map((row) => ({ id: row.id, title: row.title, bookings: row.bookings })) });
  }

  if (req.method === 'POST' && pathname === '/api/bookings') {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      if (error.status === 400) return sendError(res, 400, 'validation', 'Request body must be valid JSON');
      if (error.status === 413) return sendError(res, 413, 'payload_too_large', 'Request body exceeds 16 KB');
      throw error;
    }
    const classId = Number(body.classId);
    const memberId = Number(body.memberId);
    if (!Number.isInteger(classId) || !Number.isInteger(memberId)) {
      return sendError(res, 400, 'validation', 'classId and memberId are required integers');
    }
    const idempotencyKey = req.headers['idempotency-key'] ? String(req.headers['idempotency-key']) : null;

    const cls = await pool.query('SELECT id, capacity FROM classes WHERE id = $1', [classId]);
    if (cls.rowCount === 0) return sendError(res, 404, 'not_found', `Class ${classId} does not exist`);
    const member = await pool.query('SELECT id FROM members WHERE id = $1', [memberId]);
    if (member.rowCount === 0) return sendError(res, 404, 'not_found', `Member ${memberId} does not exist`);

    const takenSeats = (await pool.query(
      `SELECT count(*)::int AS n FROM bookings WHERE class_id = $1 AND status <> 'cancelled'`,
      [classId],
    )).rows[0].n;
    if (takenSeats > cls.rows[0].capacity) {
      return sendError(res, 409, 'class_full', 'Class has no remaining seats');
    }

    const inserted = await pool.query(
      `INSERT INTO bookings (class_id, member_id, status, idempotency_key)
       VALUES ($1, $2, 'booked', $3)
       RETURNING *`,
      [classId, memberId, idempotencyKey],
    );
    return sendJson(res, 201, { booking: mapBooking(inserted.rows[0]) });
  }

  const cancelMatch = pathname.match(/^\/api\/classes\/(\d+)\/cancel$/);
  if (req.method === 'POST' && cancelMatch) {
    const classId = Number(cancelMatch[1]);
    const cls = await pool.query('SELECT id FROM classes WHERE id = $1', [classId]);
    if (cls.rowCount === 0) return sendError(res, 404, 'not_found', `Class ${classId} does not exist`);

    await pool.query('UPDATE classes SET cancelled_at = now() WHERE id = $1 AND cancelled_at IS NULL', [classId]);
    const cancelled = await pool.query(
      `UPDATE bookings SET status = 'cancelled' WHERE class_id = $1 AND status IN ('booked', 'attended')`,
      [classId],
    );
    return sendJson(res, 200, { classId, cancelledBookings: cancelled.rowCount });
  }

  return sendError(res, 404, 'not_found', `No route for ${req.method} ${pathname}`);
}

async function serveStatic(res, pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const resolved = path.resolve(WEB_DIR, relative);
  if (resolved !== WEB_DIR && !resolved.startsWith(WEB_DIR + path.sep)) {
    return sendError(res, 404, 'not_found', 'Not found');
  }
  try {
    const data = await readFile(resolved);
    const type = MIME_TYPES[path.extname(resolved).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'content-length': data.length, 'cache-control': 'no-store' });
    res.end(data);
  } catch {
    sendError(res, 404, 'not_found', 'Not found');
  }
}

const server = http.createServer((req, res) => {
  void (async () => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      if (req.method === 'GET' && url.pathname === '/health') {
        try {
          await pool.query('SELECT 1');
          return sendJson(res, 200, { status: 'ok', db: 'up' });
        } catch (error) {
          console.error('[class-ops] health check failed:', error.message);
          return sendJson(res, 503, { status: 'degraded', db: 'down' });
        }
      }
      if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
      if (req.method === 'GET') return await serveStatic(res, url.pathname);
      return sendError(res, 405, 'method_not_allowed', `${req.method} is not supported here`);
    } catch (error) {
      console.error('[class-ops] unhandled error:', error);
      if (!res.headersSent) sendError(res, 500, 'internal', 'Unexpected server error');
      else res.end();
    }
  })();
});

server.listen(PORT, () => {
  console.log(`[class-ops] listening on http://127.0.0.1:${PORT} (schema=${LAB_SCHEMA}, web=${WEB_DIR})`);
});

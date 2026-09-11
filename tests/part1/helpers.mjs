// Part 1 — isolation helpers for the canonical acceptance suites.
//
// Every test gets:
//   - a throwaway schema  part1_test_<24 hex chars>  (dropped on close)
//   - the canonical seed applied from part1/seed/{schema,seed}.sql
//   - a fresh candidate server process on a random port, bound to that schema
//
// Overrides: PART1_SERVER (server entrypoint), PART1_QUERIES, PART1_MIGRATION.
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer as createNetServer } from 'node:net';
import { resolve } from 'node:path';
import pg from 'pg';

const SCHEMA_RE = /^part1_(lab|test_[a-f0-9]{24})$/;
const SEED_SCHEMA_URL = new URL('../../part1/seed/schema.sql', import.meta.url);
const SEED_DATA_URL = new URL('../../part1/seed/seed.sql', import.meta.url);

export const SERVER_ENTRY = process.env.PART1_SERVER || 'part1/server/server.mjs';
export const QUERIES_FILE = process.env.PART1_QUERIES || 'part1/sql/queries.sql';
export const MIGRATION_FILE = process.env.PART1_MIGRATION || 'part1/sql/migration.sql';

export function databaseUrl() {
  return process.env.DATABASE_URL || 'postgresql://fullstack:fullstack@127.0.0.1:55440/fullstack';
}

export function newTestSchema() {
  return `part1_test_${randomBytes(12).toString('hex')}`;
}

export function assertAllowedSchema(schema) {
  if (!SCHEMA_RE.test(schema)) throw new Error(`Lab schema required (got: ${schema})`);
  return schema;
}

export function createLabPool(schema) {
  assertAllowedSchema(schema);
  return new pg.Pool({
    connectionString: databaseUrl(),
    options: `-c search_path=${schema} -c statement_timeout=10000 -c lock_timeout=5000`,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 5000,
  });
}

export async function readSeedSql() {
  const [schemaSql, seedSql] = await Promise.all([
    readFile(SEED_SCHEMA_URL, 'utf8'),
    readFile(SEED_DATA_URL, 'utf8'),
  ]);
  return { schemaSql, seedSql };
}

// Fabricate a fresh schema with the canonical fixture applied.
export async function openLab() {
  const schema = newTestSchema();
  const pool = createLabPool(schema);
  try {
    const { schemaSql, seedSql } = await readSeedSql();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE; CREATE SCHEMA ${schema}; SET LOCAL search_path TO ${schema}`);
      await client.query(schemaSql);
      await client.query(seedSql);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    await pool.end().catch(() => {});
    throw error;
  }
  return {
    schema,
    pool,
    async close() {
      try {
        await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      } finally {
        await pool.end().catch(() => {});
      }
    },
  };
}

export function freePort() {
  return new Promise((resolvePort, reject) => {
    const socket = createNetServer();
    socket.unref();
    socket.on('error', reject);
    socket.listen(0, '127.0.0.1', () => {
      const { port } = socket.address();
      socket.close(() => resolvePort(port));
    });
  });
}

async function waitForHealth(base, childState) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (childState.exited) {
      throw new Error(`server exited before becoming healthy (code ${childState.code})\n${childState.logs()}`);
    }
    try {
      const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`server did not become healthy in time\n${childState.logs()}`);
}

// Spawn the candidate server against an isolated schema on a random port.
export async function startPart1Server({ schema, extraEnv = {} } = {}) {
  assertAllowedSchema(schema);
  const entry = resolve(process.cwd(), SERVER_ENTRY);
  const port = await freePort();
  const child = spawn(process.execPath, [entry], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: databaseUrl(),
      LAB_SCHEMA: schema,
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const childState = { exited: false, code: null, stdout: '', stderr: '' };
  child.stdout.on('data', (chunk) => { childState.stdout = (childState.stdout + chunk).slice(-65536); });
  child.stderr.on('data', (chunk) => { childState.stderr = (childState.stderr + chunk).slice(-65536); });
  child.on('exit', (code) => { childState.exited = true; childState.code = code; });
  childState.logs = () => `--- server stdout ---\n${childState.stdout}\n--- server stderr ---\n${childState.stderr}`;

  const base = `http://127.0.0.1:${port}`;
  try {
    await waitForHealth(base, childState);
  } catch (error) {
    child.kill('SIGKILL');
    throw error;
  }

  return {
    base,
    port,
    child,
    logs: childState.logs,
    async stop() {
      if (childState.exited) return;
      child.kill('SIGTERM');
      const exited = await Promise.race([
        new Promise((r) => child.once('exit', () => r(true))),
        new Promise((r) => setTimeout(() => r(false), 3000)),
      ]);
      if (!exited) child.kill('SIGKILL');
    },
  };
}

// Fresh schema + fresh server for one test, torn down afterwards.
export async function withPart1Server(run) {
  const lab = await openLab();
  let server = null;
  try {
    server = await startPart1Server({ schema: lab.schema });
    await run({ schema: lab.schema, pool: lab.pool, base: server.base, server });
  } finally {
    if (server) await server.stop();
    await lab.close();
  }
}

// Thin fetch wrapper: always returns { status, body } (body: parsed JSON or null).
export async function api(base, path, options = {}) {
  const { method, body, rawBody, contentType, idempotencyKey, headers = {} } = options;
  const finalHeaders = { ...headers };
  let payload;
  if (rawBody !== undefined) {
    payload = rawBody;
    finalHeaders['content-type'] = contentType ?? 'application/json';
  } else if (body !== undefined) {
    payload = JSON.stringify(body);
    finalHeaders['content-type'] = contentType ?? 'application/json';
  }
  if (idempotencyKey) finalHeaders['idempotency-key'] = idempotencyKey;
  const response = await fetch(base + path, {
    method: method ?? (payload !== undefined ? 'POST' : 'GET'),
    headers: finalHeaders,
    body: payload,
  });
  let parsed = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }
  return { status: response.status, body: parsed };
}

// --- SQL task files -------------------------------------------------------

export async function readQueriesFile() {
  return readFile(resolve(process.cwd(), QUERIES_FILE), 'utf8');
}

export async function readMigrationFile() {
  return readFile(resolve(process.cwd(), MIGRATION_FILE), 'utf8');
}

// Split a queries file into sections keyed by marker: "-- === QUERY n ==="
export function splitQuerySections(text) {
  const sections = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const match = /^-- === QUERY (\d+) ===$/.exec(line.trim());
    if (match) {
      current = { n: Number(match[1]), lines: [] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return sections.map((section) => ({ n: section.n, sql: section.lines.join('\n').trim() }));
}

// Run one query segment. Returns { rows } or { rows: [], error } — never throws,
// so RED failures surface as genuine assertion failures.
export async function runQuerySegment(pool, sql) {
  const stripped = sql.replace(/--[^\n]*/g, '').trim();
  if (!stripped) return { rows: [], error: 'query is empty' };
  try {
    const result = await pool.query(sql);
    return { rows: result.rows };
  } catch (error) {
    return { rows: [], error: error.message };
  }
}

// --- seed fixture parsing (for independent JS expectations) ---------------

const INSERT_RE = /^\s*INSERT INTO\s+(\w+)\s*\(([^)]*)\)\s*VALUES\s*\((.*)\);\s*$/;

function splitTopLevel(text) {
  const parts = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuote) {
      if (ch === "'" && text[i + 1] === "'") { current += "''"; i += 1; continue; }
      if (ch === "'") { inQuote = false; current += ch; continue; }
      current += ch;
      continue;
    }
    if (ch === "'") { inQuote = true; current += ch; continue; }
    if (ch === ',') { parts.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  parts.push(current.trim());
  return parts;
}

function parseLiteral(token) {
  if (token === 'NULL') return null;
  if (token === 'true') return true;
  if (token === 'false') return false;
  if (/^-?\d+$/.test(token)) return Number(token);
  if (/^'(.*)'$/s.test(token)) return token.slice(1, -1).replace(/''/g, "'");
  return token;
}

// Parse seed.sql into { tableName: [rowObjects] } — strict one-INSERT-per-line format.
export function parseSeedSql(text) {
  const tables = {};
  for (const line of text.split(/\r?\n/)) {
    const match = INSERT_RE.exec(line);
    if (!match) continue;
    const [, table, columnsText, valuesText] = match;
    const columns = columnsText.split(',').map((c) => c.trim());
    const values = splitTopLevel(valuesText).map(parseLiteral);
    if (columns.length !== values.length) throw new Error(`seed parse mismatch in line: ${line}`);
    const row = {};
    columns.forEach((column, index) => { row[column] = values[index]; });
    (tables[table] ??= []).push(row);
  }
  return tables;
}

export async function loadSeedFixture() {
  const { seedSql } = await readSeedSql();
  return parseSeedSql(seedSql);
}

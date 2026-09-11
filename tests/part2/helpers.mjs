// Part 2 test helpers — fresh per-suite schema isolation + spawned app process.
//
// Each suite gets its own `part2_test_<24hex>` schema (canonical seed applied),
// and its own app process bound to a random port, so suites never share state.
//
// Overrides:
//   PART2_SERVER  absolute or repo-relative path to the server to launch
//                 (default: part2/app/server.mjs)
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

export const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

const SCHEMA_PATTERN = /^part2_test_[a-f0-9]{24}$/;
// Accepts the lab database on the docker network (`db`), loopback host labs, and
// the host-published port. Anything else is rejected before any connection is made.
const URL_PATTERN = /^postgresql:\/\/fullstack:fullstack@(db|127\.0\.0\.1|localhost)(:5432|:55440)?\/fullstack$/;

export function labDatabaseUrl() {
  const value = process.env.DATABASE_URL || 'postgresql://fullstack:fullstack@db/fullstack';
  if (!URL_PATTERN.test(value)) {
    throw new Error(`lab database URL required (got: ${value.replace(/:[^:@/]*@/, ':***@')})`);
  }
  return value;
}

export function assertLabSchema(schema) {
  if (!SCHEMA_PATTERN.test(schema)) throw new Error(`lab schema name required (got: ${schema})`);
  return schema;
}

export async function openPart2Lab() {
  const schema = `part2_test_${randomBytes(12).toString('hex')}`;
  assertLabSchema(schema);
  const pool = new pg.Pool({
    connectionString: labDatabaseUrl(),
    options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000`,
    max: 8,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 5000,
  });
  const schemaSql = await readFile(new URL('../../part2/seed/schema.sql', import.meta.url), 'utf8');
  const seedSql = await readFile(new URL('../../part2/seed/seed.sql', import.meta.url), 'utf8');

  const reset = async () => {
    const client = await pool.connect();
    try {
      const identity = (await client.query('SELECT current_database() db, current_user usr')).rows[0];
      if (identity.db !== 'fullstack' || identity.usr !== 'fullstack') {
        throw new Error('Lab database identity mismatch');
      }
      await client.query('BEGIN');
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE; CREATE SCHEMA ${schema}; SET LOCAL search_path TO ${schema}`);
      await client.query(schemaSql);
      await client.query(seedSql);
      await client.query('COMMIT');
      return { schema };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  };

  await reset();

  return {
    pool,
    schema,
    reset,
    sql: async (text, params = []) => (await pool.query(text, params)).rows,
    async close() {
      try {
        await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      } finally {
        await pool.end();
      }
    },
  };
}

async function freePort() {
  return await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

export async function startApp(lab, {
  serverScript = process.env.PART2_SERVER || 'part2/app/server.mjs',
  port,
  env = {},
} = {}) {
  const script = path.isAbsolute(serverScript) ? serverScript : path.join(REPO_ROOT, serverScript);
  const chosenPort = port || (await freePort());
  const child = spawn(process.execPath, [script], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      PORT: String(chosenPort),
      LAB_SCHEMA: lab.schema,
      DATABASE_URL: labDatabaseUrl(),
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let logs = '';
  const collect = (chunk) => {
    logs += chunk.toString();
    if (logs.length > 20000) logs = logs.slice(-20000);
  };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);

  const baseUrl = `http://127.0.0.1:${chosenPort}`;
  const stop = async () => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM');
      await Promise.race([
        new Promise((resolve) => child.once('exit', resolve)),
        delay(2000).then(() => child.kill('SIGKILL')),
      ]);
    }
  };

  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`app exited early (code ${child.exitCode}):\n${logs}`);
    }
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) {
        return { baseUrl, port: chosenPort, script, child, logs: () => logs, stop };
      }
    } catch {
      // not up yet
    }
    await delay(150);
  }
  await stop();
  throw new Error(`app did not become healthy at ${baseUrl} within 15s:\n${logs}`);
}

export async function request(baseUrl, pathname, { method = 'GET', body, rawBody, headers = {} } = {}) {
  const init = { method, headers: { ...headers } };
  if (rawBody !== undefined) {
    init.body = rawBody;
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    if (!('content-type' in init.headers) && !('Content-Type' in init.headers)) {
      init.headers['content-type'] = 'application/json';
    }
  }
  const res = await fetch(`${baseUrl}${pathname}`, init);
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  return { status: res.status, body: parsed, text, headers: res.headers };
}

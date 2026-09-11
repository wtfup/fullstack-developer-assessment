import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { assertDatabaseUrl, assertSchema } from './db-guard.mjs';

async function resetPart(part) {
  const schema = `${part}_lab`;
  assertSchema(schema);
  const pool = new pg.Pool({
    connectionString: assertDatabaseUrl(),
    options: `-c search_path=${schema} -c statement_timeout=10000`,
    max: 4,
    connectionTimeoutMillis: 5000,
  });
  const client = await pool.connect();
  try {
    const identity = (await client.query('SELECT current_database() db, current_user usr')).rows[0];
    if (identity.db !== 'fullstack' || identity.usr !== 'fullstack') throw new Error('Lab database identity mismatch');
    await client.query('BEGIN');
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE; CREATE SCHEMA ${schema}; SET LOCAL search_path TO ${schema}`);
    await client.query(await readFile(new URL(`../${part}/seed/schema.sql`, import.meta.url), 'utf8'));
    const seed = await readFile(new URL(`../${part}/seed/seed.sql`, import.meta.url), 'utf8').catch(() => null);
    if (seed) await client.query(seed);
    await client.query('COMMIT');
    console.log(JSON.stringify({ schema, part, ok: true }));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

const target = process.argv[2] || 'all';
const parts = target === 'all' ? ['part1', 'part2'] : [target];
for (const part of parts) {
  if (!['part1', 'part2'].includes(part)) {
    console.error('usage: db-reset.mjs [part1|part2|all]');
    process.exit(2);
  }
  await resetPart(part);
}

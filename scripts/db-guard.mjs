export const DEFAULT_DATABASE_URL = 'postgresql://fullstack:fullstack@127.0.0.1:55440/fullstack';

export const ALLOWED_SCHEMA = /^(part1|part2)_(lab|test_[a-f0-9]{24})$/;

export function assertDatabaseUrl(value = process.env.DATABASE_URL || DEFAULT_DATABASE_URL) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Lab database URL required'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)
      || !['127.0.0.1', 'localhost', 'db'].includes(url.hostname)
      || !['', '55440'].includes(url.port)
      || url.pathname !== '/fullstack'
      || url.username !== 'fullstack'
      || url.password !== 'fullstack'
      || url.search || url.hash) {
    throw new Error('Lab database only: fullstack/fullstack on fullstack db, loopback or local service, no URL options');
  }
  return value;
}

export function assertSchema(schema) {
  if (!ALLOWED_SCHEMA.test(schema)) throw new Error(`Lab schema required (got: ${schema})`);
  return schema;
}

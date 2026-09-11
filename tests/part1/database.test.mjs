// Part 1 — canonical SQL / migration acceptance suite.
//
// Expected results are computed in plain JS from the parsed seed fixture
// (never by re-running equivalent SQL), then compared EXACTLY.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  openLab,
  readQueriesFile,
  readMigrationFile,
  splitQuerySections,
  runQuerySegment,
  loadSeedFixture,
} from './helpers.mjs';

const seed = await loadSeedFixture();
const QUERIES = await readQueriesFile();
const SECTIONS = splitQuerySections(QUERIES);

const col = (value) => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    // node-postgres returns date columns as local-midnight Date objects;
    // normalize to 'YYYY-MM-DD' using local components (TZ-safe).
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value);
};
const project = (row, cols) => Object.fromEntries(cols.map((c) => [c, col(row[c])]));

async function withSeededLab(run) {
  const lab = await openLab();
  try {
    await run(lab);
  } finally {
    await lab.close();
  }
}

async function runSection(pool, n, columns) {
  assert.equal(SECTIONS.length, 7, 'queries.sql must contain exactly 7 "-- === QUERY n ===" markers');
  const section = SECTIONS.find((s) => s.n === n);
  assert.ok(section, `marker "-- === QUERY ${n} ===" missing`);
  const { rows, error } = await runQuerySegment(pool, section.sql);
  assert.equal(error, undefined, `Query ${n} failed: ${error}`);
  for (const row of rows) {
    assert.deepEqual(Object.keys(row).sort(), [...columns].sort(), `Query ${n} returned unexpected columns`);
  }
  return rows;
}

async function applyMigration(pool) {
  await pool.query(await readMigrationFile());
}

// --- expectations, computed from the parsed seed fixture -------------------

const paymentsByMonth = (() => {
  const buckets = new Map();
  for (const p of seed.payments) {
    const month = p.received_on.slice(0, 7);
    const bucket = buckets.get(month) ?? { month, payments_count: 0, total_paise: 0 };
    bucket.payments_count += 1;
    bucket.total_paise += p.amount_paise;
    buckets.set(month, bucket);
  }
  return [...buckets.values()]
    .sort((a, b) => (a.month < b.month ? -1 : 1))
    .map((bucket) => ({ month: bucket.month, payments_count: String(bucket.payments_count), total_paise: String(bucket.total_paise) }));
})();

const outstandingPerClient = (() => {
  const rows = seed.clients.map((client) => {
    const sent = seed.invoices.filter((invoice) => invoice.client_id === client.id && invoice.status === 'sent');
    return {
      client_id: String(client.id),
      name: client.name,
      outstanding_paise: String(sent.reduce((sum, invoice) => sum + invoice.total_paise, 0)),
      sent_invoices: String(sent.length),
    };
  });
  return rows.sort((a, b) => (Number(b.outstanding_paise) - Number(a.outstanding_paise)) || (a.name < b.name ? -1 : 1));
})();

const runningTotals = (() => {
  const rows = [];
  for (const client of seed.clients) {
    const invoices = seed.invoices
      .filter((invoice) => invoice.client_id === client.id)
      .sort((a, b) => (a.issued_on < b.issued_on ? -1 : a.issued_on > b.issued_on ? 1 : a.id - b.id));
    let running = 0;
    for (const invoice of invoices) {
      running += invoice.total_paise;
      rows.push({
        client_id: String(client.id),
        number: invoice.number,
        issued_on: invoice.issued_on,
        total_paise: String(invoice.total_paise),
        running_total_paise: String(running),
      });
    }
  }
  return rows;
})();

const latestPaymentPerClient = (() => {
  const rows = [];
  for (const client of seed.clients) {
    const payments = seed.payments.filter((payment) => payment.client_id === client.id);
    if (payments.length === 0) continue;
    const latest = payments.reduce((best, payment) => {
      if (payment.received_on > best.received_on) return payment;
      if (payment.received_on === best.received_on && payment.id > best.id) return payment;
      return best;
    });
    rows.push({
      client_id: String(client.id),
      received_on: latest.received_on,
      amount_paise: String(latest.amount_paise),
      reference: latest.reference,
    });
  }
  return rows;
})();

const duplicatePaymentCandidates = (() => {
  const groups = new Map();
  for (const payment of seed.payments) {
    const key = `${payment.client_id}|${payment.amount_paise}|${payment.received_on}|${payment.reference.toLowerCase()}`;
    const group = groups.get(key) ?? {
      client_id: String(payment.client_id),
      amount_paise: String(payment.amount_paise),
      received_on: payment.received_on,
      reference: payment.reference.toLowerCase(),
      n: 0,
    };
    group.n += 1;
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter((group) => group.n > 1)
    .map((group) => ({ ...group, n: String(group.n) }))
    .sort((a, b) => (Number(a.client_id) - Number(b.client_id)) || (a.received_on < b.received_on ? -1 : 1));
})();

const billableUtilization = (() => {
  const entries = seed.time_entries;
  const rows = seed.projects
    .filter((project) => entries.some((entry) => entry.project_id === project.id))
    .map((project) => {
      const own = entries.filter((entry) => entry.project_id === project.id);
      const total = own.reduce((sum, entry) => sum + entry.minutes, 0);
      const billable = own.filter((entry) => entry.billable).reduce((sum, entry) => sum + entry.minutes, 0);
      return {
        project_id: String(project.id),
        name: project.name,
        total_minutes: String(total),
        billable_minutes: String(billable),
        billable_pct: Math.round((billable * 1000) / total) / 10,
      };
    });
  return rows.sort((a, b) => (b.billable_pct - a.billable_pct) || (Number(a.project_id) - Number(b.project_id)));
})();

const billingShortfall = (() => {
  const rows = [];
  for (const client of seed.clients) {
    const outstanding = seed.invoices
      .filter((invoice) => invoice.client_id === client.id && invoice.status === 'sent')
      .reduce((sum, invoice) => sum + invoice.total_paise, 0);
    const invoiced = seed.invoices
      .filter((invoice) => invoice.client_id === client.id && invoice.status !== 'void')
      .reduce((sum, invoice) => sum + invoice.total_paise, 0);
    const received = seed.payments
      .filter((payment) => payment.client_id === client.id)
      .reduce((sum, payment) => sum + payment.amount_paise, 0);
    const shortfall = invoiced - received;
    if (outstanding > 0 && shortfall > 0) {
      rows.push({
        client_id: String(client.id),
        name: client.name,
        invoiced_paise: String(invoiced),
        received_paise: String(received),
        shortfall_paise: String(shortfall),
      });
    }
  }
  return rows.sort((a, b) => (Number(b.shortfall_paise) - Number(a.shortfall_paise)) || (Number(a.client_id) - Number(b.client_id)));
})();

const expectedPaidAt = (() => {
  const map = new Map(seed.invoices.map((invoice) => [invoice.id, null]));
  for (const payment of seed.payments) {
    if (payment.invoice_id === null) continue;
    const current = map.get(payment.invoice_id) ?? null;
    if (current === null || payment.received_on > current) map.set(payment.invoice_id, payment.received_on);
  }
  return map;
})();

// --- Query tests ----------------------------------------------------------

test('Query 1 — monthly received payments', () =>
  withSeededLab(async ({ pool }) => {
    const rows = await runSection(pool, 1, ['month', 'payments_count', 'total_paise']);
    assert.deepEqual(rows.map((row) => project(row, ['month', 'payments_count', 'total_paise'])), paymentsByMonth);
  }));

test('Query 2 — outstanding per client incl. clients without sent invoices', () =>
  withSeededLab(async ({ pool }) => {
    const rows = await runSection(pool, 2, ['client_id', 'name', 'outstanding_paise', 'sent_invoices']);
    assert.deepEqual(rows.map((row) => project(row, ['client_id', 'name', 'outstanding_paise', 'sent_invoices'])), outstandingPerClient);
  }));

test('Query 3 — running invoice totals per client', () =>
  withSeededLab(async ({ pool }) => {
    const rows = await runSection(pool, 3, ['client_id', 'number', 'issued_on', 'total_paise', 'running_total_paise']);
    assert.deepEqual(rows.map((row) => project(row, ['client_id', 'number', 'issued_on', 'total_paise', 'running_total_paise'])), runningTotals);
  }));

test('Query 4 — latest payment per client with highest-id tie-break', () =>
  withSeededLab(async ({ pool }) => {
    const rows = await runSection(pool, 4, ['client_id', 'received_on', 'amount_paise', 'reference']);
    assert.deepEqual(rows.map((row) => project(row, ['client_id', 'received_on', 'amount_paise', 'reference'])), latestPaymentPerClient);
  }));

test('Query 5 — duplicate payment candidates incl. case-insensitive references', () =>
  withSeededLab(async ({ pool }) => {
    const rows = await runSection(pool, 5, ['client_id', 'amount_paise', 'received_on', 'reference', 'n']);
    assert.deepEqual(rows.map((row) => project(row, ['client_id', 'amount_paise', 'received_on', 'reference', 'n'])), duplicatePaymentCandidates);
  }));

test('Query 6 — billable utilization per project, zero-entry projects excluded', () =>
  withSeededLab(async ({ pool }) => {
    const rows = await runSection(pool, 6, ['project_id', 'name', 'total_minutes', 'billable_minutes', 'billable_pct']);
    const normalized = rows.map((row) => ({
      project_id: col(row.project_id),
      name: col(row.name),
      total_minutes: col(row.total_minutes),
      billable_minutes: col(row.billable_minutes),
      billable_pct: row.billable_pct === null || row.billable_pct === undefined ? null : Number(row.billable_pct),
    }));
    assert.deepEqual(normalized, billableUtilization);
  }));

test('Query 7 — billing shortfall per client with positive shortfall only', () =>
  withSeededLab(async ({ pool }) => {
    const rows = await runSection(pool, 7, ['client_id', 'name', 'invoiced_paise', 'received_paise', 'shortfall_paise']);
    assert.deepEqual(rows.map((row) => project(row, ['client_id', 'name', 'invoiced_paise', 'received_paise', 'shortfall_paise'])), billingShortfall);
  }));

// --- Migration tests ------------------------------------------------------

test('migration adds invoices.paid_at as a nullable date column', () =>
  withSeededLab(async ({ pool }) => {
    await applyMigration(pool);
    const column = await pool.query(
      `SELECT data_type, is_nullable FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'invoices' AND column_name = 'paid_at'`,
    );
    assert.equal(column.rows.length, 1, 'invoices.paid_at is missing');
    assert.equal(column.rows[0].data_type, 'date');
    assert.equal(column.rows[0].is_nullable, 'YES');
  }));

test('migration backfills paid_at with the latest linked payment date', () =>
  withSeededLab(async ({ pool }) => {
    await applyMigration(pool);
    const { rows, error } = await runQuerySegment(pool, 'SELECT id, paid_at::text AS paid_at FROM invoices ORDER BY id');
    assert.equal(error, undefined, `paid_at is not queryable: ${error}`);
    assert.deepEqual(rows, seed.invoices.map((invoice) => ({ id: invoice.id, paid_at: expectedPaidAt.get(invoice.id) })));
    const nonNull = rows.filter((row) => row.paid_at !== null).length;
    assert.equal(nonNull, [...expectedPaidAt.values()].filter((value) => value !== null).length);
  }));

test('migration creates idx_payments_received_on on payments(received_on)', () =>
  withSeededLab(async ({ pool }) => {
    await applyMigration(pool);
    const index = await pool.query(
      `SELECT indexname, tablename, indexdef FROM pg_indexes
       WHERE schemaname = current_schema() AND indexname = 'idx_payments_received_on'`,
    );
    assert.equal(index.rows.length, 1, 'index idx_payments_received_on is missing');
    assert.equal(index.rows[0].tablename, 'payments');
    assert.match(index.rows[0].indexdef, /\(received_on\)/);
  }));

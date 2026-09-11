// Part 1 — canonical API acceptance suite.
// Fresh isolated schema + fresh server process per test (see helpers.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { api, withPart1Server } from './helpers.mjs';

const ids = (body) => body.items.map((item) => item.id);
const numbers = (body) => body.items.map((item) => item.number);
const paths = (body) => (body?.error?.fields ?? []).map((field) => field.path);

const invoiceBody = (overrides = {}) => ({
  clientId: 1,
  number: 'INV-2001',
  issuedOn: '2026-09-01',
  dueOn: '2026-09-15',
  totalPaise: 125000,
  ...overrides,
});

const paymentBody = (overrides = {}) => ({
  clientId: 1,
  amountPaise: 11111,
  receivedOn: '2026-09-02',
  method: 'bank',
  reference: 'TEST-PAY-001',
  ...overrides,
});

test('health reports ok with a live database and serves the UI at /', () =>
  withPart1Server(async ({ base }) => {
    const health = await api(base, '/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.status, 'ok');
    assert.equal(health.body.db, 'up');
    const page = await fetch(base + '/');
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type') ?? '', /text\/html/);
  }));

test('GET /api/clients returns every client ordered by name', () =>
  withPart1Server(async ({ base }) => {
    const res = await api(base, '/api/clients');
    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 6);
    assert.deepEqual(ids(res.body), [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(
      res.body.items.map((client) => client.name),
      ['Acme Power Yoga', 'Blue Harbor Cafe', 'Crestline Legal', 'Drift Analytics', 'Evergreen Foods', 'Fernwood Studio'],
    );
    assert.equal(res.body.items[0].email, 'acme@example.test');
    assert.equal(typeof res.body.items[0].createdAt, 'string');
  }));

test('GET /api/invoices returns the full fixture ordered by issuedOn desc, id desc', () =>
  withPart1Server(async ({ base, pool }) => {
    const res = await api(base, '/api/invoices');
    assert.equal(res.status, 200);
    assert.deepEqual(ids(res.body), [12, 7, 11, 9, 6, 4, 10, 3, 2, 8, 1, 5]);
    assert.equal(res.body.nextCursor, null);
    const first = res.body.items[0];
    assert.deepEqual(
      { number: first.number, clientId: first.clientId, clientName: first.clientName, issuedOn: first.issuedOn, dueOn: first.dueOn, status: first.status, totalPaise: first.totalPaise },
      { number: 'INV-1012', clientId: 6, clientName: 'Fernwood Studio', issuedOn: '2026-08-12', dueOn: '2026-09-12', status: 'void', totalPaise: 25000 },
    );
    const count = await pool.query('SELECT count(*)::int AS n FROM invoices');
    assert.equal(count.rows[0].n, 12);
  }));

test('cursor pagination (limit 5) walks every invoice exactly once', () =>
  withPart1Server(async ({ base }) => {
    const seen = [];
    let cursor = null;
    const expectedPages = [[12, 7, 11, 9, 6], [4, 10, 3, 2, 8], [1, 5]];
    for (let page = 0; page < expectedPages.length; page += 1) {
      const query = `/api/invoices?limit=5${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const res = await api(base, query);
      assert.equal(res.status, 200);
      assert.deepEqual(ids(res.body), expectedPages[page]);
      if (page < expectedPages.length - 1) {
        assert.match(res.body.nextCursor, /^[A-Za-z0-9_-]+$/);
        cursor = res.body.nextCursor;
      } else {
        assert.equal(res.body.nextCursor, null);
      }
      seen.push(...ids(res.body));
    }
    assert.equal(new Set(seen).size, 12);
    assert.deepEqual(seen, [12, 7, 11, 9, 6, 4, 10, 3, 2, 8, 1, 5]);
  }));

test('cursor pagination stays stable across equal issuedOn dates (limit 2)', () =>
  withPart1Server(async ({ base }) => {
    const pages = [[12, 7], [11, 9], [6, 4], [10, 3], [2, 8], [1, 5]];
    const seen = [];
    let cursor = null;
    for (const expected of pages) {
      const query = `/api/invoices?limit=2${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const res = await api(base, query);
      assert.equal(res.status, 200);
      assert.deepEqual(ids(res.body), expected);
      cursor = res.body.nextCursor;
      seen.push(...ids(res.body));
    }
    assert.equal(cursor, null);
    assert.equal(new Set(seen).size, 12);
    assert.deepEqual(seen, [12, 7, 11, 9, 6, 4, 10, 3, 2, 8, 1, 5]);
  }));

test('status filter, case-insensitive search and combinations', () =>
  withPart1Server(async ({ base }) => {
    const sent = await api(base, '/api/invoices?status=sent');
    assert.equal(sent.status, 200);
    assert.deepEqual(ids(sent.body), [9, 6, 3, 1]);
    assert.ok(sent.body.items.every((item) => item.status === 'sent'));

    const crestline = await api(base, '/api/invoices?q=CRESTLINE');
    assert.equal(crestline.status, 200);
    assert.deepEqual(numbers(crestline.body), ['INV-1006', 'INV-1005']);

    const combined = await api(base, '/api/invoices?q=inV-100&status=sent');
    assert.deepEqual(ids(combined.body), [9, 6, 3, 1]);

    const single = await api(base, '/api/invoices?q=1006');
    assert.deepEqual(ids(single.body), [6]);

    const blueDraft = await api(base, '/api/invoices?q=blue&status=draft');
    assert.deepEqual(ids(blueDraft.body), [4]);

    const none = await api(base, '/api/invoices?q=zzz-nothing');
    assert.equal(none.status, 200);
    assert.deepEqual(none.body.items, []);
    assert.equal(none.body.nextCursor, null);
  }));

test('invalid list parameters are rejected with validation errors', () =>
  withPart1Server(async ({ base, pool }) => {
    for (const query of ['/api/invoices?limit=0', '/api/invoices?limit=101', '/api/invoices?limit=abc', '/api/invoices?limit=1.5', '/api/invoices?status=weird', '/api/invoices?cursor=not-a-cursor', '/api/invoices?cursor=aGVsbG8']) {
      const res = await api(base, query);
      assert.equal(res.status, 400, query);
      assert.equal(res.body.error.code, 'validation', query);
      assert.equal(typeof res.body.error.message, 'string', query);
    }
    const max = await api(base, '/api/invoices?limit=100');
    assert.equal(max.status, 200);
    assert.equal(max.body.items.length, 12);
    const count = await pool.query('SELECT count(*)::int AS n FROM invoices');
    assert.equal(count.rows[0].n, 12);
  }));

test('POST /api/invoices creates a draft invoice and persists it', () =>
  withPart1Server(async ({ base, pool }) => {
    const res = await api(base, '/api/invoices', { body: invoiceBody() });
    assert.equal(res.status, 201);
    assert.equal(res.body.id, 13);
    assert.equal(res.body.number, 'INV-2001');
    assert.equal(res.body.clientId, 1);
    assert.equal(res.body.clientName, 'Acme Power Yoga');
    assert.equal(res.body.status, 'draft');
    assert.equal(res.body.totalPaise, 125000);
    assert.equal(res.body.issuedOn, '2026-09-01');
    assert.equal(res.body.dueOn, '2026-09-15');

    const list = await api(base, '/api/invoices');
    assert.equal(list.body.items.length, 13);
    assert.equal(list.body.items[0].id, 13);

    const row = await pool.query('SELECT number, client_id, status, total_paise, issued_on::text AS issued_on, due_on::text AS due_on FROM invoices WHERE id = 13');
    assert.equal(row.rows.length, 1);
    assert.deepEqual(row.rows[0], { number: 'INV-2001', client_id: 1, status: 'draft', total_paise: 125000, issued_on: '2026-09-01', due_on: '2026-09-15' });
  }));

test('POST /api/invoices rejects unknown clients, duplicates and invalid fields', () =>
  withPart1Server(async ({ base, pool }) => {
    const unknownClient = await api(base, '/api/invoices', { body: invoiceBody({ clientId: 9999 }) });
    assert.equal(unknownClient.status, 404);
    assert.equal(unknownClient.body.error.code, 'not_found');

    const duplicate = await api(base, '/api/invoices', { body: invoiceBody({ number: 'INV-1001' }) });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.code, 'conflict');

    const badDate = await api(base, '/api/invoices', { body: invoiceBody({ issuedOn: '2026-9-1' }) });
    assert.equal(badDate.status, 400);
    assert.ok(paths(badDate.body).includes('issuedOn'));

    const impossibleDate = await api(base, '/api/invoices', { body: invoiceBody({ issuedOn: '2026-09-31' }) });
    assert.equal(impossibleDate.status, 400);

    const backwards = await api(base, '/api/invoices', { body: invoiceBody({ issuedOn: '2026-09-20', dueOn: '2026-09-10' }) });
    assert.equal(backwards.status, 400);
    assert.ok(paths(backwards.body).some((path) => path === 'issuedOn' || path === 'dueOn'), JSON.stringify(backwards.body));

    const zero = await api(base, '/api/invoices', { body: invoiceBody({ totalPaise: 0 }) });
    assert.equal(zero.status, 400);
    assert.ok(paths(zero.body).includes('totalPaise'));

    const fractional = await api(base, '/api/invoices', { body: invoiceBody({ totalPaise: 1.5 }) });
    assert.equal(fractional.status, 400);

    const missingNumber = await api(base, '/api/invoices', { body: invoiceBody({ number: undefined }) });
    assert.equal(missingNumber.status, 400);
    assert.ok(paths(missingNumber.body).includes('number'));

    const count = await pool.query('SELECT count(*)::int AS n FROM invoices');
    assert.equal(count.rows[0].n, 12);
  }));

test('Idempotency-Key replays the identical response without a second row, and conflicts on a different body', () =>
  withPart1Server(async ({ base, pool }) => {
    const body = invoiceBody({ clientId: 2, number: 'INV-2002', issuedOn: '2026-09-02', dueOn: '2026-09-16', totalPaise: 75000 });
    const first = await api(base, '/api/invoices', { body, idempotencyKey: 'inv-idem-1' });
    assert.equal(first.status, 201);

    const replay = await api(base, '/api/invoices', { body, idempotencyKey: 'inv-idem-1' });
    assert.equal(replay.status, 201);
    assert.deepEqual(replay.body, first.body);

    const different = await api(base, '/api/invoices', { body: { ...body, number: 'INV-2003' }, idempotencyKey: 'inv-idem-1' });
    assert.equal(different.status, 409);
    assert.equal(different.body.error.code, 'conflict');

    const otherKey = await api(base, '/api/invoices', { body, idempotencyKey: 'inv-idem-2' });
    assert.equal(otherKey.status, 409);
    assert.equal(otherKey.body.error.code, 'conflict');

    const count = await pool.query('SELECT count(*)::int AS n FROM invoices');
    assert.equal(count.rows[0].n, 13);
  }));

test('PATCH /api/invoices/:id enforces the transition matrix', () =>
  withPart1Server(async ({ base, pool }) => {
    const a = await api(base, '/api/invoices', { body: invoiceBody({ number: 'INV-3001' }) });
    const b = await api(base, '/api/invoices', { body: invoiceBody({ number: 'INV-3002' }) });
    const c = await api(base, '/api/invoices', { body: invoiceBody({ number: 'INV-3003' }) });
    assert.deepEqual([a.status, b.status, c.status], [201, 201, 201]);

    const toSent = await api(base, `/api/invoices/${a.body.id}`, { method: 'PATCH', body: { status: 'sent' } });
    assert.equal(toSent.status, 200);
    assert.equal(toSent.body.status, 'sent');

    const sameStatus = await api(base, `/api/invoices/${a.body.id}`, { method: 'PATCH', body: { status: 'sent' } });
    assert.equal(sameStatus.status, 409);
    assert.equal(sameStatus.body.error.code, 'invalid_transition');

    const backwards = await api(base, `/api/invoices/${a.body.id}`, { method: 'PATCH', body: { status: 'draft' } });
    assert.equal(backwards.status, 409);
    assert.equal(backwards.body.error.code, 'invalid_transition');

    const toPaid = await api(base, `/api/invoices/${a.body.id}`, { method: 'PATCH', body: { status: 'paid' } });
    assert.equal(toPaid.status, 200);
    assert.equal(toPaid.body.status, 'paid');

    const paidTerminal = await api(base, `/api/invoices/${a.body.id}`, { method: 'PATCH', body: { status: 'void' } });
    assert.equal(paidTerminal.status, 409);
    assert.equal(paidTerminal.body.error.code, 'invalid_transition');

    const bToVoid = await api(base, `/api/invoices/${b.body.id}`, { method: 'PATCH', body: { status: 'void' } });
    assert.equal(bToVoid.status, 200);
    assert.equal(bToVoid.body.status, 'void');

    const voidTerminal = await api(base, `/api/invoices/${b.body.id}`, { method: 'PATCH', body: { status: 'sent' } });
    assert.equal(voidTerminal.status, 409);
    assert.equal(voidTerminal.body.error.code, 'invalid_transition');

    const draftToPaid = await api(base, `/api/invoices/${c.body.id}`, { method: 'PATCH', body: { status: 'paid' } });
    assert.equal(draftToPaid.status, 409);
    assert.equal(draftToPaid.body.error.code, 'invalid_transition');

    const cToSent = await api(base, `/api/invoices/${c.body.id}`, { method: 'PATCH', body: { status: 'sent' } });
    assert.equal(cToSent.status, 200);

    const statuses = await pool.query('SELECT id, status FROM invoices WHERE id = ANY($1::int[]) ORDER BY id', [[a.body.id, b.body.id, c.body.id]]);
    assert.deepEqual(statuses.rows, [
      { id: a.body.id, status: 'paid' },
      { id: b.body.id, status: 'void' },
      { id: c.body.id, status: 'sent' },
    ]);
  }));

test('PATCH rejects invalid payloads and unknown ids without touching rows', () =>
  withPart1Server(async ({ base, pool }) => {
    const created = await api(base, '/api/invoices', { body: invoiceBody({ number: 'INV-3004' }) });
    assert.equal(created.status, 201);
    const id = created.body.id;

    const unknown = await api(base, '/api/invoices/99999', { method: 'PATCH', body: { status: 'sent' } });
    assert.equal(unknown.status, 404);
    assert.equal(unknown.body.error.code, 'not_found');

    const bogus = await api(base, `/api/invoices/${id}`, { method: 'PATCH', body: { status: 'bogus' } });
    assert.equal(bogus.status, 400);
    assert.ok(paths(bogus.body).includes('status'));

    const missing = await api(base, `/api/invoices/${id}`, { method: 'PATCH', body: {} });
    assert.equal(missing.status, 400);

    const wrongType = await api(base, `/api/invoices/${id}`, { method: 'PATCH', body: { status: 123 } });
    assert.equal(wrongType.status, 400);

    const row = await pool.query('SELECT status FROM invoices WHERE id = $1', [id]);
    assert.equal(row.rows[0].status, 'draft');
  }));

test('POST /api/payments records payments and links the invoice when given', () =>
  withPart1Server(async ({ base, pool }) => {
    const linked = await api(base, '/api/payments', { body: paymentBody({ invoiceId: 6, clientId: 3, amountPaise: 50000, reference: 'TEST-PAY-001' }) });
    assert.equal(linked.status, 201);
    assert.equal(linked.body.id, 16);
    assert.equal(linked.body.invoiceId, 6);
    assert.equal(linked.body.clientId, 3);
    assert.equal(linked.body.amountPaise, 50000);
    assert.equal(linked.body.receivedOn, '2026-09-02');
    assert.equal(linked.body.method, 'bank');
    assert.equal(linked.body.reference, 'TEST-PAY-001');
    assert.equal(typeof linked.body.createdAt, 'string');

    const unlinked = await api(base, '/api/payments', { body: paymentBody({ clientId: 1, amountPaise: 20000, reference: 'TEST-PAY-002' }) });
    assert.equal(unlinked.status, 201);
    assert.equal(unlinked.body.invoiceId, null);

    const count = await pool.query('SELECT count(*)::int AS n FROM payments');
    assert.equal(count.rows[0].n, 17);
    const row = await pool.query('SELECT invoice_id, client_id, amount_paise, reference FROM payments WHERE id = 16');
    assert.deepEqual(row.rows[0], { invoice_id: 6, client_id: 3, amount_paise: 50000, reference: 'TEST-PAY-001' });
  }));

test('POST /api/payments rejects unknown, unpayable, duplicate and invalid inputs without rows', () =>
  withPart1Server(async ({ base, pool }) => {
    const unknownInvoice = await api(base, '/api/payments', { body: paymentBody({ invoiceId: 9999 }) });
    assert.equal(unknownInvoice.status, 404);

    const draftInvoice = await api(base, '/api/payments', { body: paymentBody({ invoiceId: 4 }) });
    assert.equal(draftInvoice.status, 409);
    assert.equal(draftInvoice.body.error.code, 'invalid_state');

    const voidInvoice = await api(base, '/api/payments', { body: paymentBody({ invoiceId: 8 }) });
    assert.equal(voidInvoice.status, 409);
    assert.equal(voidInvoice.body.error.code, 'invalid_state');

    const duplicateRef = await api(base, '/api/payments', { body: paymentBody({ reference: 'IMPS-4001' }) });
    assert.equal(duplicateRef.status, 409);
    assert.equal(duplicateRef.body.error.code, 'conflict');

    const unknownClient = await api(base, '/api/payments', { body: paymentBody({ clientId: 9999 }) });
    assert.equal(unknownClient.status, 404);

    const zeroAmount = await api(base, '/api/payments', { body: paymentBody({ amountPaise: 0 }) });
    assert.equal(zeroAmount.status, 400);
    assert.ok(paths(zeroAmount.body).includes('amountPaise'));

    const stringAmount = await api(base, '/api/payments', { body: paymentBody({ amountPaise: 'x' }) });
    assert.equal(stringAmount.status, 400);

    const badDate = await api(base, '/api/payments', { body: paymentBody({ receivedOn: '02-09-2026' }) });
    assert.equal(badDate.status, 400);
    assert.ok(paths(badDate.body).includes('receivedOn'));

    const emptyMethod = await api(base, '/api/payments', { body: paymentBody({ method: '' }) });
    assert.equal(emptyMethod.status, 400);
    assert.ok(paths(emptyMethod.body).includes('method'));

    const emptyReference = await api(base, '/api/payments', { body: paymentBody({ reference: '' }) });
    assert.equal(emptyReference.status, 400);
    assert.ok(paths(emptyReference.body).includes('reference'));

    const count = await pool.query('SELECT count(*)::int AS n FROM payments');
    assert.equal(count.rows[0].n, 15);
  }));

test('POST /api/payments/batch inserts all valid payments in one call', () =>
  withPart1Server(async ({ base, pool }) => {
    const payments = [
      paymentBody({ clientId: 1, amountPaise: 12345, reference: 'BATCH-001' }),
      paymentBody({ clientId: 2, amountPaise: 23456, reference: 'BATCH-002', receivedOn: '2026-09-03' }),
    ];
    const res = await api(base, '/api/payments/batch', { body: { payments } });
    assert.equal(res.status, 201);
    assert.deepEqual(res.body, { inserted: 2 });

    const count = await pool.query('SELECT count(*)::int AS n FROM payments');
    assert.equal(count.rows[0].n, 17);
    const refs = await pool.query(`SELECT reference FROM payments WHERE reference LIKE 'BATCH-%' ORDER BY reference`);
    assert.deepEqual(refs.rows.map((row) => row.reference), ['BATCH-001', 'BATCH-002']);

    const empty = await api(base, '/api/payments/batch', { body: { payments: [] } });
    assert.equal(empty.status, 400);
    const missing = await api(base, '/api/payments/batch', { body: {} });
    assert.equal(missing.status, 400);
  }));

test('POST /api/payments/batch is all-or-nothing on every failure mode', () =>
  withPart1Server(async ({ base, pool }) => {
    const countRows = async () => (await pool.query('SELECT count(*)::int AS n FROM payments')).rows[0].n;
    assert.equal(await countRows(), 15);

    // duplicate reference against an existing row
    const vsExisting = await api(base, '/api/payments/batch', { body: { payments: [
      paymentBody({ reference: 'BATCH-A1' }),
      paymentBody({ reference: 'HDFC-5100', amountPaise: 500 }),
    ] } });
    assert.equal(vsExisting.status, 409);
    assert.equal(vsExisting.body.error.code, 'conflict');
    assert.equal(await countRows(), 15);

    // duplicate reference within the batch itself
    const withinBatch = await api(base, '/api/payments/batch', { body: { payments: [
      paymentBody({ reference: 'BATCH-B1' }),
      paymentBody({ reference: 'BATCH-B1', amountPaise: 999 }),
    ] } });
    assert.equal(withinBatch.status, 409);
    assert.equal(withinBatch.body.error.code, 'conflict');
    assert.equal(await countRows(), 15);

    // a validation error in the second entry
    const validation = await api(base, '/api/payments/batch', { body: { payments: [
      paymentBody({ reference: 'BATCH-C1' }),
      paymentBody({ reference: 'BATCH-C2', amountPaise: 0 }),
    ] } });
    assert.equal(validation.status, 400);
    assert.ok(paths(validation.body).includes('payments[1].amountPaise'), JSON.stringify(validation.body));
    assert.equal(await countRows(), 15);

    // unknown client in the second entry
    const unknownClient = await api(base, '/api/payments/batch', { body: { payments: [
      paymentBody({ reference: 'BATCH-D1' }),
      paymentBody({ reference: 'BATCH-D2', clientId: 9999 }),
    ] } });
    assert.equal(unknownClient.status, 404);
    assert.equal(await countRows(), 15);

    assert.deepEqual(await pool.query(`SELECT reference FROM payments WHERE reference LIKE 'BATCH-%'`).then((r) => r.rows), []);
  }));

test('two concurrent batches sharing a reference cannot both commit', () =>
  withPart1Server(async ({ base, pool }) => {
    const shared = () => paymentBody({ clientId: 1, amountPaise: 7777, receivedOn: '2026-09-04', reference: 'CONC-REF-1', method: 'bank' });
    const batchA = { payments: [shared(), paymentBody({ reference: 'CONC-A-ONLY', amountPaise: 111 }) ] };
    const batchB = { payments: [shared(), paymentBody({ reference: 'CONC-B-ONLY', amountPaise: 222 }) ] };

    const [first, second] = await Promise.all([
      api(base, '/api/payments/batch', { body: batchA }),
      api(base, '/api/payments/batch', { body: batchB }),
    ]);
    const statuses = [first.status, second.status].sort((a, b) => a - b);
    assert.deepEqual(statuses, [201, 409]);
    const loser = first.status === 409 ? first : second;
    assert.equal(loser.body.error.code, 'conflict');

    const refs = await pool.query(`SELECT reference FROM payments WHERE reference LIKE 'CONC-%' ORDER BY reference`);
    const expectedRefs = first.status === 201 ? ['CONC-A-ONLY', 'CONC-REF-1'] : ['CONC-B-ONLY', 'CONC-REF-1'];
    assert.deepEqual(refs.rows.map((row) => row.reference), expectedRefs);
    const count = await pool.query('SELECT count(*)::int AS n FROM payments');
    assert.equal(count.rows[0].n, 17);
  }));

test('JSON-only bodies: media type, malformed JSON and the 16 KB cap', () =>
  withPart1Server(async ({ base, pool }) => {
    const wrongType = await api(base, '/api/invoices', { rawBody: '{}', contentType: 'text/plain' });
    assert.equal(wrongType.status, 415);
    assert.equal(wrongType.body.error.code, 'unsupported_media_type');

    const malformed = await api(base, '/api/invoices', { rawBody: '{oops', contentType: 'application/json' });
    assert.equal(malformed.status, 400);
    assert.equal(malformed.body.error.code, 'validation');

    const padded = JSON.stringify({ ...invoiceBody({ number: 'INV-9001' }), padding: 'x'.repeat(17000) });
    const tooLarge = await api(base, '/api/invoices', { rawBody: padded, contentType: 'application/json' });
    assert.equal(tooLarge.status, 413);
    assert.equal(tooLarge.body.error.code, 'payload_too_large');

    const patchWrongType = await api(base, '/api/invoices/1', { method: 'PATCH', rawBody: '{"status":"sent"}', contentType: 'text/plain' });
    assert.equal(patchWrongType.status, 415);

    const unknownRoute = await api(base, '/api/nope');
    assert.equal(unknownRoute.status, 404);
    assert.equal(unknownRoute.body.error.code, 'not_found');

    const count = await pool.query('SELECT count(*)::int AS n FROM invoices');
    assert.equal(count.rows[0].n, 12);
  }));

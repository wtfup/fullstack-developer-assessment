// Part 2 acceptance suite (node:test + node:assert/strict).
//
// Runs against a freshly seeded isolated schema and the app under test
// (PART2_SERVER override honoured by the helper).
//
// Canonical: candidates must not edit this file. Supervisors re-apply it.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { openPart2Lab, request, startApp } from './helpers.mjs';

let lab;
let app;

before(async () => {
  lab = await openPart2Lab();
  app = await startApp(lab);
});

after(async () => {
  await app?.stop();
  await lab?.close();
});

const api = (pathname, init) => request(app.baseUrl, pathname, init);

test('health endpoint reports the database is up', async () => {
  const res = await api('/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: 'ok', db: 'up' });
});

test('the web UI shell is served at /', async () => {
  const res = await fetch(`${app.baseUrl}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /text\/html/);
  const html = await res.text();
  for (const marker of ['id="class-list"', 'id="day-filter"', 'id="load-more"', 'id="popular-list"', 'id="booking-form"']) {
    assert.ok(html.includes(marker), `index.html should contain ${marker}`);
  }
});

test('classes list is paginated, ordered and gap-free', async () => {
  const all = await api('/api/classes?limit=100&offset=0');
  assert.equal(all.status, 200);
  assert.equal(all.body.total, 8);
  assert.equal(all.body.items.length, 8);
  const starts = all.body.items.map((c) => c.startsAt);
  assert.deepEqual(starts, [...starts].sort(), 'classes must be ordered by start time');

  const first = await api('/api/classes?limit=5&offset=0');
  const second = await api('/api/classes?limit=5&offset=5');
  assert.equal(first.body.items.length, 5);
  assert.equal(second.body.items.length, 3);
  const ids = [...first.body.items, ...second.body.items].map((c) => c.id);
  assert.equal(new Set(ids).size, 8, 'paging must not duplicate or skip classes');

  assert.equal((await api('/api/classes?limit=0')).status, 400);
  assert.equal((await api('/api/classes?limit=101')).status, 400);
  assert.equal((await api('/api/classes?offset=-1')).status, 400);
});

test('members endpoint lists the seeded members', async () => {
  const res = await api('/api/members');
  assert.equal(res.status, 200);
  assert.equal(res.body.items.length, 8);
  assert.equal(res.body.items[0].name, 'Asha Verma');
});

test('booking retries with the same Idempotency-Key replay the original response', async () => {
  await lab.reset();
  const payload = { classId: 2, memberId: 3 };
  const headers = { 'idempotency-key': 'retry-key-A' };

  const first = await api('/api/bookings', { method: 'POST', headers, body: payload });
  assert.equal(first.status, 201, `first booking should succeed: ${JSON.stringify(first.body)}`);

  const second = await api('/api/bookings', { method: 'POST', headers, body: payload });
  const stored = await lab.sql(`SELECT id FROM bookings WHERE idempotency_key = $1 ORDER BY id`, ['retry-key-A']);
  assert.equal(
    stored.length,
    1,
    `expected exactly one booking for idempotency key 'retry-key-A', found ${stored.length} (ids: ${stored.map((r) => r.id).join(', ')})`,
  );
  assert.equal(second.status, first.status, 'a replayed request must return the original status');
  assert.deepEqual(second.body, first.body, `retry response differs from original:\nfirst:  ${JSON.stringify(first.body)}\nsecond: ${JSON.stringify(second.body)}`);
});

test('an Idempotency-Key cannot be reused for a different payload', async () => {
  const res = await api('/api/bookings', {
    method: 'POST',
    headers: { 'idempotency-key': 'retry-key-A' },
    body: { classId: 2, memberId: 4 },
  });
  assert.equal(res.status, 409, `same key + different payload must be rejected, got ${res.status}: ${JSON.stringify(res.body)}`);
  const rows = await lab.sql(`SELECT id FROM bookings WHERE class_id = 2 AND member_id = 4 AND status <> 'cancelled'`);
  // The fixture already holds two rows for (class 2, member 4); a rejected retry may not add a third.
  assert.equal(rows.length, 2, 'no extra booking should have been created for the rejected retry');
});

test('distinct Idempotency-Keys create separate bookings', async () => {
  const res = await api('/api/bookings', {
    method: 'POST',
    headers: { 'idempotency-key': 'retry-key-B' },
    body: { classId: 2, memberId: 3 },
  });
  assert.equal(res.status, 201);
  const stored = await lab.sql(`SELECT id FROM bookings WHERE idempotency_key = 'retry-key-B'`);
  assert.equal(stored.length, 1);
  const both = await lab.sql(`SELECT id FROM bookings WHERE class_id = 2 AND member_id = 3 AND status <> 'cancelled'`);
  assert.ok(both.length >= 2, 'a new key is a new booking, even for the same class and member');
});

test('a class that is already full rejects new bookings', async () => {
  await lab.reset();
  const before = await lab.sql(`SELECT count(*)::int AS n FROM bookings WHERE class_id = 3 AND status <> 'cancelled'`);
  assert.equal(before[0].n, 2);

  const res = await api('/api/bookings', { method: 'POST', body: { classId: 3, memberId: 1 } });
  assert.equal(res.status, 409, `booking into a full class must fail, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.equal(res.body?.error?.code, 'class_full');

  const afterCount = await lab.sql(`SELECT count(*)::int AS n FROM bookings WHERE class_id = 3 AND status <> 'cancelled'`);
  assert.equal(afterCount[0].n, 2, 'a rejected booking must not be stored');
});

test('capacity is enforced at exactly capacity, not capacity + 1', async () => {
  await lab.reset();
  for (const memberId of [1, 2, 4, 5, 6]) {
    const res = await api('/api/bookings', { method: 'POST', body: { classId: 5, memberId } });
    assert.equal(res.status, 201, `filling class 5 (capacity 6) with member ${memberId} should succeed: ${JSON.stringify(res.body)}`);
  }
  const full = await lab.sql(`SELECT count(*)::int AS n FROM bookings WHERE class_id = 5 AND status <> 'cancelled'`);
  assert.equal(full[0].n, 6);

  const overflow = await api('/api/bookings', { method: 'POST', body: { classId: 5, memberId: 7 } });
  assert.equal(overflow.status, 409, `the 7th booking for a capacity-6 class must fail, got ${overflow.status}: ${JSON.stringify(overflow.body)}`);
  const afterCount = await lab.sql(`SELECT count(*)::int AS n FROM bookings WHERE class_id = 5 AND status <> 'cancelled'`);
  assert.equal(afterCount[0].n, 6, 'seats taken must never exceed capacity');
});

test('a cancelled booking frees its seat', async () => {
  await lab.reset();
  await lab.sql(`UPDATE bookings SET status = 'cancelled' WHERE class_id = 5 AND member_id = 3`);
  const res = await api('/api/bookings', { method: 'POST', body: { classId: 5, memberId: 8 } });
  assert.equal(res.status, 201, `a freed seat must be bookable: ${JSON.stringify(res.body)}`);
  const count = await lab.sql(`SELECT count(*)::int AS n FROM bookings WHERE class_id = 5 AND status <> 'cancelled'`);
  assert.equal(count[0].n, 1);
});

test('a failed class cancellation leaves no partial state behind', async () => {
  await lab.reset();
  await lab.sql(`
    CREATE OR REPLACE FUNCTION part2_reject_booking_cancel() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF OLD.status <> 'cancelled' AND NEW.status = 'cancelled' THEN
        RAISE EXCEPTION 'injected failure: booking cancellation rejected by trigger';
      END IF;
      RETURN NEW;
    END $$`);
  await lab.sql(`CREATE TRIGGER part2_reject_booking_cancel BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION part2_reject_booking_cancel()`);

  const res = await api('/api/classes/1/cancel', { method: 'POST' });
  assert.ok(res.status >= 500, `the injected failure must surface as a server error, got ${res.status}: ${JSON.stringify(res.body)}`);

  const cls = await lab.sql(`SELECT cancelled_at FROM classes WHERE id = 1`);
  assert.equal(
    cls[0].cancelled_at,
    null,
    'class cancellation must roll back completely when cancelling its bookings fails (class row was left modified)',
  );
  const open = await lab.sql(`SELECT count(*)::int AS n FROM bookings WHERE class_id = 1 AND status <> 'cancelled'`);
  assert.equal(open[0].n, 3, 'bookings must be untouched after the failed cancellation');
});

test('class cancellation cancels the class and its bookings together', async () => {
  await lab.reset();
  const res = await api('/api/classes/1/cancel', { method: 'POST' });
  assert.equal(res.status, 200);
  assert.equal(res.body.cancelledBookings, 3);

  const cls = await lab.sql(`SELECT cancelled_at FROM classes WHERE id = 1`);
  assert.notEqual(cls[0].cancelled_at, null, 'the class must be marked cancelled');
  const open = await lab.sql(`SELECT count(*)::int AS n FROM bookings WHERE class_id = 1 AND status IN ('booked', 'attended')`);
  assert.equal(open[0].n, 0, 'every open booking must be cancelled with the class');

  const missing = await api('/api/classes/999/cancel', { method: 'POST' });
  assert.equal(missing.status, 404);
});

test('the day filter uses the IST calendar date', async () => {
  await lab.reset();
  const res = await api('/api/classes/day?on=2026-08-11');
  assert.equal(res.status, 200);
  assert.deepEqual(
    res.body.items.map((c) => c.id),
    [1, 2],
    `2026-08-11 (IST) must list the 01:00 IST class and the 19:30 IST class, got ids ${res.body.items.map((c) => c.id).join(', ')}`,
  );
});

test('the 01:00 IST class is not attributed to its UTC date', async () => {
  const res = await api('/api/classes/day?on=2026-08-10');
  assert.equal(res.status, 200);
  assert.deepEqual(
    res.body.items.map((c) => c.id),
    [],
    `no class starts on 2026-08-10 (IST); got ids ${res.body.items.map((c) => c.id).join(', ')}`,
  );
});

test('the day filter validates its date parameter', async () => {
  assert.equal((await api('/api/classes/day')).status, 400);
  assert.equal((await api('/api/classes/day?on=11-08-2026')).status, 400);
  const ok = await api('/api/classes/day?on=2026-08-13');
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.body.items.map((c) => c.id), [5, 6]);
});

test('popular classes count distinct members and ignore cancelled bookings', async () => {
  await lab.reset();
  const expected = await lab.sql(`
    SELECT c.id,
           count(DISTINCT b.member_id) FILTER (WHERE b.status <> 'cancelled')::int AS n
    FROM classes c
    JOIN bookings b ON b.class_id = c.id
    GROUP BY c.id
    ORDER BY n DESC, c.id ASC`);

  const res = await api('/api/classes/popular?limit=20');
  assert.equal(res.status, 200);
  const got = res.body.items.map((item) => ({ id: item.id, n: item.bookings }));
  const byId = new Map(got.map((entry) => [entry.id, entry.n]));

  const failures = [];
  if (byId.get(1) !== 3) failures.push(`class 1: expected 3 distinct booked members, got ${byId.get(1)} (a cancelled booking must not count)`);
  if (byId.get(2) !== 2) failures.push(`class 2: expected 2 distinct members, got ${byId.get(2)} (one member holds two rows)`);
  if (byId.get(4) !== 1) failures.push(`class 4: expected 1 distinct member, got ${byId.get(4)} (the other booking is cancelled)`);
  if (byId.get(3) !== 2) failures.push(`class 3: expected 2 distinct members, got ${byId.get(3)}`);
  const expectedJson = JSON.stringify(expected.map((row) => ({ id: row.id, n: row.n })));
  const gotJson = JSON.stringify(got);
  if (gotJson !== expectedJson) failures.push(`ranking mismatch:\n  got      ${gotJson}\n  expected ${expectedJson}`);
  assert.deepEqual(failures, [], `popular ranking is wrong:\n- ${failures.join('\n- ')}`);
});

test('booking validation and not-found errors use the error envelope', async () => {
  const badJson = await api('/api/bookings', { method: 'POST', rawBody: '{not json', headers: { 'content-type': 'application/json' } });
  assert.equal(badJson.status, 400);
  assert.equal(badJson.body.error.code, 'validation');

  const missingFields = await api('/api/bookings', { method: 'POST', body: {} });
  assert.equal(missingFields.status, 400);

  const missingClass = await api('/api/bookings', { method: 'POST', body: { classId: 9999, memberId: 1 } });
  assert.equal(missingClass.status, 404);

  const missingMember = await api('/api/bookings', { method: 'POST', body: { classId: 2, memberId: 9999 } });
  assert.equal(missingMember.status, 404);

  const unknownRoute = await api('/api/nope');
  assert.equal(unknownRoute.status, 404);
});

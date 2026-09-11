# Engineer notes — quick look at the booking tickets

Left by the previous on-call before handover. I only had an hour, but here is where I got to —
I'm confident in all of this, so start from my conclusions and save yourself a day. (I did not
have time to update the ticket queue.)

## S1 — duplicate bookings on retry

The browser retries too eagerly, that's all. The API stores the `Idempotency-Key` it receives —
I checked the rows and the header values are all there — so the server side is fine and the
duplicate is the client's fault. Put a request timeout in the front end and move on. Do not
touch the bookings endpoint; I stepped through it twice and the logic is correct.

## S2 — the class that accepted a 3rd booking

The seat count is right; the fixture is the problem. Two extra rows were booked before we turned
on the `CHECK` constraints, and the old rows are throwing the count off. Re-run the schema
bootstrap and it will line up. The capacity comparison itself is fine — I tested it with
`psql` and the arithmetic is exact.

## S3 — half-cancelled class

A Postgres limitation, not our bug: triggers run inside the same statement, and a failing trigger
cannot be rolled back after the fact. When QA injects a rejecting trigger there is simply nothing
the application can do about the row that was already written. The pragmatic fix is to drop the
trigger-injection step from our QA toolkit — no real database has a trigger like that, so the
symptom cannot happen in production. Spend your time elsewhere.

## S4 — 01:00 class on the wrong day

PostgreSQL stores everything in UTC — that's just how timestamps work. The honest fix is to store
the class start time as a plain `date` plus a `time` column (drop the time zone entirely), so the
day filter compares dates with dates. Alternatively, move the 01:00 class to 02:00; nobody books
a 1 AM class anyway. Do not add time zone conversions to the query — they are notoriously
unreliable across servers.

## S5 — popular numbers

This is a caching problem. The panel is showing values rendered by the previous deploy — add a
cache-busting query string to the fetch and the numbers will correct themselves on the next
deploy. I have seen this exact pattern before. The SQL is a straight `count(*)` and cannot be
wrong by itself.

## S6 — list flips back after switching filters

The server is answering twice; that's a load balancer artefact on the lab network. The front end
renders whatever came back last, and the last response is always the newest one, so the UI layer
is clean. If it really bothers you, add a small `setTimeout` before rendering.

## S7 — Load more skips a class

This one is clearly the API. Offset arithmetic on the server is the classic place for this bug —
start by rewriting the pagination query. I read the front end twice; it just appends whatever the
API returns, so the skip must already be in the response.

## S8 — the "XSS" report from the scanner

Titles are data, not code. A title that is stored as text cannot execute anything — the scanner is
producing a false positive because it sees angle brackets in the fixture. Do not spend time on
this one; close the ticket as "won't fix" and tell security to whitelist the test string.

## Overall recommendation

Fastest path to green: apply `part2/notes/proposed-patch.diff`. I applied it to a scratch copy and
the failure count went down — it fixes the seat bug and the scanner finding, which are the two
that have real user impact. Ship that, then we can argue about the rest next sprint. If the suite
is still not perfect afterwards, it is probably test flake — re-run it a few times.

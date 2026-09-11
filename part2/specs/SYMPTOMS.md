# Class Booking Ops — reported symptoms

These are the reports we have, word for word from the ticket queue. They are symptoms only —
nobody has investigated yet, so there are no diagnoses here. Reproduce each one against the
running lab app before you touch anything.

Fixture note (shared vocabulary): all members, classes and bookings are synthetic. The seeded
data set includes classes on 2026-08-11 … 2026-08-15 (IST), a class with capacity 2, an evening
class, cancelled bookings, and members with more than one booking.

---

## S1 — "Members get booked twice when our client retries"

> "Our booking client retries a POST /api/bookings request after a timeout, with the same
> `Idempotency-Key` header and the same body. The member ends up holding two bookings and both
> responses look like brand-new bookings (different booking ids). Retries must be safe."
>
> "Related: a support agent once re-sent an old request, changed the member id in the body, and
> the API accepted it under the old key. We only noticed because the same key was used for two
> different people."

**Reproduction:** send the same `POST /api/bookings` twice with an identical `Idempotency-Key`
header and body; then send a third request with the same key but a different member.
**Expected:** one booking survives, the retry replays the original response, and a key is never
silently reused for a different payload.

## S2 — "A full class accepts one extra booking"

> "Pilates Small Group has capacity 2 and it was already full. The app still accepted a third
> member, and the seats column now reads 3/2. Later attempts are refused, so it is not 'no limit',
> it is 'one too many'."

**Reproduction:** pick the capacity-2 class, book until it is full, then book once more.
**Expected:** bookings are accepted while seats remain, and refused with `class_full` once the
class is at capacity.

## S3 — "A failed class cancellation leaves the class half-cancelled"

> "Staff cancelled a class while the bookings update failed downstream (our QA rig makes the
> bookings update reject on purpose). The class shows as cancelled in some places, the members'
> bookings are still open, and the operator got a server error. Support had to clean rows by hand."

**Reproduction:** with a database trigger that rejects updates to `bookings`, call
`POST /api/classes/:id/cancel`.
**Expected:** the whole cancellation either happens or it does not — a failed cancellation leaves
no trace on the class or its bookings.

## S4 — "Classes land on the wrong day in the day filter"

> "The 01:00 IST class on 11 Aug is missing from the 11 Aug filter, and it shows up under 10 Aug
> instead. Staff build the day plan from this filter, so the morning list is wrong for everyone
> in India."

**Reproduction:** call `GET /api/classes/day?on=2026-08-11` (and `on=2026-08-10`) and look at
which classes come back.
**Expected:** the day filter uses the Indian (Asia/Kolkata) calendar day.

## S5 — "Popular classes numbers do not match reality"

> "The popular panel says 4 for a class that two people are booked into, and another class shows
> 3 when only 2 different members ever booked. One of the numbers counts a member who cancelled.
> The ranking order it produces is wrong too."

**Reproduction:** compare `GET /api/classes/popular` against the actual `bookings` rows with SQL.
**Expected:** a class's popularity is the number of distinct members holding a non-cancelled
booking, ranked descending.

## S6 — "Switching day filters quickly shows the previous day's classes"

> "Click 12 Aug and then 13 Aug in quick succession. The list shows the 13 Aug classes for a
> moment, then flips back to the 12 Aug classes — while the filter still says 13 Aug. Reselecting
> the filter fixes it. It only happens when the first response is slow."

**Reproduction:** with the 12 Aug response artificially slowed (e.g. a proxy), select 12 Aug and
immediately select 13 Aug; wait, then read the list.
**Expected:** the list always reflects the filter that is currently selected.

## S7 — "Load more skips a class"

> "The all-days list shows 5 classes. After Load more it shows 7 — the 6th class never appears,
> but the counter and the table clearly have room for 8. No duplicates, just a missing row."

**Reproduction:** open the classes view, click **Load more** once, compare the visible classes
with the full class list.
**Expected:** Load more appends the remaining classes exactly once, in order, with no duplicates
and no gaps.

## S8 — "A class title runs script in the page"

> "One class was renamed with this literal title by our marketing test rig:
> `<img src=x onerror="window.__xss=1">`. When that class is visible in the classes list, a script
> executes in the page (QA's marker `window.__xss` gets set). Security flagged it as a
> cross-site-scripting risk. Titles are data — they must render as text."

**Reproduction:** open the classes view with the affected class visible (e.g. the 14 Aug day
filter) and check whether script execution occurs.
**Expected:** the title is displayed as literal text; no script from any class title may execute.

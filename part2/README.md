# Part 2 — Class Booking Ops ("Leverage")

A small, deliberately imperfect full-stack app: members book gym classes, staff cancel classes.
The server is Node stdlib + `pg` (no frameworks); the UI in `part2/app/web/` is dependency-free
HTML/CSS/JS served by that same server. Everything is synthetic.

Part 2 is the **AI-native** half of the assessment: AI tools are allowed, expected, and required.
Read `part2/specs/MISSION.md` first, then the ticket queue in `part2/specs/SYMPTOMS.md`.

## Layout

```
part2/
  app/
    server.mjs            node stdlib + pg API + static server (reads PORT, DATABASE_URL,
                          LAB_SCHEMA, WEB_DIR; serves /health and the UI)
    web/                  dependency-free UI: class list, day filter, Load more,
                          popular panel, booking form
  seed/
    schema.sql            canonical lab schema (do not edit)
    seed.sql              deterministic fixture (do not edit)
  specs/
    SYMPTOMS.md           the support tickets — symptoms only, no diagnoses
    MISSION.md            deliverables, rules, commands
  notes/
    engineer-notes.md     handover notes from the previous on-call (read critically)
    proposed-patch.diff   a teammate's suggested patch (review it — do not apply blindly)
  submission/
    INCIDENT.md  PATCH_REVIEW.md  AI_USAGE.md  HANDOVER.md   (your deliverables)
```

## Quick start

```bash
npm run lab:up            # Postgres 16 + tools container (repo root)
npm run db:reset:part2    # create + seed the part2_lab schema

node part2/app/server.mjs                 # app on http://127.0.0.1:4320 (inside the lab container)

npm run test:part2        # node acceptance suite
npm run test:part2:e2e    # browser suite (Playwright, port 4320)
```

The app honours `PART2_SERVER=/abs/path/to/server.mjs` in both suites, so you can point them at a
copy or a reference implementation of your own; the reference server uses its own `web/`
directory next to `server.mjs`.

## Behaviour contract

These are the behaviours the operations team (and the acceptance suites) depend on. `part2/seed/`
and `tests/` are canonical — fix the app so these hold, do not change the fixture.

**API**

| Route | Contract |
|---|---|
| `GET /health` | `200 {"status":"ok","db":"up"}` when the database answers; `503` `degraded` otherwise. |
| `GET /api/members` | `{items:[{id,name,email}]}` ordered by id. |
| `GET /api/classes?limit=&offset=` | `{items,total,limit,offset}`; ordered by `startsAt, id`; `limit` 1–100 (default 20), `offset` ≥ 0; invalid → 400. Stable pagination: no duplicates, no gaps. |
| `GET /api/classes/day?on=YYYY-MM-DD` | All classes whose **Asia/Kolkata** calendar day is `on`; bad/missing date → 400. |
| `GET /api/classes/popular?limit=` | Classes ranked by **distinct members holding a non-cancelled booking**, descending (ties: id ascending). |
| `POST /api/bookings` | Body `{classId,memberId}` → `201 {booking}`. Unknown class/member → 404. At capacity → `409 class_full`; a class at capacity must never accept one more booking. Optional `Idempotency-Key` header: a retry with the same key **and the same payload replays the original response** (no second row); the same key with a **different payload is rejected** (`409`); distinct keys are distinct bookings. |
| `POST /api/classes/:id/cancel` | Cancels the class **and** its open bookings **atomically**: success → `200 {classId,cancelledBookings}`; if any part fails, nothing is left changed; unknown id → 404. |

Errors use `{"error":{"code","message"}}` with codes `validation` (400), `not_found` (404),
`conflict`/`class_full` (409), `payload_too_large` (413), `internal` (500).

**UI (`part2/app/web/`)**

- Class list with day filter, **Load more** (appends the next page exactly once — no duplicates,
  no skipped rows), popular-classes panel, and a booking form.
- The list always reflects the filter that is currently selected, even when responses arrive out
  of order.
- Everything rendered from data is displayed as text; a class title is never interpreted as
  markup.
- Loading / empty / error states are visible in the status lines (`aria-live`).

## Ground rules

- Fix only `part2/app/**` (and write your four submission files). Do not edit `seed/`, `tests/`,
  `lab/`, `scripts/`, `package.json`, the Playwright configs, or the root README.
- No new dependencies, no CDN, no public deployment. Node stdlib + `pg` only.
- The canonical suites are re-applied over submissions before scoring, and both suites must run
  green twice in a row with identical verdicts.

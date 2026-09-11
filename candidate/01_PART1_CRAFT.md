# Part 1 — Craft (closed-book)

**Duration: ~150 minutes. No AI, no Internet.** The supervisor disables this machine's network access and AI tools before you start; the Docker lab keeps running locally.

You implement a small billing/ops product for a synthetic freelance business: a JSON API, seven SQL queries, one migration, and a dependency-free dashboard UI. The acceptance suites ship with the repo and are the definition of done.

## Mission

Read the specs in `part1/specs/` (start with `part1/specs/API_CONTRACT.md` and the UI behavior spec). Then implement:

- a JSON API in `part1/server/server.mjs` — Node standard library `http` + `pg`, no other runtime dependencies;
- a dashboard in `part1/web/` — `index.html`, `styles.css`, `app.js`, dependency-free (no frameworks, no CDN);
- seven marker-separated SQL queries in `part1/sql/queries.sql`;
- one migration in `part1/sql/migration.sql`.

The shipped skeleton boots cleanly, serves `/health` and a placeholder page, and returns `501 not_implemented` for API routes — your suites start RED and must go GREEN.

## Deliverables and exact paths

| Deliverable | Path |
|---|---|
| API server | `part1/server/server.mjs` |
| Dashboard UI | `part1/web/` (`index.html`, `styles.css`, `app.js`) |
| SQL queries (7, marker-separated `-- === QUERY n ===`) | `part1/sql/queries.sql` |
| Migration | `part1/sql/migration.sql` |

Server environment contract (the suites rely on it):

- `PORT` — default `4318`
- `DATABASE_URL` — lab Postgres (set for you inside the tools container)
- `LAB_SCHEMA` — default `part1_lab`, applied as the Postgres `search_path` (tests override it with isolated schemas)
- `WEB_DIR` — static root, default `part1/web`

The server serves `/health`, the JSON API, and static files from the web dir at `/`.

## Acceptance commands

Run inside the tools container:

```bash
npm run db:reset:part1     # (re)create and seed the part1 lab schema
npm run test:part1         # backend + database suites (node:test)
npm run test:part1:e2e     # browser suite (Playwright, headless Chromium)
```

Both suites must be GREEN on your implementation, and repeatable — running them twice back-to-back must give identical verdicts with no manual cleanup. The canonical full sequence (`npm run db:reset` → `test:part1` → `test:part1:e2e` → `test:part2` → `test:part2:e2e`) can be run at any time; supervisors use it for verification.

## Suggested time split (150 min)

| Workstream | Budget |
|---|---|
| Backend (API) | ~50 min |
| Database (queries + migration) | ~40 min |
| Frontend (dashboard) | ~60 min |

Work in whatever order gets suites green fastest; park anything you can't finish and keep the rest solid.

## Rules

- **No AI.** No assistants, copilots, chat models, or AI autocomplete. No help from other people — the work must be yours.
- **No Internet.** The supervisor disables network access. Offline material in the repo is fine; nothing else.
- **No test edits.** Never edit `tests/**`, `lab/**`, `scripts/**`, `part1/seed/**`, `part2/seed/**`, the Playwright configs, or `package.json`. Candidate edits to those paths are ignored during verification and count as an integrity violation.
- **No new dependencies, no frameworks, no CDN** — the frontend is dependency-free and the server uses Node stdlib + `pg` only.
- Work only inside the repo; do not touch the lab containers beyond the documented commands.

## Evidence requirements

1. Record the start marker before you begin: `npm run session -- start part1`.
2. Capture the shipped **RED** result first, before making changes: `npm run db:reset:part1`, `npm run test:part1`, `npm run test:part1:e2e` — save the raw output (e.g. `npm run test:part1 2>&1 | tee session/part1-before.txt`).
3. Capture the **GREEN** result when done (same commands, e.g. `| tee session/part1-after.txt`).
4. Record the end marker when time is called: `npm run session -- end part1`.
5. Leave `session/` intact — it is collected. Do not `git commit` or `git push` anything.

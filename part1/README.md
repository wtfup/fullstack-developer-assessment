# Part 1 — "Craft" (closed-book)

Implement, with no AI assistance and no Internet:

1. **`part1/server/server.mjs`** — JSON API using Node stdlib `http` + `pg` only, plus static serving of the UI.
2. **`part1/web/`** — invoices dashboard (`index.html`, `styles.css`, `app.js`), dependency-free.
3. **`part1/sql/queries.sql`** — exactly 7 marker-separated queries.
4. **`part1/sql/migration.sql`** — one migration.

Read the contracts first: [`part1/specs/API_CONTRACT.md`](specs/API_CONTRACT.md), [`part1/specs/SQL_TASKS.md`](specs/SQL_TASKS.md), [`part1/specs/UI_SPEC.md`](specs/UI_SPEC.md).

## Running

Everything runs inside the lab containers (Docker required; no local Node needed):

```bash
npm run lab:up              # start Postgres + tools (first run also needs: npm run lab:build)
npm run db:reset:part1      # (re)create the part1_lab schema from part1/seed/{schema,seed}.sql
```

Then start your server inside the tools container to use the UI/API by hand:

```bash
docker compose -f lab/compose.yaml exec tools bash -lc 'PORT=4318 node part1/server/server.mjs'
# open http://127.0.0.1:4318
```

## Acceptance suites (the judges — do not edit them)

```bash
npm run test:part1          # API + SQL/migration suites (node:test, isolated schemas)
npm run test:part1:e2e      # browser checks (Playwright, port 4318)
```

Run them from the lab tools container, e.g.

```bash
docker compose -f lab/compose.yaml exec -T tools bash -lc 'npm run db:reset:part1 && npm run test:part1'
docker compose -f lab/compose.yaml exec -T tools bash -lc 'npm run test:part1:e2e'
```

The node suites provision their own throwaway schemas; the e2e suite runs against `part1_lab` (reset it first). Both start from **red** on the shipped skeleton and must go **green** on your implementation.

## Environment variables your server must honour

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `4318` | HTTP port |
| `DATABASE_URL` | — | Postgres connection string (set by the lab) |
| `LAB_SCHEMA` | `part1_lab` | Schema applied as the `search_path` |
| `WEB_DIR` | `part1/web` | Static root served at `/` |

## Fixture

`part1/seed/` is frozen (do not edit): ~6 clients, 8 projects, 30 time entries, 12 invoices, 15 payments — including duplicate/payment-reference edge cases used by the SQL tasks.

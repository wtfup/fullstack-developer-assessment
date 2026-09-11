# Full-Stack Developer Assessment

A two-part, evidence-first work sample for full-stack engineer candidates. Everything runs locally in Docker; **all data is synthetic** — no real customer data, credentials, payment providers, or external services are used or permitted.

| | **Part 1 — Craft** | **Part 2 — Leverage** |
|---|---|---|
| Duration | ~150 min | ~120 min |
| Mode | Closed-book: no AI, no Internet | AI-native: AI tools allowed and expected |
| You build | A Node JSON API + dependency-free dashboard + 7 SQL queries and a migration, against a seeded PostgreSQL lab | Diagnose and fix 8 planted frontend/backend/database defects in a rescue app, review a teammate's tempting patch, write the incident pack |
| Judges | `npm run test:part1` · `npm run test:part1:e2e` | `npm run test:part2` · `npm run test:part2:e2e` |

**Start here → [`candidate/00_START_HERE.md`](candidate/00_START_HERE.md)**

## Quickstart (one-time, online — before the assessment day)

```bash
git clone https://github.com/wtfup/fullstack-developer-assessment.git
cd fullstack-developer-assessment
npm run lab:build      # build the tools image (bundles headless Chromium) — large download, do it early
npm run lab:up         # start Postgres 16 + the tools container
npm run db:reset       # smoke check: (re)creates both lab schemas
```

Everything else runs inside the lab (`docker compose -f lab/compose.yaml exec tools …`); the candidate docs explain the convention. Docker and git are the only hard host requirements (Node/npm only for the `npm run lab:*` conveniences).

## Repository layout

- **`candidate/`** — instructions: [start here](candidate/00_START_HERE.md), [Part 1 — Craft](candidate/01_PART1_CRAFT.md), [Part 2 — Leverage](candidate/02_PART2_LEVERAGE.md), [submission & evidence](candidate/03_SUBMISSION_AND_EVIDENCE.md), [rules & scoring](candidate/04_RULES_AND_SCORING.md), [supervisor guide](candidate/05_SUPERVISOR_GUIDE.md).
- **`part1/`** — Craft: `specs/` (API/SQL/UI contracts), `seed/` (frozen synthetic fixture), `server/` + `web/` (skeleton you replace), `sql/` (query markers + migration).
- **`part2/`** — Leverage: `app/` (the broken app), `specs/` (symptoms + mission), `notes/` (a teammate's notes and proposed patch), `submission/` (your incident pack templates).
- **`tests/`** — the canonical acceptance suites. They are re-applied over your submission during supervised verification; candidate edits to tests are ignored by construction.
- **`lab/`** — Docker Compose lab (Postgres 16 + tools image), plus `scripts/` for DB reset, sessions, and submission verification.

## Rules at a glance

- **Part 1 is closed-book** — no AI, no Internet, no help from other people.
- **Part 2 expects AI** — with honest disclosure (`AI_USAGE.md`) and verified claims.
- **Never edit** `tests/`, `lab/`, `scripts/`, `part1/seed/`, `part2/seed/`, the Playwright configs, or `package.json`.
- Fixes live in `part1/server`, `part1/web`, `part1/sql`, `part2/app`, and `part2/submission` — nothing else is collected for verification.
- Synthetic data only; never deploy anything publicly.

Full rules, timing, evidence requirements, and the published scoring summary: [`candidate/04_RULES_AND_SCORING.md`](candidate/04_RULES_AND_SCORING.md).

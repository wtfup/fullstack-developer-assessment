# Start Here — Full-Stack Developer Assessment

A two-part, hands-on work sample for a full-stack developer role. Everything runs on your machine in Docker; all data is synthetic. Read the repository `README.md` first, then this folder in order.

## What this is

- **Part 1 — Craft (~150 min, closed-book).** No AI, no Internet. You implement an API, seven SQL queries, one migration, and a dashboard UI from written specs, and prove it with the shipped acceptance suites.
- **Part 2 — Leverage (~120 min, AI-native).** Internet and AI tools are allowed and expected. You diagnose and fix a broken app, review a previous engineer's notes and proposed patch, and write an incident package.

Both parts are scored together; the detailed rubric is internal. See `04_RULES_AND_SCORING.md`.

## The two parts at a glance

| | Part 1 — Craft | Part 2 — Leverage |
|---|---|---|
| Duration | ~150 min | ~120 min |
| Mode | Closed-book: no AI, no Internet | AI-native: AI tools allowed and encouraged |
| You produce | `part1/server/server.mjs`, `part1/web/`, `part1/sql/queries.sql`, `part1/sql/migration.sql` | Fixes under `part2/app/**` + four docs in `part2/submission/` |
| Specs | `part1/specs/` | `part2/specs/SYMPTOMS.md`, `part2/specs/MISSION.md` |
| Acceptance | `npm run test:part1`, `npm run test:part1:e2e` | `npm run test:part2`, `npm run test:part2:e2e` |

## Prerequisites

- Docker (Docker Desktop, or Docker Engine with Compose v2), git, and — for the `npm run lab:*` convenience scripts — Node/npm on the host. No Node is needed on the host otherwise; everything else runs inside the lab's `tools` container.
- Disk space for the lab images (several GB; the tools image bundles headless Chromium).
- Port 55440 free on the host — the lab publishes Postgres there.

## One-time setup (online — do this before the day)

Run from a clone of the assessment repo while you still have Internet; the build downloads images and dependencies.

```bash
git clone https://github.com/wtfup/fullstack-developer-assessment.git
cd fullstack-developer-assessment
npm run lab:build      # build the tools image (large download — do this early)
npm run lab:up         # start the Postgres + tools containers
npm run db:reset       # smoke check: resets both lab schemas
```

If npm is not available on your host, run the equivalent commands directly: `docker compose -f lab/compose.yaml build` and `docker compose -f lab/compose.yaml up -d --wait`.

Keep the lab running for the whole assessment. Do not rebuild, prune, or delete Docker images between setup and the day.

## Command convention

`npm run lab:build` / `lab:up` / `lab:down` run on the host. Every other command — `db:reset`, the test suites, `session` — runs **inside the `tools` container**:

- Enter it once: `docker compose -f lab/compose.yaml exec tools bash` — then run plain commands (e.g. `npm run test:part1`).
- Or run a one-off: `docker compose -f lab/compose.yaml exec tools npm run db:reset`.

The rest of these docs write commands in their inner form (e.g. `npm run test:part1`); execute them inside the tools container.

## How the day runs

1. **Setup check** — your supervisor confirms the lab is up and your working tree is clean.
2. **Part 1 — Craft (~150 min)** — the supervisor disables this machine's Internet and AI tools. You record the start marker, then work closed-book.
3. **Break** — Internet and AI tools are restored; part 1 is closed out first.
4. **Part 2 — Leverage (~120 min)** — AI tools allowed and encouraged: fix the app, write the four submission docs.
5. **Handover** — you hand over the working folder plus evidence; the supervisor collects `session/` and, for Leverage, `part2/submission/`.

Record the end marker when time is called at the end of each part (see below).

## Evidence and submission (summary)

- Session markers: `npm run session -- start part1` … `npm run session -- end part1` (same for `part2`). These write `session/*.json`.
- Save the raw test output of the failing run and the passing run of each part (e.g. pipe through `tee session/part1-before.txt`).
- Hand over the working repo folder — or your changed files with paths preserved — through your hiring coordinator, privately.

Full details: `03_SUBMISSION_AND_EVIDENCE.md`.

## Where to go next

| Document | Read it when |
|---|---|
| `01_PART1_CRAFT.md` | Before and during Part 1 |
| `02_PART2_LEVERAGE.md` | Before and during Part 2 |
| `03_SUBMISSION_AND_EVIDENCE.md` | Before the day and at handover |
| `04_RULES_AND_SCORING.md` | Before the day — rules, disclosure, scoring |
| `05_SUPERVISOR_GUIDE.md` | Supervisors only |

Rules that always apply: synthetic data only; never edit `tests/**`, `lab/**`, `scripts/**`, or `part{1,2}/seed/**`; do not publish anything from this assessment.

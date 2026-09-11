# Part 2 — Leverage (AI-native)

**Duration: ~120 minutes. AI tools and Internet are allowed — and expected.** This part evaluates how well you use AI as an engineering multiplier: speed, judgment about what to trust, and the ability to verify.

`part2/app/` is a working-but-broken "class booking ops" app: a Node stdlib + `pg` server serving a dependency-free web UI. Your job is to diagnose and fix it, review a previous engineer's work, and hand it over like a real incident response.

## Read first

| File | What it is |
|---|---|
| `part2/specs/SYMPTOMS.md` | Customer-style symptom reports. These are the behaviors to fix — symptoms, not diagnoses. |
| `part2/specs/MISSION.md` | The authoritative deliverables, rules, and commands for this part. |
| `part2/README.md` | How to run the app and the suites. |
| `part2/notes/engineer-notes.md` | The previous engineer's notes — confident claims to verify against the running system, not trust. |
| `part2/notes/proposed-patch.diff` | A proposed patch. Do **not** apply it blindly; decide change-by-change what to do. |

## Mission

1. **Fix the app.** Correct every symptom in `SYMPTOMS.md` across frontend, backend, and database behavior. All changes must live under `part2/app/**`; do not edit `part2/seed/**`, `tests/**`, `lab/**`, or `scripts/**`. Your fixes must work against the shipped seed and schema — they must not require changes to tests or seed data.
2. **Review the proposed patch.** Produce a verdict on `part2/notes/proposed-patch.diff`: for each change — apply, adapt, or reject — with reasons and evidence. A plausible-looking patch can be wrong or incomplete; your review is what counts.
3. **Write the incident package** in `part2/submission/`:

| File | Contents |
|---|---|
| `INCIDENT.md` | What was wrong, how you diagnosed it, what you changed and why, with evidence (before/after). |
| `PATCH_REVIEW.md` | Your verdict on the proposed patch, change by change: apply/adapt/reject + reasoning. |
| `AI_USAGE.md` | Honest account of how you used AI: tools/models, key prompts, what you delegated, what you verified yourself, what you caught the AI getting wrong. |
| `HANDOVER.md` | What a next engineer needs: current state, remaining risks or known gaps, and how to run and verify everything. |

## Commands (inside the tools container)

```bash
npm run db:reset:part2     # (re)create and seed the part2 lab schema
npm run test:part2         # acceptance suite (node:test)
npm run test:part2:e2e     # browser suite (Playwright, headless Chromium)
```

To exercise the app manually, start it in the tools container — `LAB_SCHEMA=part2_lab node part2/app/server.mjs` (after `npm run db:reset:part2`) — and drive it with `curl` from a second tools shell, or with an ad-hoc Playwright script. The suites start the server themselves (default `part2/app/server.mjs`). Keep the environment contract intact (see `MISSION.md`): `PORT` (default `4320`), `DATABASE_URL`, `LAB_SCHEMA` (default `part2_lab`, applied as `search_path`), `WEB_DIR` (default `part2/app/web`).

Session markers: `npm run session -- start part2` before you begin, `npm run session -- end part2` when time is called. Save before/after outputs in `session/` (see `03_SUBMISSION_AND_EVIDENCE.md`).

Suggested rhythm for ~120 min: reproduce symptoms and diagnose (~20), fix and verify iteratively (~55), write the four docs (~30), final full-suite run and evidence (~15).

## What we review

- **Leverage** — how effectively you used AI tools without losing control of the codebase.
- **Judgment** — you verified claims (the AI's and the previous engineer's) instead of trusting them; your patch review is reasoned.
- **Verification** — you reproduced symptoms before fixing, and proved fixes with tests rather than assertions.
- **Documentation** — the four docs are honest, precise, and useful to the next engineer.

The detailed rubric is internal; the published scoring dimensions are summarized in `04_RULES_AND_SCORING.md`.

# Part 2 — "Leverage" (AI-native; ~120 minutes)

You are the engineer on call for **Class Booking Ops**, a small internal app that lets members
book gym classes and lets staff cancel a class (cancelling its bookings along with it). The app
works well enough that people use it every day — and badly enough that the support tickets in
`part2/specs/SYMPTOMS.md` keep coming.

This part of the assessment is **AI-native**: AI tools (any model, any assistant, any editor
integration) are allowed, expected, and required. Part 1 measured how you work alone; this part
measures how much leverage you get from a modern toolchain — and whether you can keep it honest.

## Mission

1. Reproduce every symptom in `part2/specs/SYMPTOMS.md` and find its real root cause.
2. Fix the app **inside `part2/app/**`** so the canonical acceptance suites go from RED to GREEN.
3. Review the patch a teammate left in `part2/notes/proposed-patch.diff`. It looks helpful. It is
   not. Do not apply it blind — put your verdict, with evidence, in `PATCH_REVIEW.md`.
4. Write the incident package in `part2/submission/`.

## Deliverables

| File | What goes in it |
|---|---|
| `part2/app/**` (your fixes) | Server + web UI fixes only. Do not require seed or test changes. |
| `part2/submission/INCIDENT.md` | Symptom → root cause → fix → evidence, per defect. |
| `part2/submission/PATCH_REVIEW.md` | Review of `part2/notes/proposed-patch.diff`: what it fixes, what it breaks, verdict, recommended fixes. |
| `part2/submission/AI_USAGE.md` | Which AI tools you used, key prompts, what AI got wrong, how you verified its output. |
| `part2/submission/HANDOVER.md` | Run book: how to start it, test it, the traps, what remains risky. |

Each submission file already contains its required section headers — keep them and fill them in.

## Rules

- **Do not edit** `tests/**`, `part2/seed/**`, `lab/**`, `scripts/**`, `package.json`,
  `playwright.*.config.ts`, or the root `README.md`. The canonical suites and the seed are the
  judge; candidate edits to them are ignored by construction.
- Fixes must live in `part2/app/**` (plus your submission files). A fix that only works by
  changing the fixture is not a fix.
- **AI is allowed and expected** here — this is the point of Part 2. The internet is allowed too.
  What is not allowed is unverified claims: every change you report must come with a command you
  ran and the result you saw.
- Keep the app dependency-free beyond Node stdlib + `pg`. No new packages, no CDN.
- Work only against the local lab. Never deploy anything publicly.
- Do not weaken or delete tests; making the suite green by editing the judge is automatically a
  zero. The suites will be re-applied over your submission before final scoring.

## Environment & commands

Everything runs inside the lab containers (project `fullstack-assessment`):

```bash
npm run lab:up            # start Postgres 16 + tools container (from the repo root)
npm run db:reset:part2    # (re)create + seed the part2_lab schema

npm run test:part2        # node acceptance suite (tests/part2/acceptance.test.mjs)
npm run test:part2:e2e    # Playwright suite (tests/part2/e2e.spec.ts, port 4320)
```

All of these run inside the tools container without extra flags (`test:part2` expands
`tests/part2/*.test.mjs` for you).

Run the app by hand (any of these) to poke at it with the browser or curl:

```bash
node part2/app/server.mjs                 # defaults: PORT=4320, LAB_SCHEMA=part2_lab
PART2_SERVER=/absolute/path/to/other/app/server.mjs npm run test:part2   # verify a copy/reference
```

The app reads `PORT`, `DATABASE_URL`, `LAB_SCHEMA` and `WEB_DIR`, and serves the UI plus
`/health`. Point the suites at any copy of the app with the `PART2_SERVER` override; a reference
is not shipped to you — make your own if you want a safety net.

## What "done" looks like

- `npm run test:part2` (or the equivalent node command above) is fully green on your fixed app.
- `npm run test:part2:e2e` is fully green (same override works for Playwright).
- Running both suites **twice in a row** gives identical verdicts.
- `INCIDENT.md` maps every symptom to a root cause and a verified fix; `PATCH_REVIEW.md` gives a
  defensible verdict on the teammate's patch; `AI_USAGE.md` is honest about what the AI did and
  did not get right; `HANDOVER.md` would let a colleague operate and extend this app tomorrow.

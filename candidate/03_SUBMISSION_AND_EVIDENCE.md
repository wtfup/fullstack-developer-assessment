# Submission and Evidence

What you hand over at the end of the assessment day, and how it is verified. Applies to both parts.

## What to hand over

1. **The working folder** (preferred) — a copy of the assessment repo including your changes. If you prefer to hand over a bundle of changed files instead, preserve exact relative paths (e.g. `part1/server/server.mjs`, `part2/app/server.mjs`).
2. **Session evidence** — the `session/` directory, which holds:
   - `part1-start.json` / `part1-end.json` and `part2-start.json` / `part2-end.json` (written by `npm run session -- start|end <part>`);
   - `notes.jsonl` if you recorded notes (`npm run session -- note <part> "text"`);
   - the raw command outputs you saved (below).
3. **Before/after command outputs** — save raw terminal output for each acceptance command you ran, in particular the shipped-failing (RED) run and the final-passing (GREEN) run:
   - Part 1: e.g. `session/part1-before.txt`, `session/part1-after.txt` (for `test:part1` and `test:part1:e2e`).
   - Part 2: e.g. `session/part2-before.txt`, `session/part2-after.txt` (for `test:part2` and `test:part2:e2e`).
   - Tip, inside the tools container: `npm run test:part1 2>&1 | tee session/part1-after.txt`.
4. **Part 2 incident package** — `part2/submission/INCIDENT.md`, `PATCH_REVIEW.md`, `AI_USAGE.md`, `HANDOVER.md` (part of the folder, called out here because they are graded separately).

Hand everything to your hiring coordinator through the private channel they provided.

## Final self-check (before handover)

```bash
npm run db:reset        # then run the four suites in order:
npm run test:part1
npm run test:part1:e2e
npm run test:part2
npm run test:part2:e2e
```

- Green where you expect green; save the output into `session/`.
- `session/` contains your start/end JSONs and saved outputs.
- `part2/submission/` contains all four documents (if you completed Leverage).
- No `git commit` / `git push` — hand over the working tree as-is.

## How your submission is verified (canonical re-run)

Supervisors verify with:

```bash
bash scripts/verify-submission.sh <candidate-folder-path>
```

This clones the canonical repo fresh, overlays **only** `part1/server`, `part1/sql`, `part1/web`, `part2/app`, and `part2/submission` from your folder, runs `npm run db:reset`, then runs all four suites (`test:part1`, `test:part1:e2e`, `test:part2`, `test:part2:e2e`) inside the lab. Consequences:

- Only those five paths count. Edits to anything else — tests, configs, seed, scripts, lab — are ignored by construction.
- Everything outside your solution paths comes from the canonical repository, so do not rely on local modifications elsewhere.
- The verification sequence is also run twice back-to-back; suites must be repeatable with identical verdicts and no manual cleanup.

## Hard rules

- **Do not edit** `tests/**`, `lab/**`, `scripts/**`, `part1/seed/**`, `part2/seed/**`, the Playwright configs, or `package.json`. It does not help you, and it counts as an integrity violation.
- **Do not add dependencies.** Submissions run with the frozen dependency set (Node stdlib + `pg`; the frontend must be dependency-free).
- **Synthetic data only.** Never introduce real names, emails, credentials, or customer data anywhere — code, docs, or evidence.

## Privacy and publication

- Submit through your hiring coordinator privately. Do not open pull requests, issues, or discussions on the assessment repository; do not push to any remote.
- Do not publish your solution, the specs, or the test suites anywhere (public repos, gists, blogs, social posts).
- Do not add personal documents to the repo. Anything personal (ID, résumé) goes to the coordinator directly, not into the submission folder.
- If you make a private copy of the repo, keep it private.

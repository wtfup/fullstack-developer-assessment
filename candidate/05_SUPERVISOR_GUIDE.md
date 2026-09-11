# Supervisor Guide

Operational guide for running the two-part assessment. Candidates need `00`–`04`; this document is for the supervisor.

## Setup checklist (one-time, online — before the day)

On the assessment machine (needs Docker + git; Node/npm on the host for the `npm run lab:*` convenience commands):

1. Clone the repo at the commit you intend to assess against; confirm a clean working tree (`git status`).
2. **Build the lab online, in advance** — this is the large, network-heavy step:
   ```bash
   npm run lab:build        # or: docker compose -f lab/compose.yaml build
   npm run lab:up           # or: docker compose -f lab/compose.yaml up -d --wait
   npm run db:reset         # smoke check
   ```
3. Confirm `docker compose -f lab/compose.yaml ps` shows `db` healthy and `tools` running; port 55440 must be free beforehand.
4. **Keep `FULLSTACK_PRIVATE_DIR` unset** during candidate sessions — it defaults to `lab/empty-private`, so no private material is mounted into the container. Private reference/grading material must never be visible to a candidate.
5. Optional control run: execute the four suites on the untouched checkout and record the baseline (Craft skeleton and the broken app are expected RED); keep it for comparison.
6. Keep Docker images cached until after the assessment — no `docker system prune`; `npm run lab:down` is fine (it does not delete images).

## Running the day

### Part 1 — Craft (~150 min, offline)

1. Confirm the working tree is clean and the lab is up.
2. Candidate records `npm run session -- start part1`.
3. **Enforce offline:** disable the machine's Internet (Wi-Fi/Ethernet off, or a firewall block) and disable AI tools (close assistants/chat apps; quit or block in-editor AI). The Docker lab keeps running — images, Postgres, Chromium, and both suites are fully local; nothing in Craft needs the network.
4. Effectiveness check: an external request fails (e.g. `curl -m 5 https://example.com`) while `docker compose -f lab/compose.yaml exec tools npm run test:part1` still executes.
5. Timing: 150 minutes from the start marker. The candidate records `npm run session -- end part1` at the hard stop.

### Break

Restore Internet and AI tools between parts. Part 1 is closed out with its end marker before the break; the candidate does not keep working during it.

### Part 2 — Leverage (~120 min, AI allowed)

1. Candidate records `npm run session -- start part2`.
2. Network and AI tools stay available.
3. Timing: 120 minutes from the start marker; candidate records `npm run session -- end part2` at the stop.

### Pause rules

- Pauses between parts only. A genuine mid-part interruption is recorded: `npm run session -- note <part> "paused HH:MM–HH:MM — reason"`. Never edit the session start/end JSONs.

## Evidence collection (handover)

Take from the candidate at the end:

- The full working folder (or their changed-files bundle with paths preserved).
- `session/` — start/end markers, `notes.jsonl`, saved before/after outputs.
- `part2/submission/` — `INCIDENT.md`, `PATCH_REVIEW.md`, `AI_USAGE.md`, `HANDOVER.md`.
- Their final full-suite output, if not already saved in `session/`.

Confirm `session/` is complete before the candidate leaves, and archive the submission unchanged (keep original timestamps) in the private case folder.

## Verification

```bash
bash scripts/verify-submission.sh <CANDIDATE_FOLDER_PATH>
```

(npm alias: `npm run verify:submission -- <CANDIDATE_FOLDER_PATH>`.)

What it does:

1. Clones the canonical repo fresh (`https://github.com/wtfup/fullstack-developer-assessment.git`) into a temp directory.
2. Overlays **only** these paths from the candidate folder: `part1/server`, `part1/sql`, `part1/web`, `part2/app`, `part2/submission` — missing paths are reported and the suites judge them as-is.
3. Starts the lab and runs `npm run db:reset`, then `npm run test:part1`, `npm run test:part1:e2e`, `npm run test:part2`, `npm run test:part2:e2e` inside the `tools` container.
4. Prints each suite's output; any non-green section is a gap to record. The temp workdir is kept for inspection.

Notes:

- Requires network + git + Docker on the supervisor machine; verification only works once the assessment repo is published at the URL above.
- **Candidate test edits are ignored by construction** — the fresh clone's canonical tests, configs, and seed are what run. Review the candidate's folder separately only for integrity scanning.
- Repeatability: run the whole sequence twice back-to-back; verdicts must match, and suites must not need manual cleanup between runs.
- Summarize results as RED/GREEN per suite; scores come from the internal rubric, not from this script alone.

## Scoring privacy

- The detailed rubric, reference implementations, receipts, and manifests are private grading material — never share them with candidates and never store them inside the repo.
- Assign scores with the internal rubric against the recorded evidence; communicate outcomes only through the hiring process, not as raw scores or rubric details.
- Keep measurement fixtures out of candidate-facing channels: no scorecards or private receipts in the candidate submission folder.

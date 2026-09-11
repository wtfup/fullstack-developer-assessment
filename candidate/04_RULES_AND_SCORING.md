# Rules and Scoring

These rules apply to the whole assessment day. Integrity violations can void your submission; everything else costs you time or points.

## Integrity

- **Part 1 — Craft** is closed-book: no AI tools, no Internet, no help from other people. The supervisor disables the machine's network and AI access before the part starts.
- **Part 2 — Leverage** expects AI: use the tools you would use on the job. Honest disclosure in `AI_USAGE.md` is part of the deliverable — an inaccurate or fabricated account undermines the assessment and is treated as an integrity issue.
- **Never edit** `tests/**`, `lab/**`, `scripts/**`, `part1/seed/**`, `part2/seed/**`, the Playwright configs, or `package.json`. Verification overlays only your solution paths and ignores everything else; tampering is an integrity violation.
- Do not bypass the lab guard rails (lab database only, isolated schemas), and do not try to locate or access grading material or any path outside the repository. Work only inside the repo.
- The work must be yours: no pre-written solutions, no sharing or receiving live solutions.

## Time discipline

- Part 1 — Craft: ~150 minutes. Part 2 — Leverage: ~120 minutes. Your supervisor keeps the official clock.
- Record session markers: `npm run session -- start <part>` when you begin and `npm run session -- end <part>` when time is called. These markers are the timing evidence.
- Pauses happen between parts, at the supervisor's discretion. A genuine mid-part interruption is recorded with `npm run session -- note <part> "…"`.
- Timebox deliberately: a partially finished, clean, verifiable submission beats an unfinished sprawl.

## Environment

- All commands run inside the lab's `tools` container (convention in `00_START_HERE.md`); `npm run lab:*` run on the host.
- Keep the lab up for the whole session; do not rebuild, prune, or reconfigure Docker during the assessment.
- No new dependencies, frameworks, or CDN assets; the frontend must stay dependency-free.
- Part 1 has no network; Part 2 has network access for your AI tools. Do not attempt network use in Part 1.

## Disclosure

- Leverage: complete `part2/submission/AI_USAGE.md` honestly — which tools, for what, and what you verified.
- Report blockers or environment problems to your supervisor immediately, and record them with `npm run session -- note`.
- If you realize you broke a rule, say so — self-disclosure is treated far better than discovery.

## How you are scored (high level)

| Dimension | Weight | What it covers |
|---|---|---|
| Correctness | 40 | Delivered behavior matches the specs; no regressions in untouched behavior. |
| Acceptance tests | 20 | Canonical suites reach and stay GREEN in supervised re-verification. |
| Diagnosis + verification | 20 | Symptoms reproduced before fixing; fixes proven with evidence; claims verified, not trusted. |
| Code quality | 10 | Readable, consistent, appropriately simple; no dead code or hacks. |
| Handover | 10 | The submission docs are honest, precise, and useful to a next engineer. |

The detailed rubric is internal and not published; the weights above are the only published summary.

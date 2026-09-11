#!/usr/bin/env bash
# Supervisory verification: run a candidate submission against the CANONICAL tests.
# Usage: bash scripts/verify-submission.sh <path-to-candidate-folder>
# Requires: network + git + docker on the supervisor machine. Candidate test edits are ignored.
set -euo pipefail

CANDIDATE="${1:?usage: verify-submission.sh <path-to-candidate-folder>}"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/fsa-verify.XXXXXX")"
cleanup() { docker compose -f "$WORK/lab/compose.yaml" down >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "== Cloning canonical repo into $WORK"
git clone --quiet https://github.com/wtfup/fullstack-developer-assessment.git "$WORK"

echo "== Overlaying candidate solution paths"
for p in part1/server part1/sql part1/web part2/app part2/submission; do
  src="$CANDIDATE/$p"
  if [ -d "$src" ]; then
    rm -rf "$WORK/$p"
    mkdir -p "$(dirname "$WORK/$p")"
    cp -R "$src" "$WORK/$p"
    echo "   copied $p"
  else
    echo "   MISSING $p (suite will judge it)"
  fi
done

cd "$WORK"
echo "== Starting lab"
docker compose -f lab/compose.yaml up -d --wait
docker compose -f lab/compose.yaml exec -T tools bash -lc 'npm run db:reset'

for c in test:part1 test:part1:e2e test:part2 test:part2:e2e; do
  echo ""
  echo "===== npm run $c ====="
  docker compose -f lab/compose.yaml exec -T tools bash -lc "npm run $c" || true
done

echo ""
echo "== Verification finished. Any non-green section above is a gap."
echo "== Workdir kept for inspection: $WORK"

#!/usr/bin/env bash
# Push data/seen.json to branch avito-bot-state (durable between Actions runs).
set -euo pipefail

STATE_FILE="${1:-data/seen.json}"
test -f "$STATE_FILE" || { echo "missing $STATE_FILE"; exit 1; }
test -n "${GITHUB_TOKEN:-}" || { echo "GITHUB_TOKEN unset — skip push"; exit 0; }
test -n "${GITHUB_REPOSITORY:-}" || { echo "GITHUB_REPOSITORY unset — skip push"; exit 0; }

WORK=$(mktemp -d)
cp "$STATE_FILE" "$WORK/seen.json"
cd "$WORK"
git init -q
git config user.name "avito-tg-notifier"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git checkout -b avito-bot-state
git add seen.json
git commit -m "state $(date -u +%Y-%m-%dT%H:%MZ)" >/dev/null
git remote add origin "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
git push -f origin avito-bot-state >/dev/null
echo "State pushed to avito-bot-state ($(wc -c < seen.json) bytes)"

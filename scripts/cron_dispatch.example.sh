#!/usr/bin/env bash
# Пример для внешнего cron каждые 2 минуты.
# Подставьте classic PAT (repo + workflow) вместо YOUR_GITHUB_PAT.

set -euo pipefail

TOKEN="${GITHUB_PAT:-YOUR_GITHUB_PAT}"
REPO="kimilyaeduardovich-wq/avito-tg-notifier"

# Вариант A: workflow_dispatch
curl -sS -o /tmp/avito_dispatch_body.txt -w "%{http_code}\n" -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/${REPO}/actions/workflows/poll.yml/dispatches" \
  -d '{"ref":"main","inputs":{"mode":"once"}}'

# Вариант B (раскомментируйте вместо A): repository_dispatch
# curl -sS -o /tmp/avito_dispatch_body.txt -w "%{http_code}\n" -X POST \
#   -H "Accept: application/vnd.github+json" \
#   -H "Authorization: Bearer ${TOKEN}" \
#   -H "X-GitHub-Api-Version: 2022-11-28" \
#   -H "Content-Type: application/json" \
#   "https://api.github.com/repos/${REPO}/dispatches" \
#   -d '{"event_type":"avito-poll","client_payload":{"source":"external-cron"}}'

cat /tmp/avito_dispatch_body.txt 2>/dev/null || true

#!/usr/bin/env bash
# Пример тела для cron-job.org (каждые 2 минуты, POST JSON).
# Вставьте свой GitHub PAT (classic: repo + workflow) в Authorization.

# URL:
# https://api.github.com/repos/kimilyaeduardovich-wq/avito-tg-notifier/actions/workflows/poll.yml/dispatches

curl -sS -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_GITHUB_PAT" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -H "Content-Type: application/json" \
  https://api.github.com/repos/kimilyaeduardovich-wq/avito-tg-notifier/actions/workflows/poll.yml/dispatches \
  -d '{"ref":"main"}'

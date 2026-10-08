# Внешний cron каждые 2 минуты (cron-job.org)

GitHub `schedule` — минимум ~5 минут и часто запаздывает. Для **каждые 2 минуты**:

1. Создайте бесплатный аккаунт на https://cron-job.org
2. Create cronjob:
   - Title: `avito-tg-notifier`
   - URL: `https://api.github.com/repos/OWNER/avito-tg-notifier/actions/workflows/poll.yml/dispatches`
   - Schedule: every **2 minutes**
   - Request method: **POST**
   - Headers:
     - `Accept: application/vnd.github+json`
     - `Authorization: Bearer YOUR_GITHUB_PAT`
     - `X-GitHub-Api-Version: 2022-11-28`
     - `Content-Type: application/json`
   - Body: `{"ref":"main"}`

PAT нужен с правом `actions:write` (classic: `workflow` + `repo`).

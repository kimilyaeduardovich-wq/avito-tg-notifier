# Как работает 24/7 без Mac (текущая схема)

## Основной режим (уже в репозитории)

GitHub Actions запускает **loop**: опрос обоих аккаунтов Авито **каждые 2 минуты** ~45 минут,
затем **сам ставит следующий loop** (`repository_dispatch` + секрет `GH_DISPATCH_TOKEN`).

Запасной watchdog: `schedule` в `:00` и `:30` UTC — если цепочка оборвалась, поднимает снова.

Состояние (`bootstrapped`, seen ids) хранится в ветке **`avito-bot-state`**, пушится после каждого цикла — повторный bootstrap не глотает алерты.

Mac не нужен.

## Опционально: внешний cron каждые 2 минуты

Не обязателен при self-chain. Если хотите дублирующий kick:

1. [cron-job.org](https://console.cron-job.org) → Create cronjob
2. URL: `https://api.github.com/repos/kimilyaeduardovich-wq/avito-tg-notifier/dispatches`
3. POST каждые 2 минуты, headers:
   - `Accept: application/vnd.github+json`
   - `Authorization: Bearer <PAT repo+workflow>`
   - `Content-Type: application/json`
4. Body: `{"event_type":"avito-poll-loop"}`

Concurrency-группа `avito-poll` не даст двум loop бежать параллельно.

## Проверка

1. Actions → workflow *Avito poll → Telegram* — runs с event `repository_dispatch` / `schedule` / `workflow_dispatch`
2. В логах: `bootstrapped=True`, `cycle=N Done notified=…` (не `bootstrap: remembered` на каждом запуске)
3. Новое входящее на Авито → в группе TG «🔔 Новое сообщение на Авито»

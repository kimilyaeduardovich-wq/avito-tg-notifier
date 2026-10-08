# Avito → Telegram notifier

Связка: **Avito Messenger webhook → FastAPI → Telegram Bot API**.  
При новом входящем сообщении на Авито бот шлёт уведомление в ваш чат со ссылкой на диалог.

## Быстрый старт

```bash
cd ~/Projects/avito-tg-notifier
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# заполните .env
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Что нужно в `.env`

| Переменная | Откуда |
|---|---|
| `TG_BOT_TOKEN` | `@BotFather` → `/newbot` |
| `TG_CHAT_ID` | `@userinfobot` / `@myidbot` после `/start` у бота |
| `AVITO_CLIENT_ID` / `AVITO_CLIENT_SECRET` | [Авито для разработчиков](https://www.avito.ru/professionals/api), право «Сообщения» |
| `AVITO_USER_ID` | ваш user id в кабинете API (чтобы отсекать свои исходящие) |
| `PUBLIC_BASE_URL` | публичный HTTPS URL сервера (Render / ngrok / Cloudflare Tunnel) |
| `WEBHOOK_SECRET` | опционально, `?token=` на вебхуке |

## Регистрация вебхука Авито

Сервер должен быть доступен по HTTPS, затем:

```bash
python -m scripts.get_token          # проверка OAuth
python -m scripts.register_webhook   # POST /messenger/v3/webhook
```

Эквивалент curl:

```bash
curl -X POST "https://api.avito.ru/messenger/v3/webhook" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR_HOST/webhook/avito"}'
```

## Деплой

- **Render / Railway** — Web Service, start command:  
  `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Локально для теста:** `uvicorn ... --port 8000` + `ngrok http 8000`

Healthcheck: `GET /` → `{"status":"ok"}`.

## Несколько аккаунтов Авито → одна группа

В `.env` можно завести `ACCOUNT_1_*`, `ACCOUNT_2_*` …
У каждого — свой Telegram-бот и ключи Авито, `TG_CHAT_ID` общий.
Оба бота должны быть добавлены в одну группу (админами).

## Стабильный бесплатный режим (без Mac)

GitHub Actions опрашивает Авито **каждые 5 минут** и шлёт уведомления в Telegram.
Mac не нужен: workflow в облаке GitHub.

- файл: `.github/workflows/poll.yml`
- ручной запуск: Actions → *Avito poll → Telegram* → Run workflow
- локально один цикл: `python -m scripts.run_once`

## Локальный poller (запасной)

```bash
source .venv/bin/activate
python -m scripts.run_poller
```

Только пока Mac включён. Для 24/7 используйте GitHub Actions.

## Важно про подписку Авито

Без тарифа **«API мессенджера»** Авито отдаёт заглушку вместо текста сообщений.
Webhook тоже не поможет, пока подписка не активна.

Бесплатная альтернатива — оповещения на почту + IMAP-парсер (можно добавить отдельно).

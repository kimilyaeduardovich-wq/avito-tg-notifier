"""Проверка доставки в Telegram (оба бота)."""

from __future__ import annotations

import asyncio
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config import load_accounts
from app.telegram import send_telegram_alert


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    accounts = load_accounts()
    if not accounts:
        raise SystemExit("No accounts")
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")
    for a in accounts:
        a.require()
        text = (
            f"✅ <b>Тест связи Avito→TG</b>\n"
            f"🏪 {a.name}\n"
            f"⏱ {ts}\n"
            f"Если видите это — бот пишет в группу."
        )
        await send_telegram_alert(text, bot_token=a.tg_bot_token, chat_id=a.tg_chat_id)
        logging.info("test alert sent via %s", a.name)


if __name__ == "__main__":
    asyncio.run(main())

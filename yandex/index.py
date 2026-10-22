"""Yandex Cloud Function: опрос Авито → Telegram.

Таймер YC умеет минимум раз в минуту, поэтому внутри одного вызова
делаем несколько раундов с паузой (POLL_ROUNDS × POLL_EVERY_SEC),
чтобы задержка уведомления была ~20–30 с, а не до минуты.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time

from app.config import load_accounts
from app.poller import process_once
from app.state import load_state, save_state

logging.getLogger().setLevel(logging.INFO)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("botocore").setLevel(logging.WARNING)


def handler(event, context):
    accounts = load_accounts()
    if not accounts:
        raise RuntimeError("No accounts configured")

    rounds = max(1, int(os.environ.get("POLL_ROUNDS", "3")))
    every = max(5, int(os.environ.get("POLL_EVERY_SEC", "20")))

    totals = {"notified": 0, "bootstrap": 0}
    for i in range(rounds):
        state = asyncio.run(process_once(load_state(), accounts))
        save_state(state)
        last = state.get("_last_totals") or {}
        totals["notified"] += int(last.get("notified") or 0)
        totals["bootstrap"] += int(last.get("bootstrap") or 0)
        logging.info(
            "round %s/%s notified=%s bootstrap=%s",
            i + 1,
            rounds,
            last.get("notified"),
            last.get("bootstrap"),
        )
        if i + 1 < rounds:
            time.sleep(every)

    logging.info("done notified=%s bootstrap=%s", totals["notified"], totals["bootstrap"])
    return {"statusCode": 200, "body": totals}

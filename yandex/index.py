"""Yandex Cloud Function: один цикл опроса Авито → Telegram на каждый вызов таймера."""

from __future__ import annotations

import asyncio
import logging

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
    state = asyncio.run(process_once(load_state(), accounts))
    save_state(state)
    totals = state.get("_last_totals") or {}
    logging.info("done notified=%s bootstrap=%s", totals.get("notified"), totals.get("bootstrap"))
    return {"statusCode": 200, "body": totals}

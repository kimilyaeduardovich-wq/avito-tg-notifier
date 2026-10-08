"""Опциональный FastAPI (health / будущие webhook). Основной режим — poller."""

from typing import Any

from fastapi import FastAPI

from app.config import load_accounts

app = FastAPI(title="Avito → Telegram notifier", version="0.2.0")


@app.get("/")
async def health() -> dict[str, Any]:
    accounts = load_accounts()
    return {
        "status": "ok",
        "service": "avito-tg-notifier",
        "accounts": [a.name for a in accounts],
    }

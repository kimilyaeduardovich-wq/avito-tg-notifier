"""Регистрация webhook (если появится публичный URL)."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.avito import list_subscriptions, register_webhook
from app.config import load_accounts, settings


def build_webhook_url(account_id: str) -> str:
    if not settings.public_base_url:
        raise SystemExit("Set PUBLIC_BASE_URL in .env")
    url = f"{settings.public_base_url}/webhook/avito/{account_id}"
    if settings.webhook_secret:
        url = f"{url}?token={settings.webhook_secret}"
    return url


async def main() -> None:
    for account in load_accounts():
        webhook_url = build_webhook_url(account.id)
        print(f"[{account.name}] Registering: {webhook_url}")
        result = await register_webhook(account, webhook_url)
        print("  response:", result)
        print("  subscriptions:", await list_subscriptions(account))


if __name__ == "__main__":
    asyncio.run(main())

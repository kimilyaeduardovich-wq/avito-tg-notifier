"""Проверка OAuth для всех аккаунтов: python -m scripts.get_token"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.avito import get_access_token, resolve_avito_user_id
from app.config import load_accounts


async def main() -> None:
    accounts = load_accounts()
    if not accounts:
        raise SystemExit("No accounts in .env")
    for account in accounts:
        token = await get_access_token(account)
        uid = account.avito_user_id or await resolve_avito_user_id(account)
        print(f"{account.name}: token OK, user_id={uid}")


if __name__ == "__main__":
    asyncio.run(main())

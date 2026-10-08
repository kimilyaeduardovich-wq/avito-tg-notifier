"""Один цикл polling (для GitHub Actions / cron)."""

from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config import load_accounts
from app.poller import process_once
from app.state import load_state, save_state


async def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    accounts = load_accounts()
    if not accounts:
        raise SystemExit("No accounts configured")
    for a in accounts:
        a.require()
        logging.info("Account: %s", a.name)

    state = load_state()
    await process_once(state, accounts)
    save_state(state)
    logging.info("Done")


if __name__ == "__main__":
    asyncio.run(main())

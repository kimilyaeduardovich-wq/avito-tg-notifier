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
        force=True,
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    log = logging.getLogger("run_once")

    accounts = load_accounts()
    if not accounts:
        raise SystemExit("No accounts configured")
    for a in accounts:
        a.require()
        log.info("Account: %s (user_id=%s)", a.name, a.avito_user_id)

    state = load_state()
    for a in accounts:
        acct = (state.get("accounts") or {}).get(a.id) or {}
        log.info(
            "State %s: bootstrapped=%s seen=%s chats_tracked=%s",
            a.id,
            bool(acct.get("bootstrapped")),
            len(acct.get("seen_message_ids") or []),
            len(acct.get("chat_updated") or {}),
        )

    state = await process_once(state, accounts)
    save_state(state)
    totals = state.get("_last_totals") or {}
    log.info(
        "Done notified=%s bootstrap_msgs=%s",
        totals.get("notified"),
        totals.get("bootstrap"),
    )


if __name__ == "__main__":
    asyncio.run(main())

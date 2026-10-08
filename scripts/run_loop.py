"""Несколько циклов polling с интервалом 2 минуты (для GitHub Actions)."""

from __future__ import annotations

import asyncio
import logging
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config import load_accounts
from app.poller import process_once
from app.state import load_state, save_state

INTERVAL_SEC = int(os.environ.get("POLL_INTERVAL_SEC", "120"))
DURATION_SEC = int(os.environ.get("POLL_LOOP_DURATION_SEC", "2700"))  # ~45 мин


def _push_state() -> None:
    script = ROOT / "scripts" / "push_state.sh"
    if not script.exists():
        return
    if not os.environ.get("GITHUB_TOKEN") or not os.environ.get("GITHUB_REPOSITORY"):
        return
    try:
        subprocess.run(
            ["bash", str(script), str(ROOT / "data" / "seen.json")],
            check=False,
            cwd=str(ROOT),
            timeout=60,
        )
    except Exception:
        logging.getLogger("run_loop").exception("state push failed")


async def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        force=True,
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    log = logging.getLogger("run_loop")

    accounts = load_accounts()
    if not accounts:
        raise SystemExit("No accounts configured")
    for a in accounts:
        a.require()
        log.info("Account: %s (user_id=%s)", a.name, a.avito_user_id)

    state = load_state()
    started = time.monotonic()
    cycle = 0
    total_notified = 0

    log.info(
        "Loop start interval=%ss duration=%ss",
        INTERVAL_SEC,
        DURATION_SEC,
    )

    while True:
        cycle += 1
        elapsed = time.monotonic() - started
        if elapsed >= DURATION_SEC and cycle > 1:
            break

        for a in accounts:
            acct = (state.get("accounts") or {}).get(a.id) or {}
            log.info(
                "cycle=%s State %s: bootstrapped=%s seen=%s chats=%s",
                cycle,
                a.id,
                bool(acct.get("bootstrapped")),
                len(acct.get("seen_message_ids") or []),
                len(acct.get("chat_updated") or {}),
            )

        try:
            state = await process_once(state, accounts)
            save_state(state)
            totals = state.get("_last_totals") or {}
            notified = int(totals.get("notified") or 0)
            total_notified += notified
            log.info(
                "cycle=%s Done notified=%s bootstrap=%s",
                cycle,
                notified,
                totals.get("bootstrap"),
            )
        except Exception:
            log.exception("cycle=%s failed", cycle)
            save_state(state)

        _push_state()

        elapsed = time.monotonic() - started
        if elapsed + INTERVAL_SEC >= DURATION_SEC:
            break
        log.info("sleep %ss", INTERVAL_SEC)
        await asyncio.sleep(INTERVAL_SEC)

    log.info("Loop finished cycles=%s total_notified=%s", cycle, total_notified)


if __name__ == "__main__":
    asyncio.run(main())

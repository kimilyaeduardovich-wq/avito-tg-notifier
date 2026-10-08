from __future__ import annotations

import json
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
STATE_FILE = DATA_DIR / "seen.json"


def load_state() -> dict[str, Any]:
    """
    Формат:
    {
      "accounts": {
        "account_1": {"seen_message_ids": [...], "bootstrapped": true},
        "account_2": {...}
      }
    }
    Старый плоский формат мигрируется в account_1.
    """
    empty = {"accounts": {}}
    if not STATE_FILE.exists():
        return empty
    try:
        data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return empty

    if "accounts" in data and isinstance(data["accounts"], dict):
        return data

    # migrate legacy
    return {
        "accounts": {
            "account_1": {
                "seen_message_ids": list(data.get("seen_message_ids") or []),
                "bootstrapped": bool(data.get("bootstrapped")),
            }
        }
    }


def account_state(state: dict[str, Any], account_id: str) -> dict[str, Any]:
    accounts = state.setdefault("accounts", {})
    if account_id not in accounts:
        accounts[account_id] = {"seen_message_ids": [], "bootstrapped": False}
    acct = accounts[account_id]
    acct.setdefault("seen_message_ids", [])
    acct.setdefault("bootstrapped", False)
    return acct


def save_state(state: dict[str, Any]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    cleaned: dict[str, Any] = {"accounts": {}}
    for account_id, acct in (state.get("accounts") or {}).items():
        ids = list(dict.fromkeys(acct.get("seen_message_ids") or []))[-5000:]
        cleaned["accounts"][account_id] = {
            "seen_message_ids": ids,
            "bootstrapped": bool(acct.get("bootstrapped")),
        }
    STATE_FILE.write_text(json.dumps(cleaned, ensure_ascii=False, indent=2), encoding="utf-8")

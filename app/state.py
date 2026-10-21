from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
STATE_FILE = DATA_DIR / "seen.json"

# Yandex Object Storage (S3 API): задаётся в облачной функции, локально пусто → файл.
S3_BUCKET = os.getenv("STATE_S3_BUCKET", "").strip()
S3_KEY = os.getenv("STATE_S3_KEY", "seen.json").strip()
S3_ENDPOINT = os.getenv("STATE_S3_ENDPOINT", "https://storage.yandexcloud.net").strip()


def _s3():
    import boto3

    return boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT,
        region_name="ru-central1",
        aws_access_key_id=os.environ["STATE_S3_ACCESS_KEY"],
        aws_secret_access_key=os.environ["STATE_S3_SECRET_KEY"],
    )


def _read_raw() -> str | None:
    if S3_BUCKET:
        client = _s3()
        try:
            obj = client.get_object(Bucket=S3_BUCKET, Key=S3_KEY)
        except client.exceptions.NoSuchKey:
            return None
        return obj["Body"].read().decode("utf-8")
    if not STATE_FILE.exists():
        return None
    return STATE_FILE.read_text(encoding="utf-8")


def _write_raw(text: str) -> None:
    if S3_BUCKET:
        _s3().put_object(
            Bucket=S3_BUCKET,
            Key=S3_KEY,
            Body=text.encode("utf-8"),
            ContentType="application/json",
        )
        return
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(text, encoding="utf-8")


def load_state() -> dict[str, Any]:
    """
    Формат:
    {
      "accounts": {
        "account_1": {
          "seen_message_ids": [...],
          "bootstrapped": true,
          "chat_updated": {"chat_id": 1234567890}
        }
      }
    }
    """
    empty: dict[str, Any] = {"accounts": {}}
    raw = _read_raw()
    if raw is None:
        return empty
    try:
        data = json.loads(raw)
    except Exception:
        return empty

    if "accounts" in data and isinstance(data["accounts"], dict):
        global _last_fingerprint
        _last_fingerprint = _fingerprint(data)
        return data

    return {
        "accounts": {
            "account_1": {
                "seen_message_ids": list(data.get("seen_message_ids") or []),
                "bootstrapped": bool(data.get("bootstrapped")),
                "chat_updated": {},
            }
        }
    }


def account_state(state: dict[str, Any], account_id: str) -> dict[str, Any]:
    accounts = state.setdefault("accounts", {})
    if account_id not in accounts:
        accounts[account_id] = {
            "seen_message_ids": [],
            "bootstrapped": False,
            "chat_updated": {},
        }
    acct = accounts[account_id]
    acct.setdefault("seen_message_ids", [])
    acct.setdefault("bootstrapped", False)
    acct.setdefault("chat_updated", {})
    return acct


def save_state(state: dict[str, Any]) -> None:
    cleaned: dict[str, Any] = {"accounts": {}}
    for account_id, acct in (state.get("accounts") or {}).items():
        ids = list(dict.fromkeys(acct.get("seen_message_ids") or []))[-5000:]
        chat_updated = acct.get("chat_updated") or {}
        # хвост по чатам
        if len(chat_updated) > 2000:
            items = sorted(chat_updated.items(), key=lambda kv: int(kv[1] or 0))[-2000:]
            chat_updated = dict(items)
        cleaned["accounts"][account_id] = {
            "seen_message_ids": ids,
            "bootstrapped": bool(acct.get("bootstrapped")),
            "chat_updated": chat_updated,
        }
    global _last_fingerprint
    fingerprint = _fingerprint(cleaned)
    if fingerprint == _last_fingerprint:
        return
    _write_raw(json.dumps(cleaned, ensure_ascii=False, indent=2))
    _last_fingerprint = fingerprint


_last_fingerprint: str | None = None


def _fingerprint(state: dict[str, Any]) -> str:
    """Порядок seen_message_ids берётся из set и меняется между процессами — сравниваем без него."""
    canon = {
        account_id: {
            "seen": sorted(map(str, acct.get("seen_message_ids") or [])),
            "bootstrapped": bool(acct.get("bootstrapped")),
            "chat_updated": sorted((acct.get("chat_updated") or {}).items()),
        }
        for account_id, acct in (state.get("accounts") or {}).items()
    }
    return json.dumps(canon, sort_keys=True)

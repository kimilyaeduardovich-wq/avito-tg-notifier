"""
Polling нескольких аккаунтов Авито → Telegram.
Уведомление о новом входящем (без текста сообщения).
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import httpx

from app.avito import HTTP_TIMEOUT, get_access_token, with_retries
from app.config import Account, load_accounts
from app.state import account_state, load_state, save_state
from app.telegram import send_telegram_alert

logger = logging.getLogger(__name__)

POLL_INTERVAL_SEC = 20
CHATS_LIMIT = 50


async def list_chats(
    client: httpx.AsyncClient,
    token: str,
    user_id: str,
    *,
    unread_only: bool = False,
) -> list[dict[str, Any]]:
    url = f"https://api.avito.ru/messenger/v2/accounts/{user_id}/chats"
    response = await client.get(
        url,
        headers={"Authorization": f"Bearer {token}"},
        params={
            "unread_only": "true" if unread_only else "false",
            "chat_types": "u2i",
            "limit": CHATS_LIMIT,
        },
    )
    response.raise_for_status()
    return list((response.json() or {}).get("chats") or [])


async def list_chats_retry(
    token: str,
    user_id: str,
    account_name: str,
    *,
    unread_only: bool = False,
) -> list[dict[str, Any]]:
    label = f"[{account_name}] chats" + (" unread" if unread_only else "")

    async def _fetch() -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            return await list_chats(client, token, user_id, unread_only=unread_only)

    return await with_retries(label, _fetch)


def _buyer_name(chat: dict[str, Any], avito_user_id: str) -> str:
    for user in chat.get("users") or []:
        if str(user.get("id")) != str(avito_user_id):
            return str(user.get("name") or "Клиент")
    return "Клиент"


def _item_title(chat: dict[str, Any]) -> str:
    value = ((chat.get("context") or {}).get("value") or {})
    return str(value.get("title") or "")


def _escape(text: str) -> str:
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _is_outgoing(last: dict[str, Any], avito_user_id: str) -> bool:
    author_id = last.get("author_id")
    direction = last.get("direction")
    if direction == "out":
        return True
    if author_id is not None and str(author_id) == str(avito_user_id):
        return True
    return False


def _format_alert(alert: dict[str, Any], account_name: str) -> str:
    lines = [
        "🔔 <b>Новое сообщение на Авито</b>",
        f"🏪 {_escape(account_name)}",
        "",
        f"👤 {_escape(alert['buyer'])}",
    ]
    if alert.get("item"):
        lines.append(f"📦 {_escape(alert['item'])}")
    lines.extend(
        [
            "",
            f'<a href="https://www.avito.ru/profile/messenger/channel/{alert["chat_id"]}">'
            "Открыть чат</a>",
        ]
    )
    return "\n".join(lines)


def _merge_chats(*groups: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_id: dict[str, dict[str, Any]] = {}
    for group in groups:
        for chat in group:
            cid = str(chat.get("id") or "")
            if not cid:
                continue
            prev = by_id.get(cid)
            if not prev or int(chat.get("updated") or 0) >= int(prev.get("updated") or 0):
                by_id[cid] = chat
    return list(by_id.values())


async def process_account(account: Account, state: dict[str, Any]) -> dict[str, int]:
    account.require()
    acct = account_state(state, account.id)
    seen = set(acct.get("seen_message_ids") or [])
    chat_updated: dict[str, int] = {
        str(k): int(v) for k, v in (acct.get("chat_updated") or {}).items()
    }
    bootstrapped = bool(acct.get("bootstrapped"))
    stats = {"chats": 0, "new_in": 0, "new_out": 0, "notified": 0, "bootstrap": 0}

    token = await get_access_token(account)
    chats_all = await list_chats_retry(token, account.avito_user_id, account.name)
    try:
        chats_unread = await list_chats_retry(
            token, account.avito_user_id, account.name, unread_only=True
        )
    except Exception:
        logger.exception("[%s] unread chats fetch failed", account.name)
        chats_unread = []

    chats = _merge_chats(chats_all, chats_unread)
    stats["chats"] = len(chats)
    unread_ids = {str(c.get("id") or "") for c in chats_unread if c.get("id")}

    new_ids: list[str] = []
    alerts: list[dict[str, Any]] = []

    for chat in chats:
        chat_id = str(chat.get("id") or "")
        last = chat.get("last_message") or {}
        if not chat_id or not last:
            continue

        msg_id = str(last.get("id") or "")
        updated = int(chat.get("updated") or 0)
        prev_updated = int(chat_updated.get(chat_id) or 0)
        outgoing = _is_outgoing(last, account.avito_user_id)

        # Обновляем метку времени чата всегда после обработки
        if updated:
            chat_updated[chat_id] = max(prev_updated, updated)

        if not msg_id:
            continue

        is_new_msg = msg_id not in seen
        chat_bumped = bool(updated and updated > prev_updated and prev_updated > 0)

        if is_new_msg:
            new_ids.append(msg_id)
            if outgoing:
                stats["new_out"] += 1
            else:
                stats["new_in"] += 1

        # Входящее новое last_message
        should_alert = False
        if is_new_msg and not outgoing:
            should_alert = True
        # Чат в unread_only и last входящий (даже если id уже видели с race) —
        # обычно id новый; дополнительная страховка по bump
        elif chat_id in unread_ids and not outgoing and (is_new_msg or chat_bumped):
            should_alert = True

        if should_alert:
            # дедуп алертов по msg_id в этом цикле
            if any(a["id"] == msg_id for a in alerts):
                continue
            alerts.append(
                {
                    "id": msg_id,
                    "chat_id": chat_id,
                    "buyer": _buyer_name(chat, account.avito_user_id),
                    "item": _item_title(chat),
                }
            )

    if not bootstrapped:
        for chat in chats:
            last = chat.get("last_message") or {}
            mid = str(last.get("id") or "")
            if mid:
                seen.add(mid)
            cid = str(chat.get("id") or "")
            upd = int(chat.get("updated") or 0)
            if cid and upd:
                chat_updated[cid] = upd
        acct["seen_message_ids"] = list(seen)
        acct["chat_updated"] = chat_updated
        acct["bootstrapped"] = True
        stats["bootstrap"] = len(seen)
        logger.info(
            "[%s] bootstrap: remembered %s messages / %s chats (no alerts)",
            account.name,
            len(seen),
            len(chat_updated),
        )
        return stats

    for alert in reversed(alerts):
        try:
            await send_telegram_alert(
                _format_alert(alert, account.name),
                bot_token=account.tg_bot_token,
                chat_id=account.tg_chat_id,
            )
            logger.info(
                "[%s] notify chat=%s buyer=%s",
                account.name,
                alert["chat_id"],
                alert["buyer"],
            )
            seen.add(alert["id"])
            stats["notified"] += 1
        except Exception:
            logger.exception("[%s] Telegram send failed for %s", account.name, alert["id"])

    for msg_id in new_ids:
        seen.add(msg_id)

    acct["seen_message_ids"] = list(seen)
    acct["chat_updated"] = chat_updated
    acct["bootstrapped"] = True
    logger.info(
        "[%s] cycle chats=%s new_in=%s new_out=%s notified=%s",
        account.name,
        stats["chats"],
        stats["new_in"],
        stats["new_out"],
        stats["notified"],
    )
    return stats


async def process_once(state: dict[str, Any], accounts: list[Account]) -> dict[str, Any]:
    totals = {"notified": 0, "bootstrap": 0}
    for account in accounts:
        try:
            stats = await process_account(account, state)
            totals["notified"] += int(stats.get("notified") or 0)
            totals["bootstrap"] += int(stats.get("bootstrap") or 0)
        except Exception:
            logger.exception("[%s] poll cycle failed", account.name)
    save_state(state)
    state["_last_totals"] = totals
    return state


async def run_forever(interval: int = POLL_INTERVAL_SEC) -> None:
    accounts = load_accounts()
    if not accounts:
        raise RuntimeError("No accounts configured in .env")
    for a in accounts:
        a.require()
        logger.info("Account ready: %s → chat %s", a.name, a.tg_chat_id)

    state = load_state()
    logger.info("Poller started (%s accounts, interval=%ss)", len(accounts), interval)
    while True:
        try:
            state = await process_once(state, accounts)
        except Exception:
            logger.exception("Poll cycle failed")
        await asyncio.sleep(interval)


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    asyncio.run(run_forever())


if __name__ == "__main__":
    main()

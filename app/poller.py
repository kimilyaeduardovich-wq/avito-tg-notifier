"""
Polling нескольких аккаунтов Авито → каждый со своим Telegram-ботом в одну группу.
Уведомление: «пришло новое входящее» (без текста сообщения).
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
) -> list[dict[str, Any]]:
    url = f"https://api.avito.ru/messenger/v2/accounts/{user_id}/chats"
    response = await client.get(
        url,
        headers={"Authorization": f"Bearer {token}"},
        params={
            "unread_only": "false",
            "chat_types": "u2i",
            "limit": CHATS_LIMIT,
        },
    )
    response.raise_for_status()
    return list((response.json() or {}).get("chats") or [])


async def list_chats_retry(token: str, user_id: str, account_name: str) -> list[dict[str, Any]]:
    async def _fetch() -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            return await list_chats(client, token, user_id)

    return await with_retries(f"[{account_name}] chats", _fetch)


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


async def process_account(account: Account, state: dict[str, Any]) -> None:
    account.require()
    acct = account_state(state, account.id)
    seen = set(acct.get("seen_message_ids") or [])
    bootstrapped = bool(acct.get("bootstrapped"))
    new_ids: list[str] = []
    alerts: list[dict[str, Any]] = []

    token = await get_access_token(account)
    chats = await list_chats_retry(token, account.avito_user_id, account.name)

    for chat in chats:
        chat_id = str(chat.get("id") or "")
        last = chat.get("last_message") or {}
        if not chat_id or not last:
            continue

        msg_id = str(last.get("id") or "")
        if not msg_id or msg_id in seen:
            continue

        new_ids.append(msg_id)
        if _is_outgoing(last, account.avito_user_id):
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
        acct["seen_message_ids"] = list(seen)
        acct["bootstrapped"] = True
        logger.info("[%s] bootstrap: remembered %s messages", account.name, len(seen))
        return

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
        except Exception:
            logger.exception("[%s] Telegram send failed for %s", account.name, alert["id"])

    for msg_id in new_ids:
        seen.add(msg_id)

    acct["seen_message_ids"] = list(seen)
    acct["bootstrapped"] = True


async def process_once(state: dict[str, Any], accounts: list[Account]) -> dict[str, Any]:
    for account in accounts:
        try:
            await process_account(account, state)
        except Exception:
            logger.exception("[%s] poll cycle failed", account.name)
    save_state(state)
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

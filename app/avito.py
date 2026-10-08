"""Avito Messenger API: OAuth + helpers."""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Awaitable, Callable, TypeVar

import httpx

from app.config import Account

logger = logging.getLogger(__name__)

TOKEN_URL = "https://api.avito.ru/token"
WEBHOOK_URL = "https://api.avito.ru/messenger/v3/webhook"
SUBSCRIPTIONS_URL = "https://api.avito.ru/messenger/v1/subscriptions"
UNSUBSCRIBE_URL = "https://api.avito.ru/messenger/v1/webhook/unsubscribe"

HTTP_TIMEOUT = httpx.Timeout(30.0, connect=15.0)
T = TypeVar("T")


async def with_retries(
    label: str,
    fn: Callable[[], Awaitable[T]],
    *,
    attempts: int = 3,
    base_delay: float = 1.5,
) -> T:
    last: Exception | None = None
    for i in range(1, attempts + 1):
        try:
            return await fn()
        except (httpx.TimeoutException, httpx.NetworkError, httpx.RemoteProtocolError) as exc:
            last = exc
            if i >= attempts:
                break
            delay = base_delay * i
            logger.warning("%s transient error (%s), retry in %.1fs", label, type(exc).__name__, delay)
            await asyncio.sleep(delay)
    assert last is not None
    raise last


async def get_access_token(account: Account) -> str:
    account.require()

    async def _fetch() -> str:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            response = await client.post(
                TOKEN_URL,
                data={
                    "grant_type": "client_credentials",
                    "client_id": account.avito_client_id,
                    "client_secret": account.avito_client_secret,
                },
            )
            response.raise_for_status()
            data = response.json()
            token = data.get("access_token")
            if not token:
                raise RuntimeError(f"No access_token in Avito response: {data}")
            return token

    return await with_retries(f"[{account.name}] token", _fetch)


async def register_webhook(account: Account, public_webhook_url: str) -> dict[str, Any]:
    token = await get_access_token(account)
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            WEBHOOK_URL,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={"url": public_webhook_url},
        )
        if response.status_code >= 400:
            logger.error("Webhook register failed: %s", response.text)
            response.raise_for_status()
        return response.json() if response.content else {"status": "ok"}


async def list_subscriptions(account: Account) -> dict[str, Any]:
    token = await get_access_token(account)
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            SUBSCRIPTIONS_URL,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={},
        )
        response.raise_for_status()
        return response.json() if response.content else {}


async def resolve_avito_user_id(account: Account) -> str:
    """GET /core/v1/accounts/self → id"""
    token = await get_access_token(account)
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(
            "https://api.avito.ru/core/v1/accounts/self",
            headers={"Authorization": f"Bearer {token}"},
        )
        response.raise_for_status()
        data = response.json()
        return str(data.get("id") or "")

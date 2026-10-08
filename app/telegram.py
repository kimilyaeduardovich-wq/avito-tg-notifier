import logging

import httpx

logger = logging.getLogger(__name__)


async def send_telegram_alert(text: str, *, bot_token: str, chat_id: str) -> None:
    if not bot_token or not chat_id:
        raise RuntimeError("Telegram bot_token/chat_id required")
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(url, json=payload)
        if response.status_code >= 400:
            logger.error("Telegram error %s: %s", response.status_code, response.text)
            response.raise_for_status()

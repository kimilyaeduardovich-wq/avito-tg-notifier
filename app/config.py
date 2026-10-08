from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(_ROOT / ".env", override=True)


@dataclass(frozen=True)
class Account:
    """Один аккаунт Авито + свой Telegram-бот → общая (или своя) группа."""

    id: str
    name: str
    tg_bot_token: str
    tg_chat_id: str
    avito_client_id: str
    avito_client_secret: str
    avito_user_id: str

    def require(self) -> None:
        missing = [
            label
            for label, value in (
                ("tg_bot_token", self.tg_bot_token),
                ("tg_chat_id", self.tg_chat_id),
                ("avito_client_id", self.avito_client_id),
                ("avito_client_secret", self.avito_client_secret),
                ("avito_user_id", self.avito_user_id),
            )
            if not value
        ]
        if missing:
            raise RuntimeError(f"Account {self.id}: missing {', '.join(missing)}")


def _env(key: str, default: str = "") -> str:
    return os.getenv(key, default).strip()


def load_accounts() -> list[Account]:
    """
    Поддержка нескольких аккаунтов:

      ACCOUNT_1_NAME=SMSTUDIO
      ACCOUNT_1_TG_BOT_TOKEN=...
      ACCOUNT_1_TG_CHAT_ID=-100...   # можно опустить → берётся общий TG_CHAT_ID
      ACCOUNT_1_AVITO_CLIENT_ID=...
      ACCOUNT_1_AVITO_CLIENT_SECRET=...
      ACCOUNT_1_AVITO_USER_ID=...

      ACCOUNT_2_NAME=...
      ...

    Старый формат (один аккаунт) тоже работает: TG_* + AVITO_*.
    """
    default_chat = _env("TG_CHAT_ID")
    accounts: list[Account] = []

    for i in range(1, 21):
        prefix = f"ACCOUNT_{i}_"
        client_id = _env(f"{prefix}AVITO_CLIENT_ID")
        token = _env(f"{prefix}TG_BOT_TOKEN")
        # аккаунт считается заданным, если есть client_id или bot token
        if not client_id and not token:
            continue

        name = _env(f"{prefix}NAME") or f"account-{i}"
        accounts.append(
            Account(
                id=f"account_{i}",
                name=name,
                tg_bot_token=token or _env("TG_BOT_TOKEN"),
                tg_chat_id=_env(f"{prefix}TG_CHAT_ID") or default_chat,
                avito_client_id=client_id,
                avito_client_secret=_env(f"{prefix}AVITO_CLIENT_SECRET"),
                avito_user_id=_env(f"{prefix}AVITO_USER_ID"),
            )
        )

    if accounts:
        return accounts

    # legacy single-account
    if _env("TG_BOT_TOKEN") or _env("AVITO_CLIENT_ID"):
        return [
            Account(
                id="account_1",
                name=_env("ACCOUNT_NAME") or "SMSTUDIO",
                tg_bot_token=_env("TG_BOT_TOKEN"),
                tg_chat_id=default_chat,
                avito_client_id=_env("AVITO_CLIENT_ID"),
                avito_client_secret=_env("AVITO_CLIENT_SECRET"),
                avito_user_id=_env("AVITO_USER_ID"),
            )
        ]

    return []


# Для скриптов webhook / обратной совместимости
@dataclass(frozen=True)
class Settings:
    public_base_url: str
    webhook_secret: str

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            public_base_url=_env("PUBLIC_BASE_URL").rstrip("/"),
            webhook_secret=_env("WEBHOOK_SECRET"),
        )


settings = Settings.from_env()

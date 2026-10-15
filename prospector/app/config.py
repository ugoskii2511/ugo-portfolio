"""Environment configuration. Secrets only ever come from the environment."""

from __future__ import annotations

import os
from dataclasses import dataclass


def _env(name: str, default: str | None = None) -> str | None:
    value = os.environ.get(name)
    return value if value not in (None, "") else default


@dataclass(frozen=True)
class Config:
    database_url: str | None
    # Shared secret the portfolio's admin API uses to call this service.
    api_secret: str | None
    # Sent by Vercel Cron as "Authorization: Bearer <CRON_SECRET>".
    cron_secret: str | None
    # Optional: raises Google PageSpeed Insights quota. Keyless calls are
    # attempted otherwise and recorded as unavailable if they fail.
    pagespeed_api_key: str | None
    # Identifies us to OpenStreetMap services and audited sites, as their
    # usage policies require.
    user_agent: str
    contact_url: str
    portfolio_url: str


def load_config() -> Config:
    portfolio = (_env("PORTFOLIO_URL", "https://ugobuildsweb.name.ng") or "").rstrip("/")
    return Config(
        database_url=_env("DATABASE_URL"),
        api_secret=_env("PROSPECTOR_API_SECRET"),
        cron_secret=_env("CRON_SECRET"),
        pagespeed_api_key=_env("PAGESPEED_API_KEY"),
        user_agent=_env(
            "PROSPECTOR_USER_AGENT",
            f"UgobuildswebProspector/0.1 (+{portfolio}/contact)",
        )
        or "",
        contact_url=f"{portfolio}/contact",
        portfolio_url=portfolio,
    )


config = load_config()

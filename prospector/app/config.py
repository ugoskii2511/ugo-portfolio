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
    # Automatic email (Resend). Sending stays off until all three are set.
    resend_api_key: str | None = None
    # e.g. "Ugochukwu Chukwu Christian <hello@ugobuildsweb.name.ng>" (a domain verified in Resend)
    outreach_from: str | None = None
    # Signs unsubscribe links; the website needs the same value to verify them.
    outreach_secret: str | None = None
    # Where replies go; defaults to the site's contact email.
    outreach_reply_to: str | None = None

    @property
    def email_configured(self) -> bool:
        return bool(self.resend_api_key and self.outreach_from and self.outreach_secret)


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
        resend_api_key=_env("RESEND_API_KEY"),
        outreach_from=_env("OUTREACH_FROM"),
        outreach_secret=_env("OUTREACH_SECRET"),
        outreach_reply_to=_env("OUTREACH_REPLY_TO"),
    )


config = load_config()

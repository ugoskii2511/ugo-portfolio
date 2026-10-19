"""Daily usage counters and limits per external provider.

`try_consume` increments and checks in one statement, so concurrent jobs
can't both slip past a cap.
"""

from __future__ import annotations

from app.db import fetch_all, fetch_one

PROVIDERS = {
    "overpass": "overpass_per_day",
    "nominatim": "nominatim_per_day",
    "site_fetch": "site_fetch_per_day",
    "pagespeed": "pagespeed_per_day",
    "ai": "ai_per_day",
    "email_send": "email_send_per_day",
}


class UsageLimitReached(RuntimeError):
    def __init__(self, provider: str, limit: int):
        super().__init__(f"Daily limit reached for {provider} ({limit}/day). Raise it in Settings or try tomorrow.")
        self.provider = provider
        self.limit = limit


def limit_for(settings: dict, provider: str) -> int:
    return int(settings["limits"].get(PROVIDERS[provider], 0))


def try_consume(conn, settings: dict, provider: str, amount: int = 1) -> None:
    limit = limit_for(settings, provider)
    if amount > limit:
        raise UsageLimitReached(provider, limit)
    row = fetch_one(
        conn,
        'INSERT INTO "UsageCounter"(provider, day, count) VALUES (%s, current_date, %s) '
        'ON CONFLICT (provider, day) DO UPDATE SET count = "UsageCounter".count + EXCLUDED.count '
        'WHERE "UsageCounter".count + EXCLUDED.count <= %s '
        "RETURNING count",
        (provider, amount, limit),
    )
    if row is None:
        raise UsageLimitReached(provider, limit)
    # Commit immediately: usage must count even if the surrounding work fails.
    conn.commit()


def usage_today(conn, settings: dict) -> list[dict]:
    rows = {
        r["provider"]: r["count"]
        for r in fetch_all(conn, 'SELECT provider, count FROM "UsageCounter" WHERE day = current_date')
    }
    ratio = float(settings["limits"].get("alert_ratio", 0.8))
    out = []
    for provider in PROVIDERS:
        limit = limit_for(settings, provider)
        used = rows.get(provider, 0)
        out.append(
            {
                "provider": provider,
                "used": used,
                "limit": limit,
                "alert": limit > 0 and used >= limit * ratio,
            }
        )
    return out

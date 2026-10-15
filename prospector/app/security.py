"""Request authentication for the service.

Only two callers are legitimate:
- the portfolio's admin API (server-to-server, PROSPECTOR_API_SECRET), which
  has already verified the admin session, and
- Vercel Cron (CRON_SECRET).
Nothing here is reachable anonymously except /health.
"""

from __future__ import annotations

import hmac

from fastapi import Header, HTTPException, Request

from app.config import config


def _bearer(authorization: str | None) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization[len("Bearer ") :].strip() or None


def _matches(supplied: str | None, expected: str | None) -> bool:
    # Fail closed when the secret isn't configured.
    if not supplied or not expected:
        return False
    return hmac.compare_digest(supplied.encode(), expected.encode())


def require_admin(request: Request, authorization: str | None = Header(default=None)) -> str:
    """Returns the acting admin (forwarded by the portfolio) for audit logs."""
    if not _matches(_bearer(authorization), config.api_secret):
        raise HTTPException(status_code=401, detail="Unauthorized")
    actor = request.headers.get("x-admin-actor", "admin")
    return actor[:200]


def require_cron(authorization: str | None = Header(default=None)) -> None:
    if not _matches(_bearer(authorization), config.cron_secret):
        raise HTTPException(status_code=401, detail="Unauthorized")

"""Sending email through Resend (https://resend.com/docs/api-reference/emails/send-email).

Every automatic email carries a signed unsubscribe link and the standard
List-Unsubscribe headers (with one-click POST, as Gmail and Yahoo expect),
and is sent with an idempotency key so a retry can't deliver it twice.
"""

from __future__ import annotations

import hashlib
import hmac
import html
import re

import httpx

from app.config import config

RESEND_URL = "https://api.resend.com/emails"


class MailError(Exception):
    """The provider refused this email (bad address, rejected content…). Don't retry it."""


class MailUnavailable(Exception):
    """Provider down, rate-limited or not configured. Try again later."""


def unsubscribe_token(prospect_id: str, secret: str | None = None) -> str:
    key = (secret or config.outreach_secret or "").encode()
    if not key:
        raise MailUnavailable("OUTREACH_SECRET is not set")
    return hmac.new(key, f"unsub:{prospect_id}".encode(), hashlib.sha256).hexdigest()[:32]


def unsubscribe_url(prospect_id: str) -> str:
    return f"{config.portfolio_url}/unsubscribe?p={prospect_id}&t={unsubscribe_token(prospect_id)}"


_URL = re.compile(r"https?://[^\s<>()]+[^\s<>().,;:!?\"'”]")


def to_html(text: str) -> str:
    """Plain, readable HTML version of a plain-text message."""
    paragraphs = []
    for block in text.split("\n\n"):
        escaped = html.escape(block)
        linked = _URL.sub(lambda m: f'<a href="{m.group(0)}">{m.group(0)}</a>', escaped)
        paragraphs.append(f"<p style=\"margin:0 0 14px\">{linked.replace(chr(10), '<br>')}</p>")
    return (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1f2328;max-width:600px">'
        + "".join(paragraphs)
        + "</div>"
    )


def send_email(
    *,
    to: str,
    subject: str,
    text: str,
    reply_to: str | None,
    unsubscribe: str,
    idempotency_key: str,
    html_body: str | None = None,
    list_unsubscribe_header: bool = True,
    client: httpx.Client | None = None,
) -> str:
    """Send one email. Returns the provider's message id."""
    if not config.email_configured:
        raise MailUnavailable("Email sending isn't configured (RESEND_API_KEY, OUTREACH_FROM, OUTREACH_SECRET).")
    payload = {
        "from": config.outreach_from,
        "to": [to],
        "subject": subject,
        "text": text,
        "html": html_body or to_html(text),
        # Bulk-mail headers: required only for 5,000+/day senders, and a strong
        # "Promotions" signal to Gmail, so they are optional (setting).
        **({"headers": {"List-Unsubscribe": f"<{unsubscribe}>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"}} if list_unsubscribe_header else {}),
        "tags": [{"name": "category", "value": "prospect_outreach"}],
    }
    if reply_to:
        payload["reply_to"] = reply_to
    owns = client is None
    client = client or httpx.Client(timeout=20.0)
    try:
        response = client.post(
            RESEND_URL,
            json=payload,
            headers={"Authorization": f"Bearer {config.resend_api_key}", "Idempotency-Key": idempotency_key},
        )
    except httpx.HTTPError as exc:
        raise MailUnavailable(f"Couldn't reach Resend: {type(exc).__name__}") from exc
    finally:
        if owns:
            client.close()
    if response.status_code in (200, 201):
        return str(response.json().get("id", ""))
    try:
        detail = response.json().get("message") or response.text[:200]
    except ValueError:
        detail = response.text[:200]
    if response.status_code == 429 or response.status_code >= 500:
        raise MailUnavailable(f"Resend returned HTTP {response.status_code}: {detail}")
    if response.status_code in (401, 403):
        raise MailUnavailable(f"Resend rejected the API key or sender (HTTP {response.status_code}): {detail}")
    raise MailError(f"Resend refused the email (HTTP {response.status_code}): {detail}")

"""Automatic outreach.

Email: QUALIFIED prospects with a public business email who have never
been contacted get one automatic email, inside a Lagos-time sending
window, capped per day (UsageCounter "email_send"). Each email is logged
exactly like a manual send (stage → Contacted, follow-up reminders), and
carries a signed unsubscribe link.

WhatsApp: prospects with a Nigerian mobile number and no email get a
message prepared and marked ready to send. Nothing is ever sent on
WhatsApp automatically; you open it from the Outreach page and send it.

Never contacted automatically: do-not-contact / suppressed prospects,
anyone already contacted or with an outreach in progress, people who
asked for a review through the site (they get a personal reply), and
prospects whose website hasn't been checked yet.
"""

from __future__ import annotations

import math
import re
from datetime import datetime, timedelta, timezone

from app import crm
from app.config import config
from app.db import Json, execute, fetch_all, fetch_one, new_id
from app.mailer import MailError, MailUnavailable, send_email, unsubscribe_url
from app.outreach import PORTFOLIO_PROJECTS, DraftError, build_draft
from app.prospects import is_suppressed, log_event
from app.usage import UsageLimitReached, limit_for, try_consume

LAGOS = timezone(timedelta(hours=1))
NG_MOBILE = re.compile(r"^\+234[789][01]\d{8}$")
TICKS_PER_DAY = 3


def is_ng_mobile(phone: str | None) -> bool:
    """Nigerian mobile numbers (the ones that can be on WhatsApp). Landlines are skipped."""
    return bool(phone and NG_MOBILE.match(re.sub(r"[\s()-]", "", phone)))


def in_window(settings: dict, now: datetime) -> tuple[bool, str]:
    a = settings["autosend"]
    local = now.astimezone(LAGOS)
    if a.get("weekdays_only", True) and local.weekday() >= 5:
        return False, "Emails only go out on weekdays."
    start, end = int(a.get("window_start_hour", 8)), int(a.get("window_end_hour", 19))
    if not (start <= local.hour < end):
        return False, f"Emails only go out between {start:02d}:00 and {end:02d}:00 Lagos time."
    return True, ""


def sent_today(conn) -> int:
    row = fetch_one(conn, 'SELECT count FROM "UsageCounter" WHERE provider = %s AND day = current_date', ("email_send",))
    return int(row["count"]) if row else 0


def _reply_to(conn) -> str | None:
    if config.outreach_reply_to:
        return config.outreach_reply_to
    row = fetch_one(conn, 'SELECT "contactEmail" FROM "SiteSettings" WHERE id = %s', ("singleton",))
    return row["contactEmail"] if row else None


_NOT_CONTACTED = (
    'NOT EXISTS (SELECT 1 FROM "ProspectEvent" e WHERE e."prospectId" = p.id AND e.type IN (\'outreach_sent\', \'inbound_request\', \'unsubscribed\')) '
)


EMAIL_STAGES = ["QUALIFIED", "NEEDS_REVIEW", "DISCOVERED"]


def email_candidates(conn, limit: int, stages: list[str] | None = None) -> list[dict]:
    """Prospects with a public email who've never been contacted.

    The message must only state true things, so: the website has been
    checked; a site the system merely *guessed* (not listed by the
    business) is never written about; and if they have a working site, we
    wait for its audit so the email can mention something real. Best
    scores first."""
    return fetch_all(
        conn,
        'SELECT p.* FROM "Prospect" p WHERE p."archivedAt" IS NULL AND p."doNotContact" = false '
        "AND p.stage = ANY(%s) AND p.email IS NOT NULL AND p.source <> 'inbound' AND p.\"websiteStatus\" <> 'UNCHECKED' "
        "AND NOT (p.\"websiteStatus\" = 'FOUND_UNVERIFIED' AND p.\"websiteEvidence\" LIKE 'No website listed%%') "
        "AND (p.website IS NULL OR p.\"websiteStatus\" IN ('NONE_FOUND', 'UNCERTAIN') "
        '     OR EXISTS (SELECT 1 FROM "ProspectAudit" a WHERE a."prospectId" = p.id AND a.status <> \'failed\')) '
        f"AND {_NOT_CONTACTED}"
        'AND NOT EXISTS (SELECT 1 FROM "OutreachDraft" d WHERE d."prospectId" = p.id AND d.channel = \'email\' AND d.status IN (\'approved\', \'sent\')) '
        'AND NOT EXISTS (SELECT 1 FROM "ProspectEvent" e WHERE e."prospectId" = p.id AND e.type = \'email_failed\') '
        'ORDER BY p.score DESC NULLS LAST, p."discoveredAt" LIMIT %s',
        (stages or EMAIL_STAGES, limit),
    )


def whatsapp_candidates(conn, settings: dict, limit: int) -> list[dict]:
    stages = ["QUALIFIED", "NEEDS_REVIEW"] if settings["autosend"].get("whatsapp_include_review") else ["QUALIFIED"]
    rows = fetch_all(
        conn,
        'SELECT p.* FROM "Prospect" p WHERE p."archivedAt" IS NULL AND p."doNotContact" = false '
        "AND p.stage = ANY(%s) AND p.email IS NULL AND p.phone IS NOT NULL AND p.source <> 'inbound' AND p.\"websiteStatus\" <> 'UNCHECKED' "
        f"AND {_NOT_CONTACTED}"
        'AND NOT EXISTS (SELECT 1 FROM "OutreachDraft" d WHERE d."prospectId" = p.id AND d.channel = \'whatsapp\' AND d.status <> \'rejected\') '
        'ORDER BY p.score DESC NULLS LAST, p."discoveredAt" LIMIT %s',
        (stages, limit * 3),
    )
    return [r for r in rows if is_ng_mobile(r["phone"])][:limit]


def email_assets(conn) -> dict:
    """Screenshots for the recent-work card and the WhatsApp number for the button."""
    ids = [pid for _, pid in PORTFOLIO_PROJECTS.values()]
    images = {r["id"]: r["imageUrl"] for r in fetch_all(conn, 'SELECT id, "imageUrl" FROM "Project" WHERE id = ANY(%s) AND "imageUrl" IS NOT NULL', (ids,))}
    row = fetch_one(conn, 'SELECT "whatsappNumber" FROM "SiteSettings" WHERE id = %s', ("singleton",))
    return {"images": images, "whatsapp": (row or {}).get("whatsappNumber")}


def _insert_draft(conn, prospect_id: str, draft, status: str) -> str:
    draft_id = new_id()
    execute(
        conn,
        'INSERT INTO "OutreachDraft"(id, "prospectId", template, channel, subject, body, status, facts, "approvedAt", "createdAt", "updatedAt") '
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())",
        (draft_id, prospect_id, draft.template, draft.channel, draft.subject, draft.body, status, Json(draft.facts), datetime.now(timezone.utc) if status == "approved" else None),
    )
    return draft_id


def run(conn, settings: dict, *, now: datetime | None = None, max_emails: int | None = None, max_whatsapp: int = 25, respect_window: bool = True) -> dict:
    """One outreach pass. Returns a summary of what was done and why not."""
    now = now or datetime.now(timezone.utc)
    a = settings["autosend"]
    summary: dict = {"emailed": [], "emailFailed": [], "whatsappReady": [], "skipped": [], "notes": []}

    # ---------------------------------------------------------------- email
    if not a.get("email_enabled", True):
        summary["notes"].append("Automatic email is switched off in settings.")
    elif not config.email_configured:
        summary["notes"].append("Automatic email isn't set up yet (Resend key, sender address and signing secret needed).")
    else:
        ok, why = in_window(settings, now) if respect_window else (True, "")
        cap = limit_for(settings, "email_send")
        remaining = max(cap - sent_today(conn), 0)
        quota = remaining if max_emails is None else min(remaining, max_emails)
        if not ok:
            summary["notes"].append(why)
        elif quota <= 0:
            summary["notes"].append(f"Today's limit of {cap} automatic emails has been reached.")
        else:
            reply_to = _reply_to(conn)
            assets = email_assets(conn)
            for prospect in email_candidates(conn, quota, a.get("email_stages") or EMAIL_STAGES):
                if is_suppressed(conn, prospect):
                    summary["skipped"].append({"id": prospect["id"], "reason": "on the do-not-contact list"})
                    continue
                try:
                    unsub = unsubscribe_url(prospect["id"])
                    draft = build_draft(prospect, crm.latest_findings(conn, prospect["id"]), settings, channel="email", unsubscribe_url=unsub, assets=assets)
                except (DraftError, MailUnavailable) as exc:
                    summary["skipped"].append({"id": prospect["id"], "reason": str(exc)})
                    continue
                try:
                    try_consume(conn, settings, "email_send")
                except UsageLimitReached:
                    summary["notes"].append(f"Today's limit of {cap} automatic emails has been reached.")
                    break
                draft_id = _insert_draft(conn, prospect["id"], draft, "approved")
                conn.commit()
                try:
                    message_id = send_email(
                        to=prospect["email"],
                        subject=draft.subject or prospect["businessName"],
                        text=draft.body,
                        reply_to=reply_to,
                        unsubscribe=unsub,
                        idempotency_key=f"outreach-{draft_id}",
                        html_body=draft.html,
                        list_unsubscribe_header=bool(a.get("list_unsubscribe_header", False)),
                    )
                except MailError as exc:
                    execute(conn, 'UPDATE "OutreachDraft" SET status = %s, "updatedAt" = now() WHERE id = %s', ("rejected", draft_id))
                    log_event(conn, prospect["id"], "email_failed", f"Automatic email not sent: {exc}"[:500], channel="email", data={"draftId": draft_id})
                    conn.commit()
                    summary["emailFailed"].append({"id": prospect["id"], "reason": str(exc)})
                    continue
                except MailUnavailable as exc:
                    # Nothing was delivered; remove the draft so the prospect is tried again later.
                    execute(conn, 'DELETE FROM "OutreachDraft" WHERE id = %s', (draft_id,))
                    conn.commit()
                    summary["notes"].append(f"Stopped: {exc}")
                    break
                crm.mark_sent(conn, settings, draft_id, actor="auto-email", channel="email", now=now)
                execute(conn, 'UPDATE "OutreachDraft" SET facts = facts || %s, "updatedAt" = now() WHERE id = %s', (Json([{"fact": "resend_id", "value": message_id}]), draft_id))
                conn.commit()
                summary["emailed"].append({"id": prospect["id"], "name": prospect["businessName"], "to": prospect["email"]})

    # ------------------------------------------------------------- whatsapp
    if a.get("whatsapp_drafts", True) and max_whatsapp > 0:
        for prospect in whatsapp_candidates(conn, settings, max_whatsapp):
            if is_suppressed(conn, prospect):
                continue
            try:
                draft = build_draft(prospect, crm.latest_findings(conn, prospect["id"]), settings, channel="whatsapp")
            except DraftError as exc:
                summary["skipped"].append({"id": prospect["id"], "reason": str(exc)})
                continue
            draft_id = _insert_draft(conn, prospect["id"], draft, "approved")
            log_event(conn, prospect["id"], "draft_created", "WhatsApp message ready to send", channel="whatsapp", data={"draftId": draft_id, "by": "auto"})
            conn.commit()
            summary["whatsappReady"].append({"id": prospect["id"], "name": prospect["businessName"]})
    return summary


def tick_quota(settings: dict) -> int:
    """Spread the daily email cap over the scheduler's runs."""
    return max(1, math.ceil(limit_for(settings, "email_send") / TICKS_PER_DAY))

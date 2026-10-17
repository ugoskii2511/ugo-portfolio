"""CRM operations that need more than a simple field update.

(Simple edits like notes, stage, priority and amounts are done by the
dashboard directly; these are the operations with rules attached.)
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.db import Json, execute, fetch_all, fetch_one, new_id
from app.outreach import build_draft
from app.prospects import is_suppressed, log_event
from app.scoring import score_prospect

# Stages that mean outreach has already happened (or must not).
POST_CONTACT = {"CONTACTED", "REPLIED", "CONSULTATION_SCHEDULED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST", "DO_NOT_CONTACT"}


class CrmError(ValueError):
    pass


def get_prospect(conn, prospect_id: str) -> dict:
    row = fetch_one(conn, 'SELECT * FROM "Prospect" WHERE id = %s', (prospect_id,))
    if not row:
        raise CrmError("Prospect not found")
    return row


def latest_findings(conn, prospect_id: str) -> list[dict] | None:
    row = fetch_one(
        conn,
        'SELECT findings FROM "ProspectAudit" WHERE "prospectId" = %s AND status <> %s ORDER BY "createdAt" DESC LIMIT 1',
        (prospect_id, "failed"),
    )
    return row["findings"] if row else None


def last_outreach(conn, prospect_id: str) -> dict | None:
    return fetch_one(
        conn,
        'SELECT * FROM "ProspectEvent" WHERE "prospectId" = %s AND type = %s ORDER BY "createdAt" DESC LIMIT 1',
        (prospect_id, "outreach_sent"),
    )


def rescore(conn, settings: dict, prospect_id: str) -> dict:
    prospect = get_prospect(conn, prospect_id)
    sent = last_outreach(conn, prospect_id)
    result = score_prospect(
        prospect,
        latest_findings(conn, prospect_id),
        settings,
        last_contacted_at=sent["createdAt"] if sent else None,
        suppressed=is_suppressed(conn, prospect),
    )
    stage = prospect["stage"]
    # Move freshly discovered leads into the review/qualified lanes; never
    # move a lead backwards once a human has progressed it.
    if stage in ("DISCOVERED", "NEEDS_REVIEW", "QUALIFIED"):
        stage = {"qualified": "QUALIFIED", "review": "NEEDS_REVIEW"}.get(result["qualification"], "DISCOVERED")
        # Someone who asked us for a review always gets looked at, whatever
        # their website scores.
        if stage == "DISCOVERED" and not prospect.get("doNotContact") and fetch_one(
            conn, 'SELECT 1 AS hit FROM "ProspectEvent" WHERE "prospectId" = %s AND type = %s LIMIT 1', (prospect_id, "inbound_request")
        ):
            stage = "NEEDS_REVIEW"
    execute(
        conn,
        'UPDATE "Prospect" SET score = %s, "scoreBreakdown" = %s, qualification = %s, "recommendedService" = %s, '
        '"nextAction" = %s, "scoredAt" = now(), stage = %s, "updatedAt" = now() WHERE id = %s',
        (
            result["score"],
            Json(result["factors"]),
            result["qualification"],
            result["recommendedService"],
            result["nextAction"],
            stage,
            prospect_id,
        ),
    )
    return result


def create_draft(conn, settings: dict, prospect_id: str, template: str | None = None) -> dict:
    prospect = get_prospect(conn, prospect_id)
    if is_suppressed(conn, prospect):
        raise CrmError("This prospect is on the do-not-contact list.")
    draft = build_draft(prospect, latest_findings(conn, prospect_id), settings, template=template, last_outreach=last_outreach(conn, prospect_id))
    draft_id = new_id()
    execute(
        conn,
        'INSERT INTO "OutreachDraft"(id, "prospectId", template, channel, subject, body, status, facts, "createdAt", "updatedAt") '
        "VALUES (%s, %s, %s, %s, %s, %s, 'draft', %s, now(), now())",
        (draft_id, prospect_id, draft.template, draft.channel, draft.subject, draft.body, Json(draft.facts)),
    )
    log_event(conn, prospect_id, "draft_created", f"Draft created ({draft.template})", data={"draftId": draft_id})
    return fetch_one(conn, 'SELECT * FROM "OutreachDraft" WHERE id = %s', (draft_id,))


def mark_sent(conn, settings: dict, draft_id: str, *, actor: str, channel: str | None = None, now: datetime | None = None) -> dict:
    """Log that an approved draft was sent (manually, by the admin).

    Idempotent: a draft can only be marked sent once. Blocked for
    do-not-contact prospects. Schedules follow-up reminders.
    """
    now = now or datetime.now(timezone.utc)
    draft = fetch_one(conn, 'SELECT * FROM "OutreachDraft" WHERE id = %s FOR UPDATE', (draft_id,))
    if not draft:
        raise CrmError("Draft not found")
    if draft["status"] == "sent":
        return {"draft": draft, "alreadySent": True}
    if draft["status"] != "approved":
        raise CrmError("Approve the draft before logging it as sent.")
    prospect = get_prospect(conn, draft["prospectId"])
    if prospect["doNotContact"] or is_suppressed(conn, prospect):
        raise CrmError("This prospect is on the do-not-contact list.")
    channel = channel or draft["channel"]
    execute(conn, 'UPDATE "OutreachDraft" SET status = %s, "sentAt" = %s, "updatedAt" = now() WHERE id = %s', ("sent", now, draft_id))
    log_event(conn, prospect["id"], "outreach_sent", f"Message sent via {channel} ({draft['template']})", channel=channel, data={"draftId": draft_id, "by": actor})
    if prospect["stage"] not in POST_CONTACT:
        execute(conn, 'UPDATE "Prospect" SET stage = %s, "updatedAt" = now() WHERE id = %s', ("CONTACTED", prospect["id"]))
    schedule_followups(conn, settings, prospect["id"], now)
    return {"draft": fetch_one(conn, 'SELECT * FROM "OutreachDraft" WHERE id = %s', (draft_id,)), "alreadySent": False}


def schedule_followups(conn, settings: dict, prospect_id: str, sent_at: datetime) -> None:
    # Replace any open reminders: the latest message sets the schedule.
    execute(conn, 'UPDATE "FollowUpTask" SET status = %s WHERE "prospectId" = %s AND status = %s', ("skipped", prospect_id, "open"))
    for index, days in enumerate(settings["followups"]["schedule_days"], start=1):
        execute(
            conn,
            'INSERT INTO "FollowUpTask"(id, "prospectId", title, "dueAt", status, "createdAt") VALUES (%s, %s, %s, %s, %s, now())',
            (new_id(), prospect_id, f"Follow-up #{index} if no reply", sent_at + timedelta(days=int(days)), "open"),
        )
    sync_follow_up_date(conn, prospect_id)


def sync_follow_up_date(conn, prospect_id: str) -> None:
    execute(
        conn,
        'UPDATE "Prospect" SET "followUpAt" = (SELECT min("dueAt") FROM "FollowUpTask" WHERE "prospectId" = %s AND status = %s), '
        '"updatedAt" = now() WHERE id = %s',
        (prospect_id, "open", prospect_id),
    )


def mark_do_not_contact(conn, prospect_id: str, *, reason: str, actor: str) -> None:
    prospect = get_prospect(conn, prospect_id)
    execute(
        conn,
        'UPDATE "Prospect" SET "doNotContact" = true, stage = %s, "followUpAt" = NULL, score = 0, qualification = %s, "updatedAt" = now() WHERE id = %s',
        ("DO_NOT_CONTACT", "do_not_contact", prospect_id),
    )
    for kind, value in (("email", prospect.get("email")), ("phone", prospect.get("phone")), ("domain", prospect.get("websiteDomain"))):
        if value:
            execute(
                conn,
                'INSERT INTO "Suppression"(id, kind, value, reason, "createdAt") VALUES (%s, %s, %s, %s, now()) ON CONFLICT (kind, value) DO NOTHING',
                (new_id(), kind, value, reason[:300]),
            )
    execute(conn, 'UPDATE "FollowUpTask" SET status = %s WHERE "prospectId" = %s AND status = %s', ("skipped", prospect_id, "open"))
    execute(conn, 'UPDATE "OutreachDraft" SET status = %s, "updatedAt" = now() WHERE "prospectId" = %s AND status IN (%s, %s)', ("rejected", prospect_id, "draft", "approved"))
    log_event(conn, prospect_id, "do_not_contact", f"Marked do-not-contact: {reason}"[:300], data={"by": actor})


def close_followups_for_progressed(conn) -> int:
    """Skip open reminders for leads that replied, won, lost or opted out."""
    return execute(
        conn,
        'UPDATE "FollowUpTask" t SET status = %s FROM "Prospect" p WHERE t."prospectId" = p.id AND t.status = %s '
        "AND p.stage IN ('REPLIED','CONSULTATION_SCHEDULED','PROPOSAL_SENT','NEGOTIATION','WON','LOST','DO_NOT_CONTACT')",
        ("skipped", "open"),
    )


def apply_retention(conn, settings: dict) -> dict:
    cfg = settings["retention"]
    archived = deleted = 0
    archive_days = int(cfg.get("archive_uncontacted_after_days") or 0)
    delete_days = int(cfg.get("delete_archived_after_days") or 0)
    if archive_days > 0:
        archived = execute(
            conn,
            'UPDATE "Prospect" p SET "archivedAt" = now(), "updatedAt" = now() WHERE p."archivedAt" IS NULL '
            "AND p.stage IN ('DISCOVERED','NEEDS_REVIEW','QUALIFIED','READY_FOR_OUTREACH') "
            "AND p.\"discoveredAt\" < now() - make_interval(days => %s) "
            "AND NOT EXISTS (SELECT 1 FROM \"ProspectEvent\" e WHERE e.\"prospectId\" = p.id AND e.type = 'outreach_sent')",
            (archive_days,),
        )
    if delete_days > 0:
        deleted = execute(
            conn,
            'DELETE FROM "Prospect" WHERE "archivedAt" IS NOT NULL AND "archivedAt" < now() - make_interval(days => %s) '
            "AND stage NOT IN ('WON')",
            (delete_days,),
        )
    return {"archived": archived, "deleted": deleted}


def due_followups(conn) -> list[dict]:
    return fetch_all(
        conn,
        'SELECT t.*, p."businessName" FROM "FollowUpTask" t JOIN "Prospect" p ON p.id = t."prospectId" '
        "WHERE t.status = 'open' AND t.\"dueAt\" <= now() ORDER BY t.\"dueAt\"",
    )

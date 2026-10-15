"""Integration tests against the real database (opt-in).

Run with RUN_DB_TESTS=1 and DATABASE_URL set. Every row created here uses
source "qa-test" (or ids recorded below) and is deleted in teardown.
"""

import copy
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest

pytestmark = pytest.mark.skipif(os.environ.get("RUN_DB_TESTS") != "1", reason="set RUN_DB_TESTS=1 to run against the database")

TAG = f"qa-{uuid.uuid4().hex[:8]}"


@pytest.fixture(scope="module")
def conn():
    from app.db import connect

    with connect() as c:
        yield c
        # Teardown: everything this module created.
        c.rollback()
        c.execute('DELETE FROM "Prospect" WHERE "businessName" LIKE %s', (f"{TAG}%",))
        c.execute('DELETE FROM "Suppression" WHERE value LIKE %s', (f"%{TAG}%",))
        c.execute('DELETE FROM "ProspectJob" WHERE "idempotencyKey" LIKE %s', (f"{TAG}%",))
        c.execute('DELETE FROM "UsageCounter" WHERE provider LIKE %s', (f"{TAG}%",))
        c.commit()


@pytest.fixture(scope="module")
def settings(conn):
    from app.settings import load_settings

    s = copy.deepcopy(load_settings(conn))
    s["_portfolio_url"] = "https://ugobuildsweb.name.ng"
    return s


def test_upsert_dedupes_by_source_ref_domain_and_name(conn):
    from app.prospects import upsert

    base = {"businessName": f"{TAG} Sunrise Academy", "city": "Abuja", "source": "qa-test", "sourceRef": f"{TAG}/1"}
    outcome1, id1 = upsert(conn, {**base, "phone": "0803 123 4567"})
    outcome2, id2 = upsert(conn, base)  # same sourceRef
    outcome3, id3 = upsert(conn, {**base, "sourceRef": f"{TAG}/2"})  # same name + city
    _, id4 = upsert(conn, {"businessName": f"{TAG} Other Name", "website": f"https://{TAG}.example.ng", "source": "qa-test", "sourceRef": f"{TAG}/3"})
    outcome5, id5 = upsert(conn, {"businessName": f"{TAG} Different", "website": f"http://www.{TAG}.example.ng/x", "source": "qa-test", "sourceRef": f"{TAG}/4"})
    conn.commit()
    assert outcome1 == "created"
    assert (outcome2, id2) == ("duplicate", id1)
    assert (outcome3, id3) == ("duplicate", id1)
    assert (outcome5, id5) == ("duplicate", id4)  # same domain
    row = conn.execute('SELECT phone, "websiteStatus", "websiteEvidence" FROM "Prospect" WHERE id = %s', (id1,)).fetchone()
    assert row["phone"] == "+2348031234567"
    assert row["websiteStatus"] == "NONE_FOUND" and "No website provided" in row["websiteEvidence"]


def test_rescore_moves_stage_and_stores_explanation(conn, settings):
    from app import crm

    pid = conn.execute('SELECT id FROM "Prospect" WHERE "businessName" = %s', (f"{TAG} Sunrise Academy",)).fetchone()["id"]
    conn.execute('UPDATE "Prospect" SET industry = %s WHERE id = %s', ("Education", pid))
    result = crm.rescore(conn, settings, pid)
    conn.commit()
    row = conn.execute('SELECT stage, score, "scoreBreakdown", "recommendedService" FROM "Prospect" WHERE id = %s', (pid,)).fetchone()
    assert row["score"] == result["score"] and row["scoreBreakdown"]
    assert row["stage"] == "QUALIFIED"
    assert row["recommendedService"] == "School website"


def test_draft_approve_send_is_idempotent_and_schedules_followups(conn, settings):
    from app import crm

    pid = conn.execute('SELECT id FROM "Prospect" WHERE "businessName" = %s', (f"{TAG} Sunrise Academy",)).fetchone()["id"]
    draft = crm.create_draft(conn, settings, pid)
    conn.commit()
    assert draft["status"] == "draft" and draft["facts"]
    with pytest.raises(crm.CrmError, match="Approve"):
        crm.mark_sent(conn, settings, draft["id"], actor="qa")
    conn.rollback()
    conn.execute('UPDATE "OutreachDraft" SET status = %s, "approvedAt" = now() WHERE id = %s', ("approved", draft["id"]))
    first = crm.mark_sent(conn, settings, draft["id"], actor="qa")
    conn.commit()
    second = crm.mark_sent(conn, settings, draft["id"], actor="qa")
    conn.commit()
    assert not first["alreadySent"] and second["alreadySent"]
    sent_events = conn.execute('SELECT count(*) n FROM "ProspectEvent" WHERE "prospectId" = %s AND type = %s', (pid, "outreach_sent")).fetchone()["n"]
    assert sent_events == 1
    tasks = conn.execute('SELECT "dueAt" FROM "FollowUpTask" WHERE "prospectId" = %s AND status = %s ORDER BY "dueAt"', (pid, "open")).fetchall()
    assert len(tasks) == len(settings["followups"]["schedule_days"])
    row = conn.execute('SELECT stage, "followUpAt" FROM "Prospect" WHERE id = %s', (pid,)).fetchone()
    assert row["stage"] == "CONTACTED" and row["followUpAt"] == tasks[0]["dueAt"]
    # Follow-up drafts now reference the logged message.
    follow = crm.create_draft(conn, settings, pid, "follow_up")
    conn.commit()
    assert "following up on the message I sent" in follow["body"]


def test_do_not_contact_blocks_outreach_and_suppresses_future_finds(conn, settings):
    from app import crm
    from app.prospects import upsert

    outcome, pid = upsert(conn, {"businessName": f"{TAG} Optout Bakery", "email": f"owner@{TAG}.bakery.ng", "source": "qa-test", "sourceRef": f"{TAG}/9"})
    conn.commit()
    crm.mark_do_not_contact(conn, pid, reason="Asked not to be contacted", actor="qa")
    conn.commit()
    with pytest.raises(crm.CrmError, match="do-not-contact"):
        crm.create_draft(conn, settings, pid)
    conn.rollback()
    # A later discovery of the same email is created as suppressed.
    outcome2, pid2 = upsert(conn, {"businessName": f"{TAG} Optout Bakery Two", "email": f"owner@{TAG}.bakery.ng", "source": "qa-test", "sourceRef": f"{TAG}/10"})
    conn.commit()
    assert outcome2 == "suppressed"
    assert conn.execute('SELECT "doNotContact", stage FROM "Prospect" WHERE id = %s', (pid2,)).fetchone() == {"doNotContact": True, "stage": "DO_NOT_CONTACT"}


def test_job_lease_prevents_concurrent_steps(conn):
    from app import jobs

    job = jobs.create_job(conn, "score", {"prospectIds": ["x"]}, created_by="qa", idempotency_key=f"{TAG}-lease")
    conn.commit()
    again = jobs.create_job(conn, "score", {"prospectIds": ["x"]}, created_by="qa", idempotency_key=f"{TAG}-lease")
    assert again["id"] == job["id"]  # idempotent creation
    first = jobs.claim(conn, job["id"])
    second = jobs.claim(conn, job["id"])
    assert first is not None and second is None
    jobs.cancel(conn, job["id"])
    conn.commit()


def test_usage_limits_are_enforced_atomically(conn):
    from app.usage import PROVIDERS, UsageLimitReached, try_consume

    provider = f"{TAG}-prov"
    PROVIDERS[provider] = "qa_limit"
    s = {"limits": {"qa_limit": 3}}
    try:
        try_consume(conn, s, provider, 2)
        try_consume(conn, s, provider, 1)
        with pytest.raises(UsageLimitReached):
            try_consume(conn, s, provider, 1)
    finally:
        del PROVIDERS[provider]


def test_retention_archives_old_uncontacted_prospects(conn, settings):
    from app import crm
    from app.prospects import upsert

    _, pid = upsert(conn, {"businessName": f"{TAG} Old Lead", "source": "qa-test", "sourceRef": f"{TAG}/old"})
    conn.execute('UPDATE "Prospect" SET "discoveredAt" = %s WHERE id = %s', (datetime.now(timezone.utc) - timedelta(days=400), pid))
    conn.commit()
    s = copy.deepcopy(settings)
    s["retention"] = {"archive_uncontacted_after_days": 180, "delete_archived_after_days": 0}
    crm.apply_retention(conn, s)
    conn.commit()
    assert conn.execute('SELECT "archivedAt" FROM "Prospect" WHERE id = %s', (pid,)).fetchone()["archivedAt"] is not None

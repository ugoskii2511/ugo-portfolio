import copy
import dataclasses
import os
import uuid
from datetime import datetime, timezone

import httpx
import pytest
import respx

from app import autosend, mailer
from app.settings import DEFAULTS

SETTINGS = copy.deepcopy(DEFAULTS)
SETTINGS["_portfolio_url"] = "https://ugobuildsweb.name.ng"


def configured(monkeypatch):
    cfg = dataclasses.replace(mailer.config, resend_api_key="re_test", outreach_from="Ugo <hello@ugobuildsweb.name.ng>", outreach_secret="s3cret")
    monkeypatch.setattr(mailer, "config", cfg)
    monkeypatch.setattr(autosend, "config", cfg)
    return cfg


def test_nigerian_mobiles_only():
    assert autosend.is_ng_mobile("+2348031234567")
    assert autosend.is_ng_mobile("+234 903 123 4567")
    assert autosend.is_ng_mobile("+2347012345678")
    assert not autosend.is_ng_mobile("+23494612345")  # Abuja landline
    assert not autosend.is_ng_mobile("+447700900123")
    assert not autosend.is_ng_mobile(None)


def test_sending_window_in_lagos_time():
    weekday_10am = datetime(2026, 10, 20, 9, 0, tzinfo=timezone.utc)  # Tue 10:00 Lagos
    assert autosend.in_window(SETTINGS, weekday_10am)[0]
    assert not autosend.in_window(SETTINGS, datetime(2026, 10, 20, 6, 30, tzinfo=timezone.utc))[0]  # 07:30 Lagos
    assert not autosend.in_window(SETTINGS, datetime(2026, 10, 20, 18, 0, tzinfo=timezone.utc))[0]  # 19:00 Lagos
    saturday = datetime(2026, 10, 24, 10, 0, tzinfo=timezone.utc)
    ok, why = autosend.in_window(SETTINGS, saturday)
    assert not ok and "weekdays" in why


def test_tick_quota_spreads_daily_cap():
    assert autosend.tick_quota(SETTINGS) == 4  # 10/day over 3 runs → 4, 4, 2 (capped by the daily total)


def test_unsubscribe_tokens_are_signed():
    a = mailer.unsubscribe_token("p1", "secret-a")
    assert a == mailer.unsubscribe_token("p1", "secret-a") and len(a) == 32
    assert a != mailer.unsubscribe_token("p2", "secret-a")
    assert a != mailer.unsubscribe_token("p1", "secret-b")


def test_html_version_is_escaped_and_linked():
    html = mailer.to_html("Hi <b>team</b>,\n\nSee https://ugobuildsweb.name.ng/work.")
    assert "&lt;b&gt;" in html and '<a href="https://ugobuildsweb.name.ng/work">' in html


@respx.mock
def test_send_email_success_with_unsubscribe_headers(monkeypatch):
    configured(monkeypatch)
    route = respx.post(mailer.RESEND_URL).mock(return_value=httpx.Response(200, json={"id": "em_123"}))
    message_id = mailer.send_email(to="info@biz.ng", subject="Hi", text="Hello", reply_to="me@x.ng", unsubscribe="https://u/1", idempotency_key="outreach-d1")
    assert message_id == "em_123"
    sent = route.calls.last.request
    assert sent.headers["Idempotency-Key"] == "outreach-d1"
    body = __import__("json").loads(sent.content)
    assert body["headers"]["List-Unsubscribe"] == "<https://u/1>"
    assert body["headers"]["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"
    assert body["reply_to"] == "me@x.ng" and body["to"] == ["info@biz.ng"]


@respx.mock
def test_send_email_errors(monkeypatch):
    configured(monkeypatch)
    respx.post(mailer.RESEND_URL).mock(return_value=httpx.Response(422, json={"message": "Invalid `to` field"}))
    with pytest.raises(mailer.MailError):
        mailer.send_email(to="bad", subject="s", text="t", reply_to=None, unsubscribe="u", idempotency_key="k")
    respx.post(mailer.RESEND_URL).mock(return_value=httpx.Response(503, text="down"))
    with pytest.raises(mailer.MailUnavailable):
        mailer.send_email(to="a@b.ng", subject="s", text="t", reply_to=None, unsubscribe="u", idempotency_key="k")


def test_not_configured_never_sends(monkeypatch):
    cfg = dataclasses.replace(mailer.config, resend_api_key=None)
    monkeypatch.setattr(mailer, "config", cfg)
    with pytest.raises(mailer.MailUnavailable):
        mailer.send_email(to="a@b.ng", subject="s", text="t", reply_to=None, unsubscribe="u", idempotency_key="k")


# ---------------------------------------------------------------- database (opt-in)

db = pytest.mark.skipif(os.environ.get("RUN_DB_TESTS") != "1", reason="set RUN_DB_TESTS=1 to run against the database")
TAG = f"qa-{uuid.uuid4().hex[:8]}"


@db
def test_autosend_rules_against_database(monkeypatch):
    from app.db import connect
    from app.prospects import upsert

    configured(monkeypatch)
    sent: list[dict] = []
    monkeypatch.setattr(autosend, "send_email", lambda **kw: sent.append(kw) or f"em_{len(sent)}")
    settings = copy.deepcopy(SETTINGS)
    weekday_10am = datetime(2026, 10, 20, 9, 0, tzinfo=timezone.utc)

    with connect() as conn:
        before = autosend.sent_today(conn)
        try:
            def make(name, **extra):
                _, pid = upsert(conn, {"businessName": f"{TAG} {name}", "city": "Abuja", "source": "qa-test", "sourceRef": f"{TAG}/{name}", **extra})
                conn.execute('UPDATE "Prospect" SET stage = %s, "websiteStatus" = %s, score = 80 WHERE id = %s', ("QUALIFIED", "NONE_FOUND", pid))
                return pid

            emailable = make("Mail", email=f"{TAG}@example.com")
            whatsapp = make("Wa", phone="0803 123 4567")
            landline = make("Land", phone="094612345")
            dnc = make("Dnc", email=f"dnc-{TAG}@example.com")
            conn.execute('UPDATE "Prospect" SET "doNotContact" = true, stage = %s WHERE id = %s', ("DO_NOT_CONTACT", dnc))
            conn.commit()

            # Only our QA rows should be picked: restrict candidates to the tag.
            real_email = autosend.email_candidates
            real_wa = autosend.whatsapp_candidates
            monkeypatch.setattr(autosend, "email_candidates", lambda c, n: [r for r in real_email(c, 500) if r["businessName"].startswith(TAG)][:n])
            monkeypatch.setattr(autosend, "whatsapp_candidates", lambda c, s, n: [r for r in real_wa(c, s, 500) if r["businessName"].startswith(TAG)][:n])

            result = autosend.run(conn, settings, now=weekday_10am)
            assert [e["id"] for e in result["emailed"]] == [emailable]
            assert len(sent) == 1 and sent[0]["to"] == f"{TAG}@example.com"
            assert "/unsubscribe?p=" in sent[0]["text"] and sent[0]["unsubscribe"] in sent[0]["text"]
            row = conn.execute('SELECT stage, "followUpAt" FROM "Prospect" WHERE id = %s', (emailable,)).fetchone()
            assert row["stage"] == "CONTACTED" and row["followUpAt"] is not None
            assert [w["id"] for w in result["whatsappReady"]] == [whatsapp]  # landline and DNC skipped
            wa_draft = conn.execute('SELECT status, channel, body FROM "OutreachDraft" WHERE "prospectId" = %s', (whatsapp,)).fetchone()
            assert wa_draft["status"] == "approved" and wa_draft["channel"] == "whatsapp"
            assert autosend.sent_today(conn) == before + 1

            # A second pass contacts nobody twice.
            again = autosend.run(conn, settings, now=weekday_10am)
            assert again["emailed"] == [] and again["whatsappReady"] == [] and len(sent) == 1

            # Outside the window nothing is emailed.
            conn.execute('UPDATE "Prospect" SET email = %s WHERE id = %s', (f"wa-{TAG}@example.com", landline))
            conn.commit()
            night = autosend.run(conn, settings, now=datetime(2026, 10, 20, 22, 0, tzinfo=timezone.utc))
            assert night["emailed"] == [] and any("between" in n for n in night["notes"])
        finally:
            conn.rollback()
            conn.execute('DELETE FROM "Prospect" WHERE "businessName" LIKE %s', (f"{TAG}%",))
            # Give back the counter this test used, so real sending isn't affected.
            conn.execute('UPDATE "UsageCounter" SET count = GREATEST(count - %s, 0) WHERE provider = %s AND day = current_date', (autosend.sent_today(conn) - before, "email_send"))
            conn.commit()


@db
def test_outreach_status_endpoint_against_database(monkeypatch):
    from fastapi.testclient import TestClient

    from app import main, security

    cfg = dataclasses.replace(security.config, api_secret="s3")
    monkeypatch.setattr(security, "config", cfg)
    r = TestClient(main.app).get("/outreach/status", headers={"Authorization": "Bearer s3"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert {"configured", "settings", "dailyCap", "sentToday", "windowOpen", "emailQueue", "whatsappReady"} <= set(body)

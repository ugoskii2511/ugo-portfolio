import copy
import re
from datetime import datetime, timedelta, timezone

import pytest

from app.jobs import JobError, validate_params
from app.outreach import DraftError, build_draft, suggest_template
from app.scoring import score_prospect
from app.settings import DEFAULTS

SETTINGS = copy.deepcopy(DEFAULTS)
SETTINGS["_portfolio_url"] = "https://ugobuildsweb.name.ng"

NO_SITE = {
    "businessName": "Sunrise Academy",
    "industry": "Education",
    "city": "Abuja",
    "phone": "+2348031234567",
    "email": None,
    "website": None,
    "websiteStatus": "NONE_FOUND",
    "websiteEvidence": "No website listed on OpenStreetMap, and none of sunriseacademy.com.ng names the business.",
    "source": "openstreetmap",
    "sourceUrl": "https://www.openstreetmap.org/node/1",
    "stage": "DISCOVERED",
    "doNotContact": False,
}


def test_no_website_lead_in_target_area_is_qualified_with_explained_factors():
    result = score_prospect(NO_SITE, None, SETTINGS)
    assert result["qualification"] == "qualified"
    names = {f["factor"] for f in result["factors"]}
    assert {"No website found", "Public contact channel", "Target location", "Target industry"} <= names
    assert result["score"] == sum(f["points"] for f in result["factors"])
    assert result["recommendedService"] == "School website"
    assert result["nextAction"] == "Draft outreach"


def test_do_not_contact_scores_zero():
    result = score_prospect({**NO_SITE, "doNotContact": True}, None, SETTINGS)
    assert result["score"] == 0 and result["qualification"] == "do_not_contact"


def test_recent_contact_lowers_score():
    now = datetime.now(timezone.utc)
    base = score_prospect(NO_SITE, None, SETTINGS, now=now)["score"]
    recent = score_prospect(NO_SITE, None, SETTINGS, last_contacted_at=now - timedelta(days=3), now=now)["score"]
    assert recent < base


def test_audit_findings_drive_score_and_service():
    prospect = {**NO_SITE, "website": "https://biz.ng/", "websiteStatus": "VERIFIED"}
    findings = [
        {"key": "viewport", "label": "Mobile viewport", "status": "fail", "priority": "high", "evidence": "No viewport", "service": "Mobile-friendly redesign"},
        {"key": "https", "label": "HTTPS", "status": "pass", "priority": "none", "evidence": "ok", "service": None},
    ]
    result = score_prospect(prospect, findings, SETTINGS)
    assert "Not mobile-friendly" in {f["factor"] for f in result["factors"]}
    assert result["recommendedService"] == "Mobile-friendly redesign"


def test_new_website_draft_uses_only_recorded_facts():
    draft = build_draft(NO_SITE, None, SETTINGS)
    assert draft.template == "school_website"
    assert draft.channel == "whatsapp"
    assert "Sunrise Academy" in draft.body
    assert "OpenStreetMap" in draft.body
    assert "https://ugobuildsweb.name.ng/work/prudential-international-school" in draft.body
    # No statistics or invented numbers beyond contact details.
    body_without_contact = draft.body.split("Best regards")[0]
    assert not re.search(r"\d+\s*%", body_without_contact)
    assert {f["fact"] for f in draft.facts} >= {"source", "website_status", "portfolio_link"}


def test_redesign_draft_cites_actual_finding():
    prospect = {**NO_SITE, "website": "https://biz.ng/", "websiteDomain": "biz.ng", "websiteStatus": "VERIFIED", "email": "info@biz.ng"}
    findings = [{"key": "meta_description", "label": "Meta description", "status": "fail", "priority": "medium", "evidence": "No meta description.", "service": "SEO"}]
    draft = build_draft(prospect, findings, SETTINGS, template="redesign")
    assert "meta description" in draft.body
    assert draft.channel == "email" and draft.subject
    assert "won't contact you again" in draft.body
    assert any(f["fact"] == "audit:meta_description" for f in draft.facts)


def test_drafts_refuse_unsupported_claims():
    prospect = {**NO_SITE, "website": "https://biz.ng/", "websiteStatus": "VERIFIED"}
    with pytest.raises(DraftError, match="no issues"):
        build_draft(prospect, [], SETTINGS, template="redesign")
    with pytest.raises(DraftError, match="No earlier message"):
        build_draft(NO_SITE, None, SETTINGS, template="follow_up")
    with pytest.raises(DraftError, match="do-not-contact"):
        build_draft({**NO_SITE, "doNotContact": True}, None, SETTINGS)
    with pytest.raises(DraftError):
        build_draft(prospect, None, SETTINGS, template="new_website")


def test_follow_up_references_logged_message_date():
    draft = build_draft(NO_SITE, None, SETTINGS, template="follow_up", last_outreach={"createdAt": datetime(2026, 10, 3, tzinfo=timezone.utc)})
    assert "3 October" in draft.body


def test_suggest_template():
    assert suggest_template(NO_SITE, None) == "school_website"
    assert suggest_template({**NO_SITE, "industry": "Retail"}, None) == "new_website"
    assert suggest_template({**NO_SITE, "websiteStatus": "UNCERTAIN"}, None) == "website_rescue"


def test_job_params_are_validated_and_capped():
    with pytest.raises(JobError, match="city or a state"):
        validate_params("discover", {"country": "Nigeria"}, SETTINGS)
    with pytest.raises(JobError, match="Batch size"):
        validate_params("discover", {"city": "Abuja", "batch": 100000}, SETTINGS)
    clean = validate_params("discover", {"city": "Abuja", "industries": ["Education", "Bogus"], "batch": 5}, SETTINGS)
    assert clean["industries"] == ["Education"] and clean["batch"] == 5
    with pytest.raises(JobError):
        validate_params("audit", {"prospectIds": [str(i) for i in range(1000)]}, SETTINGS)
    with pytest.raises(JobError):
        validate_params("nuke", {}, SETTINGS)

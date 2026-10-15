"""Explainable, rule-based lead scoring (0–100).

Every point comes with the factor and the evidence behind it, so the
dashboard can show exactly why a lead scored what it did. The score ranks
fit for my services; it is not a prediction of a sale.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

INDUSTRY_SERVICE = {
    "Education": "School website",
    "Food & drink": "Restaurant website with menu & ordering",
    "Hospitality": "Hotel website with booking enquiries",
    "Retail": "E-commerce store",
    "Fashion": "E-commerce store",
    "Real estate": "Property listings website",
    "Health": "Clinic website with appointment requests",
    "Professional services": "Professional business website",
    "Logistics": "Logistics website with quote requests",
    "Beauty & wellness": "Salon website with booking",
    "Automotive": "Business website with service enquiries",
    "Agriculture": "Business website or online store",
    "Events & entertainment": "Events website with ticketing or enquiries",
}

PRIORITY_RANK = {"high": 3, "medium": 2, "low": 1, "none": 0}


def _factor(factors, name, points, evidence):
    factors.append({"factor": name, "points": points, "evidence": evidence})


def score_prospect(prospect: dict, audit_findings: list[dict] | None, settings: dict, *, last_contacted_at: datetime | None = None, suppressed: bool = False, now: datetime | None = None) -> dict:
    cfg = settings["scoring"]
    w = cfg["weights"]
    now = now or datetime.now(timezone.utc)
    factors: list[dict] = []

    if prospect.get("doNotContact") or suppressed or prospect.get("stage") == "DO_NOT_CONTACT":
        return {
            "score": 0,
            "qualification": "do_not_contact",
            "factors": [{"factor": "Do not contact", "points": 0, "evidence": "On the do-not-contact list."}],
            "recommendedService": None,
            "nextAction": "None (do not contact)",
        }

    status = prospect.get("websiteStatus") or "UNCHECKED"
    service = None
    if status == "NONE_FOUND":
        _factor(factors, "No website found", w["no_website"], prospect.get("websiteEvidence") or "No website in the sources checked.")
        service = INDUSTRY_SERVICE.get(prospect.get("industry") or "", "Business website")
    elif status == "UNCERTAIN":
        _factor(factors, "Listed website not loading", w["website_unreachable"], prospect.get("websiteEvidence") or "Listed website couldn't be loaded.")
        service = "Website rescue / rebuild"
    elif audit_findings:
        problems = [f for f in audit_findings if f.get("status") in ("fail", "warn")]
        by_key = {f["key"]: f for f in problems}
        if "https" in by_key and by_key["https"]["status"] == "fail":
            _factor(factors, "No HTTPS", w["no_https"], by_key["https"]["evidence"])
        if "viewport" in by_key:
            _factor(factors, "Not mobile-friendly", w["not_mobile_friendly"], by_key["viewport"]["evidence"])
        perf = by_key.get("pagespeed_performance")
        if perf and perf["status"] == "fail":
            _factor(factors, "Slow on mobile", w["slow_performance"], perf["evidence"])
        for key in ("title", "meta_description"):
            if key in by_key and by_key[key]["status"] == "fail":
                _factor(factors, f"Missing {by_key[key]['label'].lower()}", w["missing_title_or_description"], by_key[key]["evidence"])
                break
        counted = {"https", "viewport", "pagespeed_performance", "title", "meta_description"}
        extra = 0
        for f in problems:
            if f["key"] in counted:
                continue
            if f["priority"] == "high":
                extra += w["high_priority_finding"]
            elif f["priority"] == "medium":
                extra += w["medium_priority_finding"]
        if extra:
            extra = min(extra, 24)
            names = ", ".join(f["label"] for f in problems if f["key"] not in counted and f["priority"] in ("high", "medium"))
            _factor(factors, "Other website issues", extra, names[:300])
        ranked = sorted(problems, key=lambda f: PRIORITY_RANK.get(f["priority"], 0), reverse=True)
        service = next((f["service"] for f in ranked if f.get("service")), None)
        if not problems:
            _factor(factors, "Website in good shape", 0, "The audit found no notable issues.")
    elif prospect.get("website"):
        _factor(factors, "Website not audited yet", 0, "Run an audit to score the website's condition.")

    if prospect.get("phone") or prospect.get("email"):
        channels = ", ".join(c for c, v in (("phone", prospect.get("phone")), ("email", prospect.get("email"))) if v)
        _factor(factors, "Public contact channel", w["contact_channel"], f"Listed {channels}.")

    location_text = " ".join(str(prospect.get(k) or "") for k in ("city", "state", "address")).lower()
    target = next((loc for loc in cfg["target_locations"] if loc.lower() in location_text), None)
    if target:
        _factor(factors, "Target location", w["target_location"], f"Located in {target}.")

    if prospect.get("industry") and prospect["industry"] in cfg["target_industries"]:
        _factor(factors, "Target industry", w["target_industry"], prospect["industry"])

    if last_contacted_at:
        days = int(cfg.get("recent_contact_days", 60))
        if last_contacted_at > now - timedelta(days=days):
            _factor(factors, "Contacted recently", w["recently_contacted"], f"Last outreach logged {last_contacted_at.date().isoformat()}.")

    score = max(0, min(100, sum(f["points"] for f in factors)))
    if score >= cfg["qualified_threshold"]:
        qualification = "qualified"
    elif score >= cfg["review_threshold"]:
        qualification = "review"
    else:
        qualification = "low"

    has_contact = bool(prospect.get("phone") or prospect.get("email"))
    if status == "UNCHECKED" and prospect.get("website"):
        next_action = "Check the website"
    elif prospect.get("website") and not audit_findings and status in ("VERIFIED", "FOUND_UNVERIFIED"):
        next_action = "Run a website audit"
    elif qualification == "qualified" and has_contact:
        next_action = "Draft outreach"
    elif qualification == "qualified":
        next_action = "Find a contact channel"
    elif qualification == "review":
        next_action = "Review manually"
    else:
        next_action = "Keep for later or archive"

    return {
        "score": score,
        "qualification": qualification,
        "factors": factors,
        "recommendedService": service,
        "nextAction": next_action,
    }

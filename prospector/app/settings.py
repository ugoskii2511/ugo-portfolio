"""Admin-editable settings, stored as JSON in "ProspectorSetting".

Every key has a safe default here; the database only holds overrides. Values
are merged one level deep so a partial update can't wipe sibling options.
"""

from __future__ import annotations

import copy
from typing import Any

from app.db import Json, execute, fetch_all

DEFAULTS: dict[str, Any] = {
    "limits": {
        # Daily request caps per provider (all free services; the caps keep us
        # polite and stop runaway jobs).
        "overpass_per_day": 60,
        "nominatim_per_day": 120,
        "site_fetch_per_day": 1500,
        "pagespeed_per_day": 150,
        "ai_per_day": 0,
        # Job size caps.
        "max_discovery_batch": 150,
        "max_audit_batch": 30,
        # Warn on the dashboard at this fraction of any daily cap.
        "alert_ratio": 0.8,
    },
    "scoring": {
        "weights": {
            "no_website": 35,
            "website_unreachable": 30,
            "no_https": 15,
            "not_mobile_friendly": 15,
            "slow_performance": 10,
            "missing_title_or_description": 6,
            "high_priority_finding": 6,
            "medium_priority_finding": 3,
            "contact_channel": 10,
            "target_location": 10,
            "target_industry": 10,
            "recently_contacted": -40,
        },
        "target_industries": [
            "Education",
            "Hospitality",
            "Food & drink",
            "Retail",
            "Real estate",
            "Health",
            "Professional services",
            "Logistics",
            "Beauty & wellness",
        ],
        "target_locations": ["Abuja", "Federal Capital Territory", "FCT"],
        "qualified_threshold": 60,
        "review_threshold": 35,
        "recent_contact_days": 60,
    },
    "followups": {
        # Days after a logged first contact.
        "schedule_days": [4, 10],
    },
    "retention": {
        # Discovered prospects never contacted are archived after this long,
        # and archived ones deleted after the second period. 0 disables.
        "archive_uncontacted_after_days": 180,
        "delete_archived_after_days": 365,
    },
    "audit": {
        "use_pagespeed": True,
        "max_links_checked": 12,
    },
    "outreach": {
        "sender_name": "Ugochukwu Chukwu Christian",
        "sender_title": "Software engineer",
        "contact_line": "WhatsApp: +234 906 560 6430",
    },
    "ai": {"provider": "none"},
    # Saved discovery searches run automatically by the scheduler.
    "schedules": [],
}


def _merge(base: Any, override: Any) -> Any:
    if isinstance(base, dict) and isinstance(override, dict):
        merged = dict(base)
        for key, value in override.items():
            merged[key] = _merge(base.get(key), value) if key in base else value
        return merged
    return override if override is not None else base


def load_settings(conn) -> dict[str, Any]:
    settings = copy.deepcopy(DEFAULTS)
    for row in fetch_all(conn, 'SELECT key, value FROM "ProspectorSetting"'):
        if row["key"] in settings:
            settings[row["key"]] = _merge(settings[row["key"]], row["value"])
    return settings


def save_setting(conn, key: str, value: Any) -> None:
    if key not in DEFAULTS:
        raise ValueError(f"Unknown setting: {key}")
    execute(
        conn,
        'INSERT INTO "ProspectorSetting"(key, value, "updatedAt") VALUES (%s, %s, now()) '
        'ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = now()',
        (key, Json(value)),
    )

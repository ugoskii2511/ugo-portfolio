"""Prospect persistence with deduplication.

A record is a duplicate of an existing prospect when any of these match:
1. same source + sourceRef (e.g. the same OSM node found twice);
2. same website domain;
3. same normalised name in the same city (or both city-less).
Duplicates never overwrite existing data; they only fill blank contact
fields, so manual edits are preserved.
"""

from __future__ import annotations

from app.db import execute, fetch_one, new_id
from app.discovery.normalize import (
    normalize_email,
    normalize_name,
    normalize_phone,
    normalize_website,
    website_domain,
)

FILLABLE = ("website", "websiteDomain", "phone", "email", "address", "industry", "category", "latitude", "longitude")


def prepare(record: dict) -> dict:
    """Normalise a raw record (from any source) into Prospect columns."""
    name = (record.get("businessName") or "").strip()
    if not name:
        raise ValueError("Business name is required")
    website = normalize_website(record.get("website"))
    city = (record.get("city") or "").strip() or None
    return {
        "businessName": name[:200],
        "normalizedName": normalize_name(name)[:200],
        "industry": record.get("industry"),
        "category": record.get("category"),
        "address": record.get("address"),
        "city": city,
        "state": (record.get("state") or "").strip() or None,
        "country": (record.get("country") or "Nigeria").strip() or "Nigeria",
        "latitude": record.get("latitude"),
        "longitude": record.get("longitude"),
        "website": website,
        "websiteDomain": website_domain(website),
        "phone": normalize_phone(record.get("phone")) if record.get("phone") else None,
        "email": normalize_email(record.get("email")) if record.get("email") else None,
        "source": record.get("source") or "manual",
        "sourceRef": record.get("sourceRef"),
        "sourceUrl": record.get("sourceUrl"),
        "sourceLicense": record.get("sourceLicense"),
    }


def find_duplicate(conn, data: dict) -> dict | None:
    if data.get("sourceRef"):
        row = fetch_one(
            conn,
            'SELECT * FROM "Prospect" WHERE source = %s AND "sourceRef" = %s',
            (data["source"], data["sourceRef"]),
        )
        if row:
            return row
    if data.get("websiteDomain"):
        row = fetch_one(conn, 'SELECT * FROM "Prospect" WHERE "websiteDomain" = %s LIMIT 1', (data["websiteDomain"],))
        if row:
            return row
    if data.get("normalizedName"):
        row = fetch_one(
            conn,
            'SELECT * FROM "Prospect" WHERE "normalizedName" = %s AND '
            'COALESCE(lower(city), \'\') = COALESCE(lower(%s), \'\') LIMIT 1',
            (data["normalizedName"], data.get("city")),
        )
        if row:
            return row
    return None


def is_suppressed(conn, data: dict) -> bool:
    checks = [("email", data.get("email")), ("phone", data.get("phone")), ("domain", data.get("websiteDomain"))]
    for kind, value in checks:
        if value and fetch_one(conn, 'SELECT 1 FROM "Suppression" WHERE kind = %s AND value = %s', (kind, value)):
            return True
    return False


def upsert(conn, record: dict, *, job_id: str | None = None, initial_stage: str = "DISCOVERED") -> tuple[str, str]:
    """Insert or merge. Returns (outcome, prospect_id); outcome is
    "created" | "duplicate" | "suppressed"."""
    data = prepare(record)
    existing = find_duplicate(conn, data)
    if existing:
        fills = {k: data[k] for k in FILLABLE if data.get(k) is not None and existing.get(k) in (None, "")}
        if fills:
            sets = ", ".join(f'"{k}" = %s' for k in fills)
            execute(conn, f'UPDATE "Prospect" SET {sets}, "updatedAt" = now() WHERE id = %s', (*fills.values(), existing["id"]))
        return "duplicate", existing["id"]

    suppressed = is_suppressed(conn, data)
    prospect_id = new_id()
    stage = "DO_NOT_CONTACT" if suppressed else initial_stage
    if data["website"]:
        website_status, evidence = "UNCHECKED", None
    else:
        website_status = "NONE_FOUND"
        evidence = _no_website_evidence(data["source"])
    columns = {
        "id": prospect_id,
        **data,
        "websiteStatus": website_status,
        "websiteEvidence": evidence,
        "discoveryJobId": job_id,
        "stage": stage,
        "doNotContact": suppressed,
    }
    names = ", ".join(f'"{k}"' for k in columns)
    placeholders = ", ".join(["%s"] * len(columns))
    execute(
        conn,
        f'INSERT INTO "Prospect" ({names}, "createdAt", "updatedAt", "discoveredAt") '
        f"VALUES ({placeholders}, now(), now(), now())",
        tuple(columns.values()),
    )
    log_event(conn, prospect_id, "discovered", f"Added from {data['source']}", data={"jobId": job_id})
    return ("suppressed" if suppressed else "created"), prospect_id


def _no_website_evidence(source: str) -> str:
    if source == "openstreetmap":
        return "No website listed on OpenStreetMap. Not yet checked elsewhere."
    return "No website provided. Not yet checked elsewhere."


def log_event(conn, prospect_id: str, type_: str, summary: str, *, channel: str | None = None, data: dict | None = None) -> None:
    from app.db import Json

    execute(
        conn,
        'INSERT INTO "ProspectEvent"(id, "prospectId", type, channel, summary, data, "createdAt") '
        "VALUES (%s, %s, %s, %s, %s, %s, now())",
        (new_id(), prospect_id, type_, channel, summary[:500], Json(data) if data is not None else None),
    )

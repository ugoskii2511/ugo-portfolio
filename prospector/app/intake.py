"""Manual entry, CSV import and inbound requests: all through upsert()."""

from __future__ import annotations

import csv
import io

from app import crm
from app.db import execute
from app.prospects import log_event, upsert

MAX_CSV_BYTES = 1_000_000
MAX_CSV_ROWS = 2000

# Accepted CSV headers (case/space-insensitive) -> Prospect fields.
CSV_FIELDS = {
    "business name": "businessName",
    "businessname": "businessName",
    "name": "businessName",
    "website": "website",
    "url": "website",
    "email": "email",
    "phone": "phone",
    "industry": "industry",
    "category": "category",
    "address": "address",
    "city": "city",
    "state": "state",
    "country": "country",
}


class IntakeError(ValueError):
    pass


def create_manual(conn, settings: dict, data: dict, *, actor: str) -> dict:
    record = {k: data.get(k) for k in ("businessName", "website", "email", "phone", "industry", "category", "address", "city", "state", "country")}
    record["source"] = "manual"
    if not (record.get("businessName") or "").strip():
        raise IntakeError("Business name is required.")
    outcome, prospect_id = upsert(conn, record, initial_stage="NEEDS_REVIEW")
    if outcome == "created":
        log_event(conn, prospect_id, "created_manually", "Added manually", data={"by": actor})
        crm.rescore(conn, settings, prospect_id)
    return {"outcome": outcome, "id": prospect_id}


def import_csv(conn, settings: dict, text: str, *, actor: str) -> dict:
    if len(text.encode("utf-8")) > MAX_CSV_BYTES:
        raise IntakeError("CSV is larger than 1 MB. Split it into smaller files.")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise IntakeError("CSV has no header row.")
    mapping = {h: CSV_FIELDS.get(h.strip().lower()) for h in reader.fieldnames}
    if "businessName" not in mapping.values():
        raise IntakeError("CSV needs a 'business name' (or 'name') column.")
    summary = {"created": 0, "duplicate": 0, "suppressed": 0, "invalid": 0, "errors": []}
    for line_no, row in enumerate(reader, start=2):
        if line_no - 1 > MAX_CSV_ROWS:
            summary["errors"].append(f"Stopped after {MAX_CSV_ROWS} rows.")
            break
        record = {field: (row.get(header) or "").strip() or None for header, field in mapping.items() if field}
        record["source"] = "csv"
        if not record.get("businessName"):
            summary["invalid"] += 1
            if len(summary["errors"]) < 10:
                summary["errors"].append(f"Row {line_no}: missing business name")
            continue
        try:
            outcome, prospect_id = upsert(conn, record, initial_stage="NEEDS_REVIEW")
        except ValueError as exc:
            summary["invalid"] += 1
            if len(summary["errors"]) < 10:
                summary["errors"].append(f"Row {line_no}: {exc}")
            continue
        summary[outcome] += 1
        if outcome == "created":
            crm.rescore(conn, settings, prospect_id)
    return summary


def inbound_audit_request(conn, settings: dict, data: dict) -> dict:
    """A visitor asked for a free website review on the public site.

    They contacted us, so this is consented, inbound interest: it goes to
    NEEDS_REVIEW with the request recorded in its history.
    """
    record = {
        "businessName": data.get("businessName") or data.get("name"),
        "website": data.get("website"),
        "email": data.get("email"),
        "phone": data.get("phone"),
        "city": data.get("city"),
        "source": "inbound",
    }
    outcome, prospect_id = upsert(conn, record, initial_stage="NEEDS_REVIEW")
    log_event(
        conn,
        prospect_id,
        "inbound_request",
        f"Requested a free website review ({data.get('name') or 'visitor'})",
        data={k: data.get(k) for k in ("name", "email", "phone", "website", "message")},
    )
    # Inbound interest is the warmest lead there is: flag it high priority
    # (also when the business was already in the CRM from discovery).
    execute(conn, 'UPDATE "Prospect" SET priority = GREATEST(priority, 1), "updatedAt" = now() WHERE id = %s', (prospect_id,))
    crm.rescore(conn, settings, prospect_id)
    return {"outcome": outcome, "id": prospect_id}

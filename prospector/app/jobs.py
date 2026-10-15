"""Background jobs, built for serverless execution.

A job is a database row processed in bounded steps (~40s). Each step first
takes a lease with an atomic UPDATE, so two invocations (dashboard + cron)
can never work the same job at once. State lives in the row, so a step can
stop anywhere and the next one resumes. Failures pause the job with the
error recorded; it retries on the next step until MAX_ATTEMPTS.
"""

from __future__ import annotations

import time
import traceback
from datetime import datetime, timezone

from psycopg.errors import UniqueViolation

from app import crm
from app.db import Json, connect, execute, fetch_all, fetch_one, new_id
from app.discovery.industries import INDUSTRIES
from app.discovery.osm import BBox, ProviderError, build_query, element_to_record, geocode, run_overpass, tiles
from app.prospects import log_event, upsert
from app.settings import load_settings
from app.usage import UsageLimitReached, try_consume
from app.web.audit import run_audit
from app.web.pagespeed import pagespeed_findings, run_pagespeed
from app.web.website_status import check_listed_website, search_candidate_domains

LEASE_SECONDS = 75
STEP_BUDGET_S = 40.0
MAX_ATTEMPTS = 5
JOB_TYPES = ("discover", "verify", "audit", "score")


class JobError(ValueError):
    pass


# ---------------------------------------------------------------------------
# Creation & validation
# ---------------------------------------------------------------------------


def validate_params(job_type: str, params: dict, settings: dict) -> dict:
    limits = settings["limits"]
    if job_type == "discover":
        country = str(params.get("country") or "Nigeria").strip()[:80]
        city = (str(params.get("city") or "").strip() or None)
        state = (str(params.get("state") or "").strip() or None)
        if not city and not state:
            raise JobError("Choose a city or a state/region to search.")
        industries = [i for i in params.get("industries") or [] if i in INDUSTRIES]
        website_filter = params.get("websiteFilter") or "any"
        if website_filter not in ("any", "with_website", "without_website"):
            raise JobError("Invalid website filter.")
        batch = int(params.get("batch") or 25)
        max_batch = int(limits["max_discovery_batch"])
        if not 1 <= batch <= max_batch:
            raise JobError(f"Batch size must be between 1 and {max_batch} (Settings → limits).")
        return {
            "country": country,
            "state": state,
            "city": city,
            "industries": industries,
            "websiteFilter": website_filter,
            "batch": batch,
            "verify": bool(params.get("verify", True)),
        }
    if job_type in ("verify", "audit", "score"):
        ids = [str(i) for i in params.get("prospectIds") or []][:500]
        scope = params.get("scope")
        if not ids and scope not in ("unchecked", "unscored", "all_active", "stale"):
            raise JobError("Give prospect IDs or a scope.")
        cap = int(limits["max_audit_batch"]) if job_type == "audit" else 500
        if len(ids) > cap:
            raise JobError(f"At most {cap} prospects per {job_type} job.")
        return {"prospectIds": ids, "scope": scope, "limit": min(int(params.get("limit") or cap), cap), "pagespeed": bool(params.get("pagespeed", True))}
    raise JobError(f"Unknown job type: {job_type}")


def create_job(conn, job_type: str, params: dict, *, created_by: str | None, idempotency_key: str | None = None) -> dict:
    settings = load_settings(conn)
    clean = validate_params(job_type, params, settings)
    if idempotency_key:
        existing = fetch_one(conn, 'SELECT * FROM "ProspectJob" WHERE "idempotencyKey" = %s', (idempotency_key,))
        if existing:
            return existing
    job_id = new_id()
    try:
        execute(
            conn,
            'INSERT INTO "ProspectJob"(id, type, status, params, state, processed, attempts, "idempotencyKey", "createdBy", log, "createdAt") '
            "VALUES (%s, %s, 'queued', %s, %s, 0, 0, %s, %s, %s, now())",
            (job_id, job_type, Json(clean), Json({}), idempotency_key, created_by, Json([])),
        )
    except UniqueViolation:
        conn.rollback()
        return fetch_one(conn, 'SELECT * FROM "ProspectJob" WHERE "idempotencyKey" = %s', (idempotency_key,))
    return fetch_one(conn, 'SELECT * FROM "ProspectJob" WHERE id = %s', (job_id,))


# ---------------------------------------------------------------------------
# Leasing
# ---------------------------------------------------------------------------


def claim(conn, job_id: str) -> dict | None:
    row = fetch_one(
        conn,
        'UPDATE "ProspectJob" SET status = %s, "leaseUntil" = now() + make_interval(secs => %s), '
        '"startedAt" = COALESCE("startedAt", now()) '
        "WHERE id = %s AND status IN ('queued', 'running') "
        'AND ("leaseUntil" IS NULL OR "leaseUntil" < now()) RETURNING *',
        ("running", LEASE_SECONDS, job_id),
    )
    conn.commit()
    return row


def _append_log(job: dict, message: str) -> list:
    log = list(job.get("log") or [])
    log.append({"at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "msg": message[:500]})
    return log[-60:]


def _save(conn, job: dict, *, status: str, state: dict, processed: int, total: int | None, log: list, error: str | None, attempts: int) -> None:
    execute(
        conn,
        'UPDATE "ProspectJob" SET status = %s, state = %s, processed = %s, total = %s, log = %s, error = %s, attempts = %s, '
        '"leaseUntil" = NULL, "finishedAt" = CASE WHEN %s IN (\'done\', \'failed\', \'cancelled\') THEN now() ELSE NULL END '
        "WHERE id = %s",
        (status, Json(state), processed, total, Json(log), error, attempts, status, job["id"]),
    )
    conn.commit()


def run_step(job_id: str, *, budget_s: float = STEP_BUDGET_S) -> dict:
    """Run one bounded step. Returns the updated job row (or why it didn't run)."""
    deadline = time.monotonic() + budget_s
    with connect() as conn:
        job = claim(conn, job_id)
        if not job:
            current = fetch_one(conn, 'SELECT * FROM "ProspectJob" WHERE id = %s', (job_id,))
            if not current:
                raise JobError("Job not found")
            return {**current, "_skipped": "Job is finished or another step is already running."}
        settings = load_settings(conn)
        state = dict(job.get("state") or {})
        handler = HANDLERS[job["type"]]
        try:
            result = handler(conn, job, state, settings, deadline)
            conn.commit()
        except UsageLimitReached as exc:
            conn.rollback()
            _save(conn, job, status="queued", state=state, processed=job["processed"], total=job.get("total"),
                  log=_append_log(job, f"Paused: {exc}"), error=str(exc), attempts=job["attempts"])
            return fetch_one(conn, 'SELECT * FROM "ProspectJob" WHERE id = %s', (job_id,))
        except (ProviderError, LookupError, JobError) as exc:
            conn.rollback()
            attempts = job["attempts"] + 1
            fatal = isinstance(exc, (LookupError, JobError)) or attempts >= MAX_ATTEMPTS
            _save(conn, job, status="failed" if fatal else "queued", state=state, processed=job["processed"], total=job.get("total"),
                  log=_append_log(job, f"{'Failed' if fatal else 'Will retry'}: {exc}"), error=str(exc)[:500], attempts=attempts)
            return fetch_one(conn, 'SELECT * FROM "ProspectJob" WHERE id = %s', (job_id,))
        except Exception as exc:  # unexpected: record, don't lose the lease forever
            conn.rollback()
            attempts = job["attempts"] + 1
            detail = f"{type(exc).__name__}: {exc}"
            print("job step error", job_id, traceback.format_exc())
            _save(conn, job, status="failed" if attempts >= MAX_ATTEMPTS else "queued", state=state, processed=job["processed"],
                  total=job.get("total"), log=_append_log(job, f"Error: {detail}"), error=detail[:500], attempts=attempts)
            return fetch_one(conn, 'SELECT * FROM "ProspectJob" WHERE id = %s', (job_id,))

        log = job.get("log") or []
        for message in result.get("messages", []):
            log = _append_log({**job, "log": log}, message)
        _save(conn, job, status="done" if result["done"] else "queued", state=result["state"],
              processed=result["processed"], total=result.get("total"), log=log, error=None, attempts=0)
        if result["done"]:
            for follow_up in result.get("then", []):
                create_job(conn, follow_up["type"], follow_up["params"], created_by=job.get("createdBy"),
                           idempotency_key=f"{job['id']}:{follow_up['type']}")
            conn.commit()
        return fetch_one(conn, 'SELECT * FROM "ProspectJob" WHERE id = %s', (job_id,))


def cancel(conn, job_id: str) -> None:
    execute(conn, 'UPDATE "ProspectJob" SET status = %s, "finishedAt" = now(), "leaseUntil" = NULL WHERE id = %s AND status IN (%s, %s)',
            ("cancelled", job_id, "queued", "running"))


def retry(conn, job_id: str) -> None:
    execute(conn, 'UPDATE "ProspectJob" SET status = %s, attempts = 0, error = NULL, "finishedAt" = NULL WHERE id = %s AND status = %s',
            ("queued", job_id, "failed"))


# ---------------------------------------------------------------------------
# Handlers: (conn, job, state, settings, deadline) -> result dict
# ---------------------------------------------------------------------------


def _time_left(deadline: float) -> float:
    return deadline - time.monotonic()


def handle_discover(conn, job, state, settings, deadline):
    p = job["params"]
    messages: list[str] = []
    if "tiles" not in state:
        try_consume(conn, settings, "nominatim")
        box, display = geocode(p["country"], p.get("state"), p.get("city"))
        cells = tiles(box)
        state.update({"tiles": [c.as_list() for c in cells], "tile": 0, "created": 0, "duplicates": 0, "suppressed": 0, "newIds": [], "place": display})
        messages.append(f"Searching {display} ({len(cells)} area cell{'s' if len(cells) != 1 else ''}).")
    batch = p["batch"]
    while state["tile"] < len(state["tiles"]) and state["created"] < batch and _time_left(deadline) > 15:
        try_consume(conn, settings, "overpass")
        cell = BBox(*state["tiles"][state["tile"]])
        # Ask for extra rows: some will be duplicates of earlier finds.
        query = build_query(cell, p["industries"], p["websiteFilter"], limit=min(400, (batch - state["created"]) * 3))
        elements = run_overpass(query)
        # Tally locally; merge into state only after the commit, so a failure
        # mid-cell (rolled back) never leaves counters ahead of the database.
        created_ids: list[str] = []
        duplicates = suppressed = 0
        for element in elements:
            if state["created"] + len(created_ids) >= batch:
                break
            record = element_to_record(element)
            if not record:
                continue
            if not record["city"] and p.get("city"):
                record["city"] = p["city"]
            if not record["state"] and p.get("state"):
                record["state"] = p["state"]
            record["country"] = p["country"]
            outcome, prospect_id = upsert(conn, record, job_id=job["id"])
            if outcome == "created":
                crm.rescore(conn, settings, prospect_id)
                created_ids.append(prospect_id)
            elif outcome == "suppressed":
                suppressed += 1
            else:
                duplicates += 1
        conn.commit()
        state["created"] += len(created_ids)
        state["newIds"].extend(created_ids)
        state["duplicates"] += duplicates
        state["suppressed"] += suppressed
        messages.append(f"Area cell {state['tile'] + 1}/{len(state['tiles'])}: {len(elements)} businesses returned, {len(created_ids)} new.")
        state["tile"] += 1
    done = state["created"] >= batch or state["tile"] >= len(state["tiles"])
    then = []
    if done:
        messages.append(
            f"Finished: {state['created']} new prospects, {state['duplicates']} already known, {state['suppressed']} on the do-not-contact list."
            + ("" if state["created"] >= batch else " The area ran out of matching businesses before the batch was filled.")
        )
        if p.get("verify") and state["newIds"]:
            then.append({"type": "verify", "params": {"prospectIds": state["newIds"][:500]}})
    return {"state": state, "processed": state["created"], "total": batch, "done": done, "messages": messages, "then": then}


def _select_ids(conn, job, scope_sql: dict, limit: int) -> list[str]:
    p = job["params"]
    if p.get("prospectIds"):
        return p["prospectIds"]
    sql = scope_sql.get(p.get("scope"))
    if not sql:
        raise JobError("Invalid scope")
    return [r["id"] for r in fetch_all(conn, sql + " LIMIT %s", (limit,))]


def handle_verify(conn, job, state, settings, deadline):
    if "ids" not in state:
        state["ids"] = _select_ids(conn, job, {
            "unchecked": 'SELECT id FROM "Prospect" WHERE "archivedAt" IS NULL AND "doNotContact" = false AND ("websiteStatus" = \'UNCHECKED\' OR ("websiteStatus" = \'NONE_FOUND\' AND "websiteCheckedAt" IS NULL)) ORDER BY "discoveredAt" DESC',
            "stale": 'SELECT id FROM "Prospect" WHERE "archivedAt" IS NULL AND "doNotContact" = false AND "websiteCheckedAt" < now() - interval \'90 days\' ORDER BY "websiteCheckedAt"',
        }, job["params"]["limit"])
        state["index"] = 0
        state["tally"] = {}
    messages = []
    while state["index"] < len(state["ids"]) and _time_left(deadline) > 22:
        prospect_id = state["ids"][state["index"]]
        prospect = fetch_one(conn, 'SELECT * FROM "Prospect" WHERE id = %s', (prospect_id,))
        if not prospect or prospect["doNotContact"]:
            state["index"] += 1
            continue
        if prospect.get("website"):
            try_consume(conn, settings, "site_fetch")
            outcome = check_listed_website(prospect["businessName"], prospect["website"])
        else:
            try_consume(conn, settings, "site_fetch", 3)
            outcome = search_candidate_domains(prospect["businessName"])
        execute(
            conn,
            'UPDATE "Prospect" SET "websiteStatus" = %s, "websiteEvidence" = %s, "websiteCheckedAt" = now(), '
            'website = COALESCE(website, %s), "websiteDomain" = COALESCE("websiteDomain", %s), "updatedAt" = now() WHERE id = %s',
            (outcome.status, outcome.evidence[:500], outcome.website if not prospect.get("website") else None,
             _domain(outcome.website) if not prospect.get("website") else None, prospect_id),
        )
        log_event(conn, prospect_id, "website_checked", f"Website status: {outcome.status.replace('_', ' ').lower()}", data={"evidence": outcome.evidence})
        crm.rescore(conn, settings, prospect_id)
        conn.commit()
        state["index"] += 1
        state["tally"][outcome.status] = state["tally"].get(outcome.status, 0) + 1
    done = state["index"] >= len(state["ids"])
    if done:
        tally = ", ".join(f"{v} {k.replace('_', ' ').lower()}" for k, v in state["tally"].items()) or "nothing to check"
        messages.append(f"Website checks finished: {tally}.")
    return {"state": state, "processed": state["index"], "total": len(state["ids"]), "done": done, "messages": messages}


def _domain(url):
    from app.discovery.normalize import website_domain

    return website_domain(url)


def handle_audit(conn, job, state, settings, deadline):
    if "ids" not in state:
        state["ids"] = _select_ids(conn, job, {
            "unchecked": 'SELECT p.id FROM "Prospect" p WHERE p."archivedAt" IS NULL AND p.website IS NOT NULL AND p."websiteStatus" IN (\'VERIFIED\',\'FOUND_UNVERIFIED\') AND NOT EXISTS (SELECT 1 FROM "ProspectAudit" a WHERE a."prospectId" = p.id) ORDER BY p.score DESC NULLS LAST',
        }, job["params"]["limit"])
        state["index"] = 0
        state["phase"] = "html"
        state["completed"] = 0
    messages = []
    max_links = int(settings["audit"]["max_links_checked"])
    use_psi = bool(settings["audit"]["use_pagespeed"]) and job["params"].get("pagespeed", True)
    while state["index"] < len(state["ids"]):
        prospect_id = state["ids"][state["index"]]
        prospect = fetch_one(conn, 'SELECT * FROM "Prospect" WHERE id = %s', (prospect_id,))
        if not prospect or not prospect.get("website"):
            state["index"] += 1
            state["phase"] = "html"
            continue
        if state["phase"] == "html":
            if _time_left(deadline) < 30:
                break
            try_consume(conn, settings, "site_fetch", 1 + max_links)
            result = run_audit(prospect["website"], max_links=max_links, budget_fetches=1 + max_links)
            audit_id = new_id()
            execute(
                conn,
                'INSERT INTO "ProspectAudit"(id, "prospectId", url, "finalUrl", status, "httpStatus", "responseMs", "pageBytes", findings, error, "createdAt") '
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now())",
                (audit_id, prospect_id, prospect["website"], result.final_url, result.status, result.http_status, result.response_ms,
                 result.page_bytes, Json(result.findings), result.error),
            )
            state["auditId"] = audit_id
            conn.commit()
            if use_psi and result.status != "failed":
                state["phase"] = "pagespeed"
                continue
            state["phase"] = "finish"
        if state["phase"] == "pagespeed":
            if _time_left(deadline) < 38:
                break
            try:
                try_consume(conn, settings, "pagespeed")
                psi = run_pagespeed(prospect["website"])
            except UsageLimitReached as exc:
                psi = {"available": False, "reason": str(exc)}
            audit = fetch_one(conn, 'SELECT findings FROM "ProspectAudit" WHERE id = %s', (state["auditId"],))
            findings = list(audit["findings"]) + pagespeed_findings(psi)
            execute(conn, 'UPDATE "ProspectAudit" SET pagespeed = %s, findings = %s WHERE id = %s', (Json(psi), Json(findings), state["auditId"]))
            conn.commit()
            state["phase"] = "finish"
        if state["phase"] == "finish":
            audit = fetch_one(conn, 'SELECT status, findings FROM "ProspectAudit" WHERE id = %s', (state["auditId"],))
            problems = sum(1 for f in audit["findings"] if f.get("status") in ("fail", "warn"))
            log_event(conn, prospect_id, "audit", f"Website audit {audit['status']}: {problems} issue(s) found", data={"auditId": state["auditId"]})
            crm.rescore(conn, settings, prospect_id)
            conn.commit()
            state["completed"] += 1
            state["index"] += 1
            state["phase"] = "html"
    done = state["index"] >= len(state["ids"])
    if done:
        messages.append(f"Audits finished: {state['completed']} website(s) audited.")
    return {"state": state, "processed": state["index"], "total": len(state["ids"]), "done": done, "messages": messages}


def handle_score(conn, job, state, settings, deadline):
    if "ids" not in state:
        state["ids"] = _select_ids(conn, job, {
            "unscored": 'SELECT id FROM "Prospect" WHERE "archivedAt" IS NULL AND "scoredAt" IS NULL',
            "all_active": 'SELECT id FROM "Prospect" WHERE "archivedAt" IS NULL',
        }, job["params"]["limit"])
        state["index"] = 0
    while state["index"] < len(state["ids"]) and _time_left(deadline) > 3:
        crm.rescore(conn, settings, state["ids"][state["index"]])
        state["index"] += 1
        if state["index"] % 50 == 0:
            conn.commit()
    done = state["index"] >= len(state["ids"])
    return {"state": state, "processed": state["index"], "total": len(state["ids"]), "done": done,
            "messages": [f"Rescored {state['index']} prospect(s)."] if done else []}


HANDLERS = {
    "discover": handle_discover,
    "verify": handle_verify,
    "audit": handle_audit,
    "score": handle_score,
}


# ---------------------------------------------------------------------------
# Scheduler (cron)
# ---------------------------------------------------------------------------


def work_queue(*, budget_s: float = 45.0) -> list[dict]:
    """Process queued jobs, oldest first, until the budget runs out."""
    started = time.monotonic()
    worked = []
    while time.monotonic() - started < budget_s - 15:
        with connect() as conn:
            row = fetch_one(
                conn,
                "SELECT id FROM \"ProspectJob\" WHERE status IN ('queued','running') "
                'AND ("leaseUntil" IS NULL OR "leaseUntil" < now()) AND attempts < %s ORDER BY "createdAt" LIMIT 1',
                (MAX_ATTEMPTS,),
            )
        if not row:
            break
        remaining = budget_s - (time.monotonic() - started)
        job = run_step(row["id"], budget_s=min(STEP_BUDGET_S, max(remaining - 5, 5)))
        worked.append({"id": job["id"], "type": job["type"], "status": job["status"]})
        if job.get("_skipped"):
            break
    return worked


def enqueue_scheduled(slot: str) -> list[str]:
    """Create today's discovery jobs for saved schedules in this time slot."""
    created = []
    today = datetime.now(timezone.utc).date().isoformat()
    with connect() as conn:
        settings = load_settings(conn)
        for schedule in settings.get("schedules") or []:
            if not schedule.get("enabled") or slot not in (schedule.get("slots") or ["morning"]):
                continue
            frequency = schedule.get("frequency", "daily")
            if frequency == "weekly" and datetime.now(timezone.utc).weekday() != int(schedule.get("weekday", 0)):
                continue
            try:
                job = create_job(conn, "discover", schedule.get("params") or {}, created_by="scheduler",
                                 idempotency_key=f"schedule:{schedule.get('id')}:{today}:{slot}")
                created.append(job["id"])
            except JobError as exc:
                print("schedule skipped", schedule.get("id"), exc)
    return created


def daily_maintenance() -> dict:
    with connect() as conn:
        settings = load_settings(conn)
        closed = crm.close_followups_for_progressed(conn)
        for row in fetch_all(conn, 'SELECT DISTINCT "prospectId" FROM "FollowUpTask"'):
            crm.sync_follow_up_date(conn, row["prospectId"])
        retention = crm.apply_retention(conn, settings)
        today = datetime.now(timezone.utc).date().isoformat()
        stale = create_job(conn, "verify", {"scope": "stale", "limit": 50}, created_by="scheduler", idempotency_key=f"stale:{today}")
        due = len(crm.due_followups(conn))
    return {"followupsClosed": closed, "retention": retention, "staleVerifyJob": stale["id"], "followupsDue": due}

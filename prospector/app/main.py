"""Prospector API (FastAPI on Vercel).

Called only by the portfolio's admin API (which has already checked the
admin session) using PROSPECTOR_API_SECRET, and by Vercel Cron with
CRON_SECRET. /health is the only public route and reveals nothing.
"""

from __future__ import annotations

from typing import Any, Literal

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app import crm, jobs
from app.db import DatabaseNotConfigured, Json, connect, execute, fetch_one, new_id
from app.intake import IntakeError, create_manual, import_csv, inbound_audit_request
from app.outreach import DraftError, TEMPLATES
from app.security import require_admin, require_cron
from app.settings import DEFAULTS, load_settings, save_setting
from app.usage import usage_today

app = FastAPI(title="Prospector", docs_url=None, redoc_url=None, openapi_url=None)


@app.exception_handler(DatabaseNotConfigured)
def _no_db(_request, _exc):
    return JSONResponse({"detail": "Database is not configured"}, status_code=503)


def _audit(conn, actor: str, action: str, target: str | None = None, details: dict | None = None) -> None:
    execute(
        conn,
        'INSERT INTO "AdminAuditLog"(id, actor, action, target, details, "createdAt") VALUES (%s, %s, %s, %s, %s, now())',
        (new_id(), actor, action, target, Json(details) if details is not None else None),
    )


def _settings_with_portfolio(conn) -> dict:
    from app.config import config

    settings = load_settings(conn)
    settings["_portfolio_url"] = config.portfolio_url
    return settings


def _bad_request(exc: Exception):
    raise HTTPException(status_code=400, detail=str(exc))


# --------------------------------------------------------------------- health


@app.get("/health")
def health():
    return {"ok": True}


# ----------------------------------------------------------------------- jobs


class JobIn(BaseModel):
    type: Literal["discover", "verify", "audit", "score"]
    params: dict[str, Any] = Field(default_factory=dict)
    idempotencyKey: str | None = Field(default=None, max_length=120)


@app.post("/jobs")
def create_job(body: JobIn, actor: str = Depends(require_admin)):
    with connect() as conn:
        try:
            job = jobs.create_job(conn, body.type, body.params, created_by=actor, idempotency_key=body.idempotencyKey)
        except jobs.JobError as exc:
            _bad_request(exc)
        _audit(conn, actor, f"job.create.{body.type}", job["id"], body.params)
    return job


@app.post("/jobs/{job_id}/step")
def step_job(job_id: str, _actor: str = Depends(require_admin)):
    try:
        return jobs.run_step(job_id)
    except jobs.JobError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/jobs/{job_id}/cancel")
def cancel_job(job_id: str, actor: str = Depends(require_admin)):
    with connect() as conn:
        jobs.cancel(conn, job_id)
        _audit(conn, actor, "job.cancel", job_id)
        return fetch_one(conn, 'SELECT * FROM "ProspectJob" WHERE id = %s', (job_id,))


@app.post("/jobs/{job_id}/retry")
def retry_job(job_id: str, actor: str = Depends(require_admin)):
    with connect() as conn:
        jobs.retry(conn, job_id)
        _audit(conn, actor, "job.retry", job_id)
        return fetch_one(conn, 'SELECT * FROM "ProspectJob" WHERE id = %s', (job_id,))


# ------------------------------------------------------------------ prospects


class ProspectIn(BaseModel):
    businessName: str = Field(min_length=1, max_length=200)
    website: str | None = Field(default=None, max_length=500)
    email: str | None = Field(default=None, max_length=200)
    phone: str | None = Field(default=None, max_length=60)
    industry: str | None = Field(default=None, max_length=80)
    category: str | None = Field(default=None, max_length=80)
    address: str | None = Field(default=None, max_length=300)
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    country: str | None = Field(default=None, max_length=80)


@app.post("/prospects")
def create_prospect(body: ProspectIn, actor: str = Depends(require_admin)):
    with connect() as conn:
        try:
            result = create_manual(conn, _settings_with_portfolio(conn), body.model_dump(), actor=actor)
        except (IntakeError, ValueError) as exc:
            _bad_request(exc)
        _audit(conn, actor, "prospect.create", result["id"], {"outcome": result["outcome"]})
    return result


class CsvIn(BaseModel):
    csv: str = Field(max_length=1_100_000)


@app.post("/prospects/import")
def import_prospects(body: CsvIn, actor: str = Depends(require_admin)):
    with connect() as conn:
        try:
            summary = import_csv(conn, _settings_with_portfolio(conn), body.csv, actor=actor)
        except IntakeError as exc:
            _bad_request(exc)
        _audit(conn, actor, "prospect.import_csv", None, {k: v for k, v in summary.items() if k != "errors"})
    return summary


@app.post("/prospects/{prospect_id}/score")
def score_one(prospect_id: str, actor: str = Depends(require_admin)):
    with connect() as conn:
        try:
            return crm.rescore(conn, _settings_with_portfolio(conn), prospect_id)
        except crm.CrmError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc


class DncIn(BaseModel):
    reason: str = Field(min_length=1, max_length=300)


@app.post("/prospects/{prospect_id}/do-not-contact")
def do_not_contact(prospect_id: str, body: DncIn, actor: str = Depends(require_admin)):
    with connect() as conn:
        try:
            crm.mark_do_not_contact(conn, prospect_id, reason=body.reason, actor=actor)
        except crm.CrmError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        _audit(conn, actor, "prospect.do_not_contact", prospect_id, {"reason": body.reason})
    return {"ok": True}


# ------------------------------------------------------------------- outreach


class DraftIn(BaseModel):
    template: str | None = None


@app.get("/outreach/templates")
def templates(_actor: str = Depends(require_admin)):
    return TEMPLATES


@app.post("/prospects/{prospect_id}/drafts")
def create_draft(prospect_id: str, body: DraftIn, actor: str = Depends(require_admin)):
    with connect() as conn:
        try:
            draft = crm.create_draft(conn, _settings_with_portfolio(conn), prospect_id, body.template)
        except (DraftError, crm.CrmError) as exc:
            _bad_request(exc)
        _audit(conn, actor, "draft.create", draft["id"], {"template": draft["template"]})
    return draft


class SentIn(BaseModel):
    channel: Literal["email", "whatsapp", "phone", "other"] | None = None


@app.post("/drafts/{draft_id}/sent")
def mark_sent(draft_id: str, body: SentIn, actor: str = Depends(require_admin)):
    with connect() as conn:
        try:
            result = crm.mark_sent(conn, _settings_with_portfolio(conn), draft_id, actor=actor, channel=body.channel)
        except crm.CrmError as exc:
            _bad_request(exc)
        if not result["alreadySent"]:
            _audit(conn, actor, "draft.sent", draft_id, {"channel": body.channel})
    return result


# ------------------------------------------------------------------- inbound


class InboundIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    businessName: str = Field(min_length=2, max_length=200)
    email: str = Field(min_length=5, max_length=200)
    phone: str | None = Field(default=None, max_length=60)
    website: str | None = Field(default=None, max_length=500)
    message: str | None = Field(default=None, max_length=2000)


@app.post("/inbound/audit-request")
def inbound(body: InboundIn, _actor: str = Depends(require_admin)):
    with connect() as conn:
        settings = _settings_with_portfolio(conn)
        result = inbound_audit_request(conn, settings, body.model_dump())
        prospect = fetch_one(conn, 'SELECT website, "websiteStatus" FROM "Prospect" WHERE id = %s', (result["id"],))
        conn.commit()
        if prospect and prospect["website"]:
            jobs.create_job(conn, "verify", {"prospectIds": [result["id"]]}, created_by="inbound", idempotency_key=f"inbound-verify:{result['id']}")
            jobs.create_job(conn, "audit", {"prospectIds": [result["id"]]}, created_by="inbound", idempotency_key=f"inbound-audit:{result['id']}")
    return result


# ------------------------------------------------------------------- settings


@app.get("/settings")
def get_settings(_actor: str = Depends(require_admin)):
    with connect() as conn:
        settings = load_settings(conn)
        return {"settings": settings, "usage": usage_today(conn, settings), "keys": list(DEFAULTS)}


class SettingIn(BaseModel):
    value: Any


@app.put("/settings/{key}")
def put_setting(key: str, body: SettingIn, actor: str = Depends(require_admin)):
    if key not in DEFAULTS:
        raise HTTPException(status_code=404, detail="Unknown setting")
    _validate_setting(key, body.value)
    with connect() as conn:
        save_setting(conn, key, body.value)
        _audit(conn, actor, f"settings.{key}", key, {"value": body.value})
        return {"settings": load_settings(conn)}


def _validate_setting(key: str, value: Any) -> None:
    if key == "limits":
        if not isinstance(value, dict) or any(not isinstance(v, (int, float)) or v < 0 for v in value.values()):
            raise HTTPException(status_code=400, detail="Limits must be non-negative numbers")
    elif key == "schedules":
        if not isinstance(value, list) or len(value) > 20:
            raise HTTPException(status_code=400, detail="Schedules must be a list (max 20)")
        for schedule in value:
            try:
                with connect() as conn:
                    jobs.validate_params("discover", schedule.get("params") or {}, load_settings(conn))
            except jobs.JobError as exc:
                raise HTTPException(status_code=400, detail=f"Schedule “{schedule.get('name', '')}”: {exc}") from exc
    elif not isinstance(value, (dict, list)):
        raise HTTPException(status_code=400, detail="Invalid value")


# --------------------------------------------------------------------- cron


@app.get("/cron/tick")
def cron_tick(slot: str = "morning", _=Depends(require_cron)):
    created = jobs.enqueue_scheduled(slot)
    worked = jobs.work_queue(budget_s=50.0)
    return {"scheduled": created, "worked": worked}


@app.get("/cron/daily")
def cron_daily(_=Depends(require_cron)):
    result = jobs.daily_maintenance()
    worked = jobs.work_queue(budget_s=40.0)
    return {**result, "worked": worked}

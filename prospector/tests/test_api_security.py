import pytest
from fastapi.testclient import TestClient

import app.security as security
from app.config import Config
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def secrets(monkeypatch):
    cfg = Config(None, "admin-secret-123", "cron-secret-456", None, "ua", "", "https://ugobuildsweb.name.ng")
    monkeypatch.setattr(security, "config", cfg)


def test_health_is_public_and_reveals_nothing():
    response = client.get("/health")
    assert response.status_code == 200 and response.json() == {"ok": True}


@pytest.mark.parametrize(
    "method,path",
    [
        ("post", "/jobs"),
        ("post", "/jobs/x/step"),
        ("post", "/prospects"),
        ("post", "/prospects/import"),
        ("post", "/prospects/x/drafts"),
        ("post", "/drafts/x/sent"),
        ("post", "/inbound/audit-request"),
        ("get", "/settings"),
        ("put", "/settings/limits"),
    ],
)
def test_admin_routes_reject_missing_or_wrong_secret(method, path):
    def call(headers=None):
        kwargs = {"headers": headers or {}}
        if method != "get":
            kwargs["json"] = {}
        return getattr(client, method)(path, **kwargs)

    assert call().status_code == 401
    assert call({"Authorization": "Bearer wrong"}).status_code == 401
    # The cron secret must not unlock admin routes.
    assert call({"Authorization": "Bearer cron-secret-456"}).status_code == 401


def test_cron_routes_need_cron_secret():
    assert client.get("/cron/tick").status_code == 401
    assert client.get("/cron/daily", headers={"Authorization": "Bearer admin-secret-123"}).status_code == 401


def test_unconfigured_secret_fails_closed(monkeypatch):
    monkeypatch.setattr(security, "config", Config(None, None, None, None, "ua", "", ""))
    assert client.get("/settings", headers={"Authorization": "Bearer "}).status_code == 401
    assert client.get("/settings", headers={"Authorization": "Bearer None"}).status_code == 401


def test_valid_secret_passes_auth_then_validates_input():
    # Auth passes; invalid body is rejected by validation (422), before any DB use.
    response = client.post("/jobs", json={"type": "nuke"}, headers={"Authorization": "Bearer admin-secret-123"})
    assert response.status_code == 422

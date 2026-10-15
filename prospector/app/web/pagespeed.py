"""Google PageSpeed Insights (Lighthouse) for real mobile measurements.

Works with PAGESPEED_API_KEY (recommended; free quota) or without a key at
a much lower shared quota. Any failure is returned as "unavailable"; scores
are only ever Google's own numbers.
"""

from __future__ import annotations

import httpx

from app.config import config

ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
CATEGORIES = ["performance", "accessibility", "seo", "best-practices"]
METRICS = {
    "largest-contentful-paint": "Largest Contentful Paint",
    "cumulative-layout-shift": "Cumulative Layout Shift",
    "total-blocking-time": "Total Blocking Time",
    "first-contentful-paint": "First Contentful Paint",
    "speed-index": "Speed Index",
}


def run_pagespeed(url: str, *, client: httpx.Client | None = None, timeout_s: float = 45.0) -> dict:
    params: list[tuple[str, str]] = [("url", url), ("strategy", "mobile")]
    params += [("category", c) for c in CATEGORIES]
    if config.pagespeed_api_key:
        params.append(("key", config.pagespeed_api_key))
    owns = client is None
    client = client or httpx.Client(timeout=timeout_s, trust_env=False)
    try:
        response = client.get(ENDPOINT, params=params)
    except httpx.HTTPError as exc:
        return {"available": False, "reason": f"PageSpeed request failed: {type(exc).__name__}"}
    finally:
        if owns:
            client.close()
    if response.status_code != 200:
        reason = f"PageSpeed returned HTTP {response.status_code}"
        if response.status_code == 429:
            reason += " (quota exceeded; add PAGESPEED_API_KEY for a higher quota)"
        return {"available": False, "reason": reason}
    try:
        data = response.json()
        lighthouse = data["lighthouseResult"]
    except (ValueError, KeyError):
        return {"available": False, "reason": "PageSpeed response had no Lighthouse result"}
    scores = {}
    for name, category in (lighthouse.get("categories") or {}).items():
        if category.get("score") is not None:
            scores[name] = round(category["score"] * 100)
    metrics = {}
    for key, label in METRICS.items():
        audit = (lighthouse.get("audits") or {}).get(key)
        if audit and audit.get("displayValue"):
            metrics[label] = audit["displayValue"]
    return {
        "available": True,
        "strategy": "mobile",
        "fetchedAt": lighthouse.get("fetchTime"),
        "finalUrl": lighthouse.get("finalDisplayedUrl") or lighthouse.get("finalUrl"),
        "scores": scores,
        "metrics": metrics,
        "source": "Google PageSpeed Insights (Lighthouse)",
    }


def pagespeed_findings(result: dict) -> list[dict]:
    """Translate PSI scores into findings (only when available)."""
    from app.web.audit import finding

    if not result.get("available"):
        return [finding("pagespeed", "Mobile performance (PageSpeed)", "unavailable", result.get("reason", "Not run."))]
    out = []
    scores = result.get("scores", {})
    metrics = result.get("metrics", {})
    perf = scores.get("performance")
    if perf is not None:
        status = "pass" if perf >= 90 else ("warn" if perf >= 50 else "fail")
        evidence = f"Google PageSpeed mobile performance score: {perf}/100."
        if metrics:
            evidence += " " + "; ".join(f"{k}: {v}" for k, v in metrics.items()) + "."
        out.append(finding("pagespeed_performance", "Mobile performance (PageSpeed)", status, evidence,
                           priority="high" if perf < 50 else "medium",
                           recommendation=None if status == "pass" else "Optimise images, scripts and hosting to load faster on phones.",
                           service=None if status == "pass" else "Performance optimisation"))
    for key, label, service in (("accessibility", "Accessibility (PageSpeed)", "Accessibility improvements"), ("seo", "SEO basics (PageSpeed)", "SEO")):
        value = scores.get(key)
        if value is not None:
            status = "pass" if value >= 90 else ("warn" if value >= 70 else "fail")
            out.append(finding(f"pagespeed_{key}", label, status, f"Google PageSpeed {key} score: {value}/100.",
                               priority="medium" if status == "fail" else "low",
                               recommendation=None if status == "pass" else f"Work through Lighthouse's {key} recommendations.",
                               service=None if status == "pass" else service))
    return out

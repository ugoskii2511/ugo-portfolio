"""OpenStreetMap data access: Nominatim geocoding + Overpass business search.

Data © OpenStreetMap contributors, available under the ODbL, which permits
storing and reusing it with attribution (recorded on every prospect).

Both services are free community infrastructure with usage policies:
identify ourselves, keep request volume low (enforced by daily caps in
usage.py), back off on errors. Public Overpass servers are sometimes
overloaded, so queries fail over between several instances.
"""

from __future__ import annotations

import math
import random
import time
from dataclasses import dataclass

import httpx

from app.config import config
from app.discovery.industries import INDUSTRIES, classify
from app.discovery.normalize import normalize_email, normalize_phone, normalize_website

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OSM_LICENSE = "© OpenStreetMap contributors, ODbL 1.0"
RETRYABLE_STATUS = {429, 500, 502, 503, 504}
# Max cell size (degrees) per Overpass query; bigger areas are tiled.
TILE_DEG = 0.12


class ProviderError(RuntimeError):
    """External provider failed after retries (job can retry later)."""


@dataclass
class BBox:
    south: float
    west: float
    north: float
    east: float

    def as_list(self) -> list[float]:
        return [self.south, self.west, self.north, self.east]


def _headers() -> dict[str, str]:
    return {"User-Agent": config.user_agent, "Accept": "application/json"}


def _with_retries(fn, *, attempts: int = 3, base_delay: float = 1.5, sleep=time.sleep):
    last: Exception | None = None
    for attempt in range(attempts):
        try:
            return fn()
        except (httpx.TimeoutException, httpx.TransportError, ProviderError) as exc:
            last = exc
            if attempt < attempts - 1:
                sleep(base_delay * (2**attempt) + random.uniform(0, 0.5))
    raise ProviderError(str(last) if last else "Provider failed")


def geocode(country: str, state: str | None, city: str | None, *, client: httpx.Client | None = None) -> tuple[BBox, str]:
    """Bounding box + display name for a place, via Nominatim."""
    params = {"format": "jsonv2", "limit": "1", "country": country}
    if city:
        params["city"] = city
    if state:
        params["state"] = state
    owns = client is None
    client = client or httpx.Client(timeout=20.0, headers=_headers(), trust_env=False)
    try:

        def call():
            response = client.get(NOMINATIM_URL, params=params)
            if response.status_code in RETRYABLE_STATUS:
                raise ProviderError(f"Nominatim HTTP {response.status_code}")
            response.raise_for_status()
            return response.json()

        results = _with_retries(call)
    finally:
        if owns:
            client.close()
    if not results:
        where = ", ".join(p for p in (city, state, country) if p)
        raise LookupError(f"Couldn't find “{where}” on OpenStreetMap. Check the spelling.")
    hit = results[0]
    south, north, west, east = (float(v) for v in hit["boundingbox"])
    return BBox(south, west, north, east), hit.get("display_name", "")


def tiles(box: BBox, size: float = TILE_DEG) -> list[BBox]:
    """Split a bounding box into cells no larger than `size` degrees."""
    rows = max(1, math.ceil((box.north - box.south) / size))
    cols = max(1, math.ceil((box.east - box.west) / size))
    dlat = (box.north - box.south) / rows
    dlon = (box.east - box.west) / cols
    out = []
    for r in range(rows):
        for c in range(cols):
            out.append(
                BBox(
                    box.south + r * dlat,
                    box.west + c * dlon,
                    box.south + (r + 1) * dlat,
                    box.west + (c + 1) * dlon,
                )
            )
    return out


def build_query(box: BBox, industries: list[str], website_filter: str, limit: int) -> str:
    """Overpass QL for named businesses in `box`.

    website_filter: "any" | "with_website" | "without_website".
    """
    selected = industries or list(INDUSTRIES)
    b = f"{box.south:.5f},{box.west:.5f},{box.north:.5f},{box.east:.5f}"
    statements = []
    for industry in selected:
        for key, regex in INDUSTRIES.get(industry, []):
            base = f'nwr({b})["{key}"~"^({regex})$"]["name"]'
            if website_filter == "with_website":
                statements.append(base + '["website"];')
                statements.append(base + '["contact:website"];')
            elif website_filter == "without_website":
                statements.append(base + '[!"website"][!"contact:website"][!"url"];')
            else:
                statements.append(base + ";")
    body = "\n  ".join(statements)
    return f"[out:json][timeout:45];\n(\n  {body}\n);\nout tags center {int(limit)};"


def run_overpass(query: str, *, client: httpx.Client | None = None, sleep=time.sleep) -> list[dict]:
    owns = client is None
    client = client or httpx.Client(timeout=httpx.Timeout(55.0, connect=10.0), headers=_headers(), trust_env=False)
    errors: list[str] = []
    try:
        for endpoint in OVERPASS_ENDPOINTS:

            def call(endpoint=endpoint):
                response = client.post(endpoint, data={"data": query})
                if response.status_code in RETRYABLE_STATUS:
                    raise ProviderError(f"{endpoint.split('/')[2]} HTTP {response.status_code}")
                response.raise_for_status()
                payload = response.json()
                remark = payload.get("remark", "")
                if "runtime error" in remark.lower():
                    raise ProviderError(f"Overpass: {remark[:120]}")
                return payload.get("elements", [])

            try:
                return _with_retries(call, attempts=2, sleep=sleep)
            except (ProviderError, ValueError) as exc:
                errors.append(str(exc))
                continue
    finally:
        if owns:
            client.close()
    raise ProviderError("All OpenStreetMap servers failed: " + "; ".join(errors)[:400])


def element_to_record(element: dict) -> dict | None:
    """Normalised business record from an Overpass element (None to skip)."""
    tags = element.get("tags") or {}
    name = (tags.get("name") or "").strip()
    if not name or len(name) > 200:
        return None
    industry, category = classify(tags)
    lat = element.get("lat") or (element.get("center") or {}).get("lat")
    lon = element.get("lon") or (element.get("center") or {}).get("lon")
    street = " ".join(p for p in (tags.get("addr:housenumber"), tags.get("addr:street")) if p)
    address = ", ".join(p for p in (street, tags.get("addr:suburb") or tags.get("addr:district")) if p) or None
    ref = f"{element.get('type')}/{element.get('id')}"
    return {
        "businessName": name,
        "industry": industry,
        "category": category,
        "address": address,
        "city": tags.get("addr:city"),
        "state": tags.get("addr:state"),
        "latitude": lat,
        "longitude": lon,
        "website": normalize_website(tags.get("website") or tags.get("contact:website") or tags.get("url")),
        "phone": normalize_phone(tags.get("phone") or tags.get("contact:phone")),
        "email": normalize_email(tags.get("email") or tags.get("contact:email")),
        "source": "openstreetmap",
        "sourceRef": ref,
        "sourceUrl": f"https://www.openstreetmap.org/{ref}",
        "sourceLicense": OSM_LICENSE,
    }

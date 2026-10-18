"""Evidence-based website status checks.

Statuses (see the WebsiteStatus enum):
- VERIFIED: the site loads and its homepage names the business.
- FOUND_UNVERIFIED: a site exists (listed, or a likely domain) but the
  homepage doesn't clearly name the business.
- NONE_FOUND: no site in the sources checked. Never "has no website".
- UNCERTAIN: a site is listed but couldn't be loaded (DNS failure, error
  status, timeout); could be down, moved, or blocked.
"""

from __future__ import annotations

import socket
from dataclasses import dataclass

from bs4 import BeautifulSoup

from app.discovery.normalize import distinctive_tokens, slug_for_domain
from app.web.safe_fetch import FetchError, UnsafeUrl, safe_get

CANDIDATE_TLDS = [".com.ng", ".ng", ".com"]


@dataclass
class StatusResult:
    status: str
    evidence: str
    website: str | None = None
    fetches: int = 0


def page_names_business(html: str, name: str) -> tuple[bool, str]:
    """Does the homepage name the business? Returns (match, where)."""
    tokens = distinctive_tokens(name)
    if not tokens:
        return False, "name too generic to match"
    soup = BeautifulSoup(html[:300_000], "html.parser")
    title = (soup.title.string or "") if soup.title and soup.title.string else ""
    site_name = ""
    og = soup.find("meta", attrs={"property": "og:site_name"})
    if og and og.get("content"):
        site_name = og["content"]
    headings = " ".join(h.get_text(" ", strip=True) for h in soup.find_all(["h1", "h2"])[:6])
    for label, text in (("page title", title), ("site name", site_name), ("headings", headings)):
        hay = text.lower()
        needed = tokens if len(tokens) <= 2 else tokens[:3]
        if hay and all(token in hay for token in needed):
            return True, label
    body = soup.get_text(" ", strip=True)[:20_000].lower()
    if all(token in body for token in tokens[:2]):
        return True, "page text"
    return False, ""


def check_listed_website(name: str, url: str, *, fetch=safe_get) -> StatusResult:
    try:
        result = fetch(url, max_bytes=600_000, deadline_s=20.0)
    except UnsafeUrl as exc:
        return StatusResult("UNCERTAIN", f"Listed website {url} was rejected as unsafe ({exc}).", url, 1)
    except FetchError as exc:
        return StatusResult("UNCERTAIN", f"Listed website {url} could not be loaded: {exc}.", url, 1)
    if result.status >= 400:
        return StatusResult("UNCERTAIN", f"Listed website {url} returned HTTP {result.status}.", result.final_url, 1)
    matched, where = page_names_business(result.text, name)
    if matched:
        return StatusResult("VERIFIED", f"{result.final_url} loads and names the business in its {where}.", result.final_url, 1)
    return StatusResult(
        "FOUND_UNVERIFIED",
        f"{result.final_url} loads (HTTP {result.status}) but its homepage doesn't clearly name “{name}”.",
        result.final_url,
        1,
    )


PUBLIC_RESOLVERS = ["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111", "2001:4860:4860::8888"]


def _dns_exists(host: str) -> bool | None:
    """Ask public resolvers directly. NXDOMAIN is a definite "no"; timeouts
    and server failures are "don't know"."""
    import dns.exception
    import dns.resolver

    resolver = dns.resolver.Resolver(configure=False)
    resolver.nameservers = PUBLIC_RESOLVERS
    resolver.lifetime = 5.0
    resolver.timeout = 2.0
    answered_empty = False
    for rdtype in ("A", "AAAA"):
        try:
            resolver.resolve(host, rdtype)
            return True
        except dns.resolver.NXDOMAIN:
            return False
        except dns.resolver.NoAnswer:
            answered_empty = True
        except (dns.resolver.NoNameservers, dns.exception.Timeout, dns.resolver.YXDOMAIN, OSError):
            continue
    return False if answered_empty else None


def _resolves(host: str) -> bool | None:
    """True/False when DNS gave an answer; None when the lookup itself failed.

    The serverless runtime's resolver raises a bare OSError (errno 16, EBUSY)
    for names that don't exist instead of a clear "not found", so public
    resolvers are asked first. "Couldn't look it up" is never treated as
    evidence that a domain doesn't exist.
    """
    answer = _dns_exists(host)
    if answer is not None:
        return answer
    try:
        socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
        return True
    except socket.gaierror:
        return False
    except OSError:
        return None


def search_candidate_domains(name: str, *, fetch=safe_get, resolves=_resolves, max_fetches: int = 3) -> StatusResult:
    """For businesses with no listed site: try the obvious domains.

    Only a homepage that names the business counts as a find, and even then
    it's FOUND_UNVERIFIED, never VERIFIED, because a guessed domain could
    belong to someone else with a similar name.
    """
    import re

    from app.discovery.normalize import strip_accents

    # Two spellings: noise words removed ("harvaseschool") and the full name
    # ("harvaseinternationalschool"). DNS lookups are free; fetches are capped.
    full = re.sub(r"[^a-z0-9]", "", strip_accents(name).lower())
    slugs = [s for s in dict.fromkeys([slug_for_domain(name), full]) if 4 <= len(s) <= 30]
    if not slugs:
        return StatusResult("NONE_FOUND", "No website listed. Name too short or long to guess a domain reliably.")
    checked: list[str] = []
    unknown: list[str] = []
    fetches = 0
    for host in (slug + tld for slug in slugs for tld in CANDIDATE_TLDS):
        answer = resolves(host)
        if answer is None:
            unknown.append(host)
            continue
        checked.append(host)
        if not answer:
            continue
        if fetches >= max_fetches:
            break
        fetches += 1
        try:
            result = fetch(f"https://{host}/", max_bytes=400_000, deadline_s=15.0)
        except (FetchError, UnsafeUrl):
            continue
        if result.status < 400:
            matched, where = page_names_business(result.text, name)
            if matched:
                return StatusResult(
                    "FOUND_UNVERIFIED",
                    f"No website listed, but {result.final_url} names the business in its {where}. Confirm it's theirs before outreach.",
                    result.final_url,
                    fetches,
                )
    if not checked:
        # Every lookup failed: we learned nothing, so don't claim "none found".
        raise FetchError(f"DNS lookups failed for {', '.join(unknown)}; try the check again later.")
    evidence = f"No website listed in the source, and none of {', '.join(checked)} names the business."
    if unknown:
        evidence += f" Couldn't look up {', '.join(unknown)}."
    return StatusResult("NONE_FOUND", evidence, None, fetches)

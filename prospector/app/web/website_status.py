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

import re
import socket
from dataclasses import dataclass, field
from urllib.parse import urljoin, urlsplit

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
    # Public business emails found on the business's own site.
    emails: list[str] = field(default_factory=list)


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


_EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}\b")
FREE_MAIL = {"gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "ymail.com", "outlook.com", "hotmail.com", "live.com", "icloud.com", "aol.com"}
_SKIP_LOCAL = ("noreply", "no-reply", "donotreply", "do-not-reply", "mailer-daemon", "postmaster", "example", "test", "user", "username", "yourname", "email", "name")
_SKIP_DOMAIN = ("example.com", "domain.com", "email.com", "sentry.io", "wixpress.com", "sentry-next.wixpress.com", "godaddy.com")


def _site_domain(url: str) -> str:
    host = (urlsplit(url).hostname or "").lower()
    return host[4:] if host.startswith("www.") else host


def extract_emails(html: str, site_url: str) -> list[str]:
    """Public business emails published on the business's own site.

    Only addresses on the site's own domain, or a free-mail address
    (Gmail, Yahoo…) that small businesses commonly use. Ignores the web
    designer's address, placeholders, no-reply and tracking addresses."""
    site = _site_domain(site_url)
    soup = BeautifulSoup(html[:600_000], "html.parser")
    found: list[str] = []
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if href.lower().startswith("mailto:"):
            found.append(href[7:].split("?")[0])
    found.extend(_EMAIL.findall(soup.get_text(" ", strip=True)[:200_000]))
    out: list[str] = []
    for raw in found:
        email = raw.strip().strip(".,;:").lower()
        if not _EMAIL.fullmatch(email):
            continue
        local, domain = email.split("@", 1)
        if domain.endswith((".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg")):
            continue  # image file names like logo@2x.png
        if any(local == s or local.startswith(s) for s in _SKIP_LOCAL) or domain in _SKIP_DOMAIN:
            continue
        own = bool(site) and (domain == site or domain.endswith("." + site) or site.endswith("." + domain))
        if own or domain in FREE_MAIL:
            if email not in out:
                out.append(email)
    # Prefer the site's own domain.
    return sorted(out, key=lambda e: 0 if e.split("@", 1)[1] not in FREE_MAIL else 1)[:3]


def contact_page(html: str, base_url: str) -> str | None:
    """A same-site link to the contact page, if the homepage has one."""
    site = _site_domain(base_url)
    soup = BeautifulSoup(html[:300_000], "html.parser")
    for a in soup.find_all("a", href=True):
        label = (a.get_text(" ", strip=True) + " " + a["href"]).lower()
        if "contact" in label:
            url = urljoin(base_url, a["href"])
            if url.startswith(("http://", "https://")) and _site_domain(url) == site and url.rstrip("/") != base_url.rstrip("/"):
                return url
    return None


def check_listed_website(name: str, url: str, *, fetch=safe_get) -> StatusResult:
    try:
        result = fetch(url, max_bytes=600_000, deadline_s=20.0)
    except UnsafeUrl as exc:
        return StatusResult("UNCERTAIN", f"Listed website {url} was rejected as unsafe ({exc}).", url, 1)
    except FetchError as exc:
        return StatusResult("UNCERTAIN", f"Listed website {url} could not be loaded: {exc}.", url, 1)
    if result.status >= 400:
        return StatusResult("UNCERTAIN", f"Listed website {url} returned HTTP {result.status}.", result.final_url, 1)

    # The business listed this site, so a public email on it is theirs to be contacted on.
    fetches = 1
    emails = extract_emails(result.text, result.final_url)
    if not emails:
        page = contact_page(result.text, result.final_url)
        if page:
            fetches += 1
            try:
                contact = fetch(page, max_bytes=400_000, deadline_s=15.0)
                if contact.status < 400:
                    emails = extract_emails(contact.text, contact.final_url)
            except (FetchError, UnsafeUrl):
                pass

    matched, where = page_names_business(result.text, name)
    if matched:
        return StatusResult("VERIFIED", f"{result.final_url} loads and names the business in its {where}.", result.final_url, fetches, emails)
    return StatusResult(
        "FOUND_UNVERIFIED",
        f"{result.final_url} loads (HTTP {result.status}) but its homepage doesn't clearly name “{name}”.",
        result.final_url,
        fetches,
        emails,
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

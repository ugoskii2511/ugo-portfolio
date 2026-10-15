"""Website audit: genuine, evidence-backed checks on a business homepage.

Each finding is {key, label, status, priority, evidence, recommendation,
service}. status is "pass" | "warn" | "fail" | "unavailable". A check that
couldn't run is "unavailable" with the reason, never a guess.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from urllib.parse import urljoin, urlsplit

from bs4 import BeautifulSoup

from app.web.safe_fetch import FetchError, FetchResult, UnsafeUrl, parse_target, robots_allows, safe_get

CTA_WORDS = re.compile(
    r"\b(contact|call|book|order|buy|shop|get a quote|quote|enquir|inquir|request|subscribe|sign ?up|register|apply|enrol|reserve|whatsapp|chat)\w*",
    re.I,
)
ECOM_WORDS = re.compile(r"\b(add to cart|add to bag|checkout|shopping cart|my cart|buy now)\b", re.I)


@dataclass
class AuditResult:
    url: str
    final_url: str | None
    status: str  # completed | partial | failed
    http_status: int | None
    response_ms: int | None
    page_bytes: int | None
    findings: list[dict] = field(default_factory=list)
    error: str | None = None
    fetches: int = 0


def finding(key, label, status, evidence, *, priority="low", recommendation=None, service=None) -> dict:
    return {
        "key": key,
        "label": label,
        "status": status,
        "priority": priority if status in ("fail", "warn") else "none",
        "evidence": evidence,
        "recommendation": recommendation,
        "service": service,
    }


def is_client_rendered(soup: BeautifulSoup) -> bool:
    """True when the page's content is built by JavaScript in the browser.

    Raw HTML then holds little more than an empty root element, so content
    checks (headings, buttons, forms…) can't be judged from it.
    """
    body = soup.body
    text = body.get_text(" ", strip=True) if body else ""
    root = soup.find(id=re.compile(r"^(root|app|__next|__nuxt|svelte)$"))
    has_app_script = bool(soup.find("script", attrs={"type": "module"})) or bool(soup.find("script", src=True))
    return len(text) < 400 and (root is not None or has_app_script)


CONTENT_CHECKS = {"h1", "img_alt", "contact", "cta", "ecommerce", "copyright"}


def analyse_html(html: str, result: FetchResult) -> list[dict]:
    """All checks that work from the fetched page alone (pure; testable)."""
    soup = BeautifulSoup(html[:2_000_000], "html.parser")
    out = _analyse(soup, result)
    if is_client_rendered(soup):
        note = (
            "The page builds its content with JavaScript, so this can't be judged from the raw HTML "
            "(checking it needs a real browser render)."
        )
        out = [
            finding(f["key"], f["label"], "unavailable", note) if f["key"] in CONTENT_CHECKS else f
            for f in out
        ]
        out.append(finding("rendering", "Rendering", "pass", "Client-rendered (JavaScript) site detected; content checks marked unavailable rather than guessed."))
    return out


def _analyse(soup: BeautifulSoup, result: FetchResult) -> list[dict]:
    out: list[dict] = []

    # HTTPS
    final_scheme = urlsplit(result.final_url).scheme
    if final_scheme == "https":
        out.append(finding("https", "HTTPS", "pass", f"Served over HTTPS ({result.final_url})."))
    else:
        out.append(
            finding("https", "HTTPS", "fail", f"Final page is served over plain HTTP ({result.final_url}).",
                    priority="high", recommendation="Serve the site over HTTPS with a valid certificate and redirect HTTP to HTTPS.",
                    service="Website security & maintenance")
        )
    hsts = result.headers.get("strict-transport-security")
    if final_scheme == "https":
        out.append(
            finding("hsts", "HSTS header", "pass" if hsts else "warn",
                    f"Strict-Transport-Security: {hsts}" if hsts else "No Strict-Transport-Security header on the homepage.",
                    priority="low", recommendation=None if hsts else "Add an HSTS header so browsers always use HTTPS.",
                    service=None if hsts else "Website security & maintenance")
        )

    # Server response time (single sample; indicative only)
    ms = result.elapsed_ms
    out.append(
        finding("response_time", "Server response (single sample)",
                "pass" if ms < 1500 else "warn",
                f"Homepage took {ms} ms to download in one request from our server. One sample; real-world speed varies.",
                priority="medium" if ms >= 3000 else "low",
                recommendation=None if ms < 1500 else "Investigate hosting, caching and page weight to speed up first load.",
                service=None if ms < 1500 else "Performance optimisation")
    )
    size_kb = len(result.body) // 1024
    if result.truncated:
        out.append(finding("page_weight", "HTML size", "warn", f"HTML exceeded {size_kb} KB and was truncated.",
                           priority="medium", recommendation="Reduce HTML size.", service="Performance optimisation"))
    else:
        out.append(finding("page_weight", "HTML size", "pass" if size_kb < 300 else "warn",
                           f"Homepage HTML is {size_kb} KB (excluding images, scripts and styles).",
                           priority="low", recommendation=None if size_kb < 300 else "Trim inline content and scripts in the HTML.",
                           service=None if size_kb < 300 else "Performance optimisation"))

    # Title + description
    title = soup.title.string.strip() if soup.title and soup.title.string else ""
    if not title:
        out.append(finding("title", "Page title", "fail", "The homepage has no <title>.", priority="high",
                           recommendation="Add a descriptive page title with the business name and location.", service="SEO"))
    else:
        ok = 10 <= len(title) <= 65
        out.append(finding("title", "Page title", "pass" if ok else "warn", f"“{title[:120]}” ({len(title)} characters).",
                           priority="low", recommendation=None if ok else "Aim for a 10–65 character title naming the business and what it offers.",
                           service=None if ok else "SEO"))
    desc_tag = soup.find("meta", attrs={"name": re.compile("^description$", re.I)})
    desc = (desc_tag.get("content") or "").strip() if desc_tag else ""
    if not desc:
        out.append(finding("meta_description", "Meta description", "fail", "No meta description.", priority="medium",
                           recommendation="Add a 70–160 character description; search results show it under the title.", service="SEO"))
    else:
        ok = 50 <= len(desc) <= 170
        out.append(finding("meta_description", "Meta description", "pass" if ok else "warn",
                           f"“{desc[:160]}” ({len(desc)} characters).", priority="low",
                           recommendation=None if ok else "Aim for 70–160 characters.", service=None if ok else "SEO"))

    # Mobile viewport
    viewport = soup.find("meta", attrs={"name": re.compile("^viewport$", re.I)})
    vp = (viewport.get("content") or "") if viewport else ""
    if not viewport:
        out.append(finding("viewport", "Mobile viewport", "fail", "No <meta name=\"viewport\">; phones will render a zoomed-out desktop page.",
                           priority="high", recommendation="Make the site responsive and add a viewport meta tag.",
                           service="Mobile-friendly redesign"))
    else:
        ok = "width=device-width" in vp.replace(" ", "")
        out.append(finding("viewport", "Mobile viewport", "pass" if ok else "warn", f"viewport: “{vp}”.", priority="medium",
                           recommendation=None if ok else "Use width=device-width so the layout fits phone screens.",
                           service=None if ok else "Mobile-friendly redesign"))

    # Headings / language
    h1s = [h.get_text(" ", strip=True) for h in soup.find_all("h1")]
    out.append(finding("h1", "Main heading (H1)", "pass" if len(h1s) == 1 else "warn",
                       f"{len(h1s)} H1 heading(s)" + (f": “{h1s[0][:80]}”" if h1s else "."), priority="low",
                       recommendation=None if len(h1s) == 1 else "Use exactly one H1 that says what the business does.",
                       service=None if len(h1s) == 1 else "SEO"))
    html_tag = soup.find("html")
    lang = html_tag.get("lang") if html_tag else None
    out.append(finding("lang", "Language attribute", "pass" if lang else "warn",
                       f'<html lang="{lang}">' if lang else "No lang attribute on <html> (affects screen readers).",
                       priority="low", recommendation=None if lang else 'Add lang="en" (or the right language).',
                       service=None if lang else "Accessibility improvements"))

    # Images without alt
    images = soup.find_all("img")
    missing_alt = [img for img in images if img.get("alt") is None]
    if images:
        ratio = len(missing_alt) / len(images)
        out.append(finding("img_alt", "Image alt text", "pass" if ratio == 0 else ("fail" if ratio > 0.5 else "warn"),
                           f"{len(missing_alt)} of {len(images)} images have no alt attribute.",
                           priority="medium" if ratio > 0.5 else "low",
                           recommendation=None if ratio == 0 else "Describe meaningful images with alt text.",
                           service=None if ratio == 0 else "Accessibility improvements"))

    # Social preview / structured data / canonical
    og_title = soup.find("meta", attrs={"property": "og:title"})
    og_image = soup.find("meta", attrs={"property": "og:image"})
    has_og = bool(og_title and og_image)
    out.append(finding("open_graph", "Social share preview", "pass" if has_og else "warn",
                       "og:title and og:image present." if has_og else "Missing og:title and/or og:image; links shared on WhatsApp or social media show no preview card.",
                       priority="low", recommendation=None if has_og else "Add Open Graph tags with a title, description and image.",
                       service=None if has_og else "SEO"))
    ld = soup.find_all("script", attrs={"type": "application/ld+json"})
    out.append(finding("structured_data", "Structured data", "pass" if ld else "warn",
                       f"{len(ld)} JSON-LD block(s)." if ld else "No JSON-LD structured data (e.g. LocalBusiness).",
                       priority="low", recommendation=None if ld else "Add LocalBusiness structured data with address, hours and phone.",
                       service=None if ld else "SEO"))
    robots_meta = soup.find("meta", attrs={"name": re.compile("^robots$", re.I)})
    if robots_meta and "noindex" in (robots_meta.get("content") or "").lower():
        out.append(finding("noindex", "Search indexing", "fail", f"robots meta is “{robots_meta.get('content')}”: search engines are told not to index the homepage.",
                           priority="high", recommendation="Remove noindex unless deliberate.", service="SEO"))

    # Contact & calls to action
    links = soup.find_all("a", href=True)
    hrefs = [a["href"].strip() for a in links]
    has_tel = any(h.lower().startswith("tel:") for h in hrefs)
    has_mail = any(h.lower().startswith("mailto:") for h in hrefs)
    has_wa = any("wa.me/" in h.lower() or "api.whatsapp.com" in h.lower() for h in hrefs)
    forms = soup.find_all("form")
    contact_bits = [label for ok, label in ((has_tel, "click-to-call"), (has_mail, "email link"), (has_wa, "WhatsApp link"), (bool(forms), f"{len(forms)} form(s)")) if ok]
    out.append(finding("contact", "Contact options on homepage", "pass" if contact_bits else "fail",
                       "Found: " + ", ".join(contact_bits) + "." if contact_bits else "No click-to-call, email, WhatsApp link or form on the homepage.",
                       priority="high" if not contact_bits else "low",
                       recommendation=None if contact_bits else "Add a visible way to get in touch: call/WhatsApp buttons and an enquiry form.",
                       service=None if contact_bits else "Enquiry & contact system"))
    cta_texts = []
    for el in soup.find_all(["a", "button"]):
        text = el.get_text(" ", strip=True)
        if text and len(text) <= 40 and CTA_WORDS.search(text):
            cta_texts.append(text)
    out.append(finding("cta", "Calls to action", "pass" if cta_texts else "warn",
                       "Examples: " + ", ".join(f"“{t}”" for t in dict.fromkeys(cta_texts).__iter__() if t)[:200] if cta_texts else "No clear action buttons/links (e.g. Book, Order, Contact) found on the homepage.",
                       priority="medium" if not cta_texts else "low",
                       recommendation=None if cta_texts else "Add clear calls to action that lead to an enquiry or purchase.",
                       service=None if cta_texts else "Conversion-focused redesign"))
    page_text = soup.get_text(" ", strip=True)
    ecom = bool(ECOM_WORDS.search(page_text))
    out.append(finding("ecommerce", "Online ordering / shop", "pass" if ecom else "warn",
                       "Shopping-cart wording found on the homepage." if ecom else "No sign of online ordering or a shop on the homepage (relevant only if they sell products).",
                       priority="low", recommendation=None if ecom else "If they sell products, an online store or order form could take orders directly.",
                       service=None if ecom else "E-commerce development"))

    # Copyright year (low-confidence freshness signal)
    years = [int(y) for y in re.findall(r"(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})", page_text, re.I)]
    if years:
        latest = max(years)
        from datetime import date

        stale = date.today().year - latest >= 2
        out.append(finding("copyright", "Copyright year", "warn" if stale else "pass",
                           f"Footer copyright year: {latest}." + (" May suggest the site isn't actively maintained (low confidence)." if stale else ""),
                           priority="low", recommendation="Keep footer details current." if stale else None,
                           service="Website maintenance" if stale else None))
    return out


def internal_links(html: str, base_url: str, limit: int) -> list[str]:
    soup = BeautifulSoup(html[:2_000_000], "html.parser")
    base_host = urlsplit(base_url).hostname
    seen: list[str] = []
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if href.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
            continue
        url = urljoin(base_url, href).split("#", 1)[0]
        if urlsplit(url).hostname != base_host or url in seen or url.rstrip("/") == base_url.rstrip("/"):
            continue
        seen.append(url)
        if len(seen) >= limit:
            break
    return seen


def run_audit(url: str, *, max_links: int = 12, fetch=safe_get, robots=robots_allows, budget_fetches: int | None = None) -> AuditResult:
    """Fetch the homepage, run checks, then test a few internal links."""
    fetches = 0
    try:
        parse_target(url)
    except UnsafeUrl as exc:
        return AuditResult(url, None, "failed", None, None, None, [], f"Unsafe URL rejected: {exc}")
    try:
        allowed = robots(url)
    except Exception:  # robots trouble never blocks the homepage check
        allowed = True
    if not allowed:
        return AuditResult(url, None, "failed", None, None, None,
                           [finding("robots", "robots.txt", "unavailable", "The site's robots.txt asks automated tools not to fetch this page, so it wasn't audited.")],
                           "Disallowed by robots.txt")
    try:
        result = fetch(url, max_bytes=2_000_000, deadline_s=25.0)
        fetches += 1
    except (FetchError, UnsafeUrl) as exc:
        return AuditResult(url, None, "failed", None, None, None,
                           [finding("reachable", "Website reachable", "fail", f"The homepage could not be loaded: {exc}.",
                                    priority="high", recommendation="Check hosting, DNS and SSL; an unreachable site loses every visitor.",
                                    service="Website rescue / rebuild")],
                           str(exc), fetches)

    findings: list[dict] = []
    if result.status >= 400:
        findings.append(finding("reachable", "Website reachable", "fail", f"The homepage returned HTTP {result.status}.",
                                priority="high", recommendation="Fix the server error; visitors currently see an error page.",
                                service="Website rescue / rebuild"))
        return AuditResult(url, result.final_url, "partial", result.status, result.elapsed_ms, len(result.body), findings, None, fetches)

    findings.append(finding("reachable", "Website reachable", "pass", f"HTTP {result.status} from {result.final_url}."))
    if url.startswith("http://") and result.final_url.startswith("https://"):
        findings.append(finding("https_redirect", "HTTP → HTTPS redirect", "pass", "Plain HTTP redirects to HTTPS."))
    html = result.text
    findings.extend(analyse_html(html, result))

    # Broken internal links (GET, capped, same host only)
    links = internal_links(html, result.final_url, max_links)
    broken, checked, skipped = [], 0, 0
    for link in links:
        if budget_fetches is not None and fetches >= budget_fetches:
            skipped += 1
            continue
        try:
            response = fetch(link, max_bytes=50_000, deadline_s=10.0)
            fetches += 1
            checked += 1
            if response.status >= 400:
                broken.append(f"{link} (HTTP {response.status})")
        except FetchError as exc:
            fetches += 1
            checked += 1
            broken.append(f"{link} ({exc})")
        except UnsafeUrl:
            skipped += 1
    if checked:
        findings.append(finding("broken_links", "Internal links", "fail" if broken else "pass",
                                (f"{len(broken)} of {checked} internal links checked are broken: " + "; ".join(broken[:5])) if broken
                                else f"All {checked} internal links checked load.",
                                priority="medium" if broken else "low",
                                recommendation="Fix or remove broken links." if broken else None,
                                service="Website maintenance" if broken else None))
    else:
        findings.append(finding("broken_links", "Internal links", "unavailable", "No internal links were checked."))
    return AuditResult(url, result.final_url, "completed", result.status, result.elapsed_ms, len(result.body), findings, None, fetches)

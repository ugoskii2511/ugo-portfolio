"""Normalisation and dedupe keys for business records."""

from __future__ import annotations

import re
import unicodedata
from urllib.parse import urlsplit, urlunsplit

# Words that don't distinguish one business from another.
_NOISE = {
    "ltd", "limited", "nig", "nigeria", "plc", "inc", "llc", "co", "company",
    "enterprise", "enterprises", "ventures", "global", "international", "intl",
    "services", "the", "and", "of", "&",
}


def strip_accents(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c))


def normalize_name(name: str) -> str:
    """Lowercase, accent- and punctuation-free, noise words removed."""
    text = strip_accents(name or "").lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    words = [w for w in text.split() if w not in _NOISE]
    return " ".join(words) or text.strip()


def distinctive_tokens(name: str) -> list[str]:
    """Tokens worth matching against a website (≥3 chars, not noise)."""
    return [w for w in normalize_name(name).split() if len(w) >= 3]


def normalize_website(raw: str | None) -> str | None:
    """Returns a clean http(s) URL, or None if it isn't a usable website."""
    if not raw:
        return None
    value = raw.strip().split()[0].strip("<>\"'")
    if not value:
        return None
    if not re.match(r"^[a-z][a-z0-9+.-]*://", value, re.I):
        value = "https://" + value
    parts = urlsplit(value)
    if parts.scheme.lower() not in ("http", "https"):
        return None
    host = (parts.hostname or "").lower().rstrip(".")
    if not host or "." not in host or " " in host:
        return None
    # Social profiles and link aggregators aren't the business's own site.
    if domain_of_host(host) in SOCIAL_DOMAINS:
        return None
    path = parts.path if parts.path not in ("", "/") else "/"
    return urlunsplit((parts.scheme.lower(), host, path, parts.query, ""))


def domain_of_host(host: str) -> str:
    host = host.lower().rstrip(".")
    return host[4:] if host.startswith("www.") else host


def website_domain(url: str | None) -> str | None:
    if not url:
        return None
    host = urlsplit(url).hostname
    return domain_of_host(host) if host else None


SOCIAL_DOMAINS = {
    "facebook.com", "m.facebook.com", "instagram.com", "twitter.com", "x.com",
    "linkedin.com", "tiktok.com", "youtube.com", "wa.me", "whatsapp.com",
    "linktr.ee", "google.com", "goo.gl", "maps.app.goo.gl", "business.site",
}


def normalize_phone(raw: str | None, country_code: str = "234") -> str | None:
    """E.164-ish. Nigerian local numbers (0803…) become +234803…"""
    if not raw:
        return None
    first = re.split(r"[;,/]", raw)[0]
    digits = re.sub(r"\D", "", first)
    if not digits:
        return None
    if first.strip().startswith("+"):
        result = "+" + digits
    elif digits.startswith("00"):
        result = "+" + digits[2:]
    elif digits.startswith(country_code):
        result = "+" + digits
    elif digits.startswith("0"):
        result = "+" + country_code + digits[1:]
    else:
        result = "+" + country_code + digits
    return result if 10 <= len(result) <= 16 else None


_EMAIL = re.compile(r"^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$")


def normalize_email(raw: str | None) -> str | None:
    if not raw:
        return None
    value = re.split(r"[;, ]", raw.strip())[0].lower()
    if value.startswith("mailto:"):
        value = value[7:]
    return value if _EMAIL.match(value) else None


def slug_for_domain(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", normalize_name(name))

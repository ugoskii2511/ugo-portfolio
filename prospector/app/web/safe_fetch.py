"""SSRF-safe HTTP fetching for untrusted, discovered URLs.

Every request:
- allows only http/https on ports 80/443, with no embedded credentials;
- resolves DNS itself and rejects private, loopback, link-local, multicast,
  reserved, CGNAT and cloud-metadata addresses, including IPv4 addresses
  hidden inside IPv6 (IPv4-mapped, NAT64 64:ff9b::/96, 6to4, Teredo);
- connects to the exact IP it validated (DNS-rebinding safe) while TLS
  still verifies the real hostname via SNI;
- re-validates every redirect hop, caps redirects, total time and bytes.
"""

from __future__ import annotations

import ipaddress
import socket
import time
from dataclasses import dataclass, field
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.robotparser import RobotFileParser

import httpx

from app.config import config

ALLOWED_SCHEMES = {"http": 80, "https": 443}
MAX_URL_LENGTH = 2048
DEFAULT_MAX_BYTES = 2_000_000
DEFAULT_DEADLINE_S = 25.0
MAX_REDIRECTS = 5

_NAT64 = ipaddress.ip_network("64:ff9b::/96")
_EXTRA_BLOCKED = [
    ipaddress.ip_network("100.64.0.0/10"),  # CGNAT
    ipaddress.ip_network("169.254.0.0/16"),  # link-local incl. 169.254.169.254 metadata
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("192.0.0.0/24"),
    ipaddress.ip_network("198.18.0.0/15"),  # benchmarking
    ipaddress.ip_network("fd00::/8"),
    ipaddress.ip_network("fe80::/10"),
]


class UnsafeUrl(ValueError):
    """The URL or one of its resolved addresses is not allowed."""


class FetchError(RuntimeError):
    """Network-level failure (DNS, connect, TLS, timeout)."""


@dataclass
class Target:
    scheme: str
    host: str
    port: int
    path: str  # path + query, never empty
    url: str  # normalised URL without fragment


@dataclass
class FetchResult:
    url: str
    final_url: str
    status: int
    headers: dict[str, str]
    body: bytes
    elapsed_ms: int
    truncated: bool
    redirects: list[str] = field(default_factory=list)

    @property
    def text(self) -> str:
        charset = "utf-8"
        content_type = self.headers.get("content-type", "")
        if "charset=" in content_type:
            charset = content_type.split("charset=", 1)[1].split(";")[0].strip() or "utf-8"
        try:
            return self.body.decode(charset, errors="replace")
        except LookupError:
            return self.body.decode("utf-8", errors="replace")


def parse_target(url: str) -> Target:
    if not isinstance(url, str) or not url.strip():
        raise UnsafeUrl("Empty URL")
    url = url.strip()
    if len(url) > MAX_URL_LENGTH:
        raise UnsafeUrl("URL too long")
    parts = urlsplit(url)
    scheme = parts.scheme.lower()
    if scheme not in ALLOWED_SCHEMES:
        raise UnsafeUrl(f"Scheme not allowed: {scheme or '(none)'}")
    if parts.username or parts.password:
        raise UnsafeUrl("Credentials in URL are not allowed")
    host = (parts.hostname or "").rstrip(".").lower()
    if not host:
        raise UnsafeUrl("URL has no host")
    try:
        port = parts.port or ALLOWED_SCHEMES[scheme]
    except ValueError as exc:
        raise UnsafeUrl("Invalid port") from exc
    if port != ALLOWED_SCHEMES[scheme]:
        raise UnsafeUrl(f"Port not allowed: {port}")
    if host == "localhost" or host.endswith(".localhost") or host.endswith(".local") or host.endswith(".internal"):
        raise UnsafeUrl("Local hostnames are not allowed")
    path = parts.path or "/"
    if parts.query:
        path += "?" + parts.query
    clean = urlunsplit((scheme, parts.netloc.lower(), parts.path or "/", parts.query, ""))
    return Target(scheme=scheme, host=host, port=port, path=path, url=clean)


def check_ip(raw: str) -> ipaddress.IPv4Address | ipaddress.IPv6Address:
    ip = ipaddress.ip_address(raw.split("%", 1)[0])
    if isinstance(ip, ipaddress.IPv6Address):
        embedded = None
        if ip.ipv4_mapped:
            embedded = ip.ipv4_mapped
        elif ip in _NAT64:
            embedded = ipaddress.IPv4Address(int(ip) & 0xFFFFFFFF)
        elif ip.sixtofour:
            embedded = ip.sixtofour
        elif ip.teredo:
            raise UnsafeUrl("Teredo addresses are not allowed")
        if embedded is not None:
            check_ip(str(embedded))
            return ip
    if (
        not ip.is_global
        or ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
        or any(ip in net for net in _EXTRA_BLOCKED if net.version == ip.version)
    ):
        raise UnsafeUrl(f"Address not allowed: {ip}")
    return ip


def resolve_public(host: str, port: int) -> list[str]:
    """Resolve and require that EVERY address is public.

    Returns all addresses in the OS's preferred order; safe_get tries them in
    turn, so IPv6-only/NAT64 networks and IPv4-only hosts both work.
    """
    try:
        literal = ipaddress.ip_address(host.strip("[]"))
    except ValueError:
        literal = None
    if literal is not None:
        check_ip(str(literal))
        return [str(literal)]
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except OSError as exc:  # gaierror, or a bare OSError from some resolvers
        raise FetchError(f"DNS lookup failed for {host}") from exc
    addresses: list[str] = []
    for info in infos:
        address = info[4][0]
        if address not in addresses:
            addresses.append(address)
    if not addresses:
        raise FetchError(f"No addresses for {host}")
    for address in addresses:
        check_ip(address)
    return addresses


def safe_get(
    url: str,
    *,
    max_bytes: int = DEFAULT_MAX_BYTES,
    deadline_s: float = DEFAULT_DEADLINE_S,
    method: str = "GET",
    resolver=resolve_public,
    transport: httpx.BaseTransport | None = None,
) -> FetchResult:
    started = time.monotonic()
    original = url
    redirects: list[str] = []
    current = url
    for _hop in range(MAX_REDIRECTS + 1):
        target = parse_target(current)
        addresses = resolver(target.host, target.port)
        response_or_redirect = _fetch_pinned(
            target, addresses, method, max_bytes, deadline_s, started, transport
        )
        if isinstance(response_or_redirect, str):
            redirects.append(response_or_redirect)
            current = response_or_redirect
            continue
        status, headers, body, truncated = response_or_redirect
        return FetchResult(
            url=original,
            final_url=target.url,
            status=status,
            headers=headers,
            body=body,
            elapsed_ms=int((time.monotonic() - started) * 1000),
            truncated=truncated,
            redirects=redirects,
        )
    raise FetchError(f"Too many redirects (>{MAX_REDIRECTS})")


def _fetch_pinned(target, addresses, method, max_bytes, deadline_s, started, transport):
    """Request `target` pinned to each validated address in turn.

    Returns the redirect URL (str) or (status, headers, body, truncated).
    Falls through to the next address only on connection failures.
    """
    last_error: Exception | None = None
    for ip in addresses:
        remaining = deadline_s - (time.monotonic() - started)
        if remaining <= 0:
            raise FetchError("Timed out")
        host_for_url = f"[{ip}]" if ":" in ip else ip
        pinned = f"{target.scheme}://{host_for_url}:{target.port}{target.path}"
        # Only default ports are ever allowed, so Host never needs a port.
        timeout = httpx.Timeout(min(15.0, remaining), connect=min(6.0, remaining))
        try:
            with httpx.Client(
                follow_redirects=False,
                trust_env=False,
                timeout=timeout,
                transport=transport,
            ) as client:
                request = client.build_request(
                    method,
                    pinned,
                    headers={
                        "Host": target.host,
                        "User-Agent": config.user_agent,
                        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
                        "Accept-Language": "en",
                    },
                    extensions={"sni_hostname": target.host},
                )
                response = client.send(request, stream=True)
                try:
                    if response.is_redirect and response.headers.get("location"):
                        return urljoin(target.url, response.headers["location"])
                    body = bytearray()
                    truncated = False
                    for chunk in response.iter_bytes():
                        body.extend(chunk)
                        if len(body) > max_bytes:
                            del body[max_bytes:]
                            truncated = True
                            break
                        if time.monotonic() - started > deadline_s:
                            truncated = True
                            break
                    headers = {k.lower(): v for k, v in response.headers.items()}
                    return response.status_code, headers, bytes(body), truncated
                finally:
                    response.close()
        except (httpx.ConnectError, httpx.ConnectTimeout) as exc:
            last_error = exc  # try the next validated address
            continue
        except httpx.TimeoutException as exc:
            raise FetchError("Timed out") from exc
        except httpx.HTTPError as exc:
            raise FetchError(f"{type(exc).__name__}: {exc}"[:300]) from exc
    raise FetchError(f"Could not connect to {target.host}") from last_error


def robots_allows(url: str, *, fetcher=safe_get) -> bool:
    """Honour robots.txt for our user agent. Unreachable robots.txt = allowed."""
    target = parse_target(url)
    robots_url = f"{target.scheme}://{target.host}/robots.txt"
    try:
        result = fetcher(robots_url, max_bytes=200_000, deadline_s=8.0)
    except (FetchError, UnsafeUrl):
        return True
    if result.status >= 400:
        return True
    parser = RobotFileParser()
    parser.parse(result.text.splitlines())
    return parser.can_fetch(config.user_agent, url)

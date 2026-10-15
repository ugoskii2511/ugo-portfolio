import httpx
import pytest

from app.web.safe_fetch import FetchError, UnsafeUrl, check_ip, parse_target, safe_get

BLOCKED_URLS = [
    "file:///etc/passwd",
    "ftp://example.com/",
    "gopher://example.com/",
    "javascript:alert(1)",
    "http://localhost/",
    "http://foo.localhost/",
    "http://printer.local/",
    "http://metadata.internal/",
    "http://user:pass@example.com/",
    "http://example.com:8080/",
    "https://example.com:22/",
    "",
    "http://" + "a" * 2100 + ".com/",
]


@pytest.mark.parametrize("url", BLOCKED_URLS)
def test_parse_target_rejects_unsafe_urls(url):
    with pytest.raises(UnsafeUrl):
        parse_target(url)


@pytest.mark.parametrize(
    "ip",
    [
        "127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.0.10", "169.254.169.254",
        "100.64.0.1", "0.0.0.0", "::1", "fe80::1", "fd12::1", "::ffff:127.0.0.1",
        "::ffff:10.0.0.1", "64:ff9b::a00:1", "2002:a00:1::", "224.0.0.1", "198.18.0.1",
    ],
)
def test_check_ip_blocks_internal_addresses(ip):
    with pytest.raises(UnsafeUrl):
        check_ip(ip)


@pytest.mark.parametrize("ip", ["93.184.216.34", "2606:4700::6810:84e5", "64:ff9b::5db8:d822"])
def test_check_ip_allows_public_addresses(ip):
    check_ip(ip)  # 64:ff9b::5db8:d822 embeds public 93.184.216.34 (NAT64)


def _resolver(mapping):
    def resolve(host, port):
        if host not in mapping:
            raise FetchError("DNS lookup failed")
        for ip in mapping[host]:
            check_ip(ip)
        return mapping[host]

    return resolve


def test_redirect_to_private_address_is_blocked():
    def handler(request):
        return httpx.Response(302, headers={"location": "http://internal.example/"})

    resolver = _resolver({"example.com": ["93.184.216.34"], "internal.example": ["10.0.0.5"]})
    with pytest.raises(UnsafeUrl):
        safe_get("https://example.com/", resolver=resolver, transport=httpx.MockTransport(handler))


def test_redirect_to_disallowed_scheme_is_blocked():
    def handler(request):
        return httpx.Response(301, headers={"location": "file:///etc/passwd"})

    with pytest.raises(UnsafeUrl):
        safe_get("https://example.com/", resolver=_resolver({"example.com": ["93.184.216.34"]}), transport=httpx.MockTransport(handler))


def test_redirect_loop_is_capped():
    def handler(request):
        return httpx.Response(302, headers={"location": "https://example.com/again"})

    with pytest.raises(FetchError, match="Too many redirects"):
        safe_get("https://example.com/", resolver=_resolver({"example.com": ["93.184.216.34"]}), transport=httpx.MockTransport(handler))


def test_connection_is_pinned_to_validated_ip_with_original_host_header():
    seen = {}

    def handler(request):
        seen["url"] = str(request.url)
        seen["host"] = request.headers["host"]
        seen["sni"] = request.extensions.get("sni_hostname")
        return httpx.Response(200, text="<html><title>Hi</title></html>")

    result = safe_get("https://example.com/page?q=1", resolver=_resolver({"example.com": ["93.184.216.34"]}), transport=httpx.MockTransport(handler))
    assert seen["url"] == "https://93.184.216.34/page?q=1"  # default port elided by httpx
    assert seen["host"] == "example.com"
    assert seen["sni"] == "example.com"
    assert result.status == 200 and result.final_url == "https://example.com/page?q=1"


def test_response_size_is_capped():
    def handler(request):
        return httpx.Response(200, content=b"x" * 50_000)

    result = safe_get("https://example.com/", max_bytes=1000, resolver=_resolver({"example.com": ["93.184.216.34"]}), transport=httpx.MockTransport(handler))
    assert len(result.body) == 1000 and result.truncated


def test_falls_back_to_next_validated_address_on_connect_failure():
    calls = []

    def handler(request):
        calls.append(request.url.host)
        if request.url.host == "93.184.216.34":
            raise httpx.ConnectError("unreachable", request=request)
        return httpx.Response(200, text="ok")

    resolver = _resolver({"example.com": ["93.184.216.34", "2606:4700::6810:84e5"]})
    result = safe_get("https://example.com/", resolver=resolver, transport=httpx.MockTransport(handler))
    assert result.status == 200
    assert calls == ["93.184.216.34", "2606:4700::6810:84e5"]


def test_any_private_address_in_dns_answer_rejects_host():
    # A host resolving to one public and one private address is refused.
    resolver = _resolver({"mixed.example": ["93.184.216.34", "192.168.1.1"]})
    with pytest.raises(UnsafeUrl):
        safe_get("https://mixed.example/", resolver=resolver, transport=httpx.MockTransport(lambda r: httpx.Response(200)))

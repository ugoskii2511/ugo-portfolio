from app.web.audit import analyse_html, run_audit
from app.web.safe_fetch import FetchError, FetchResult
from app.web.website_status import check_listed_website, page_names_business, search_candidate_domains


def _result(html, url="https://biz.ng/", status=200, ms=400, headers=None):
    return FetchResult(url, url, status, headers or {}, html.encode(), ms, False, [])


BASIC = """<html><head><title>Sunrise Academy | Abuja</title></head>
<body><h1>Sunrise Academy</h1><img src=a.png><img src=b.png alt="x">
<p>© 2019 Sunrise Academy. Call us.</p></body></html>"""


def _by_key(findings):
    return {f["key"]: f for f in findings}


def test_static_page_checks_report_real_evidence():
    f = _by_key(analyse_html(BASIC, _result(BASIC)))
    assert f["viewport"]["status"] == "fail" and f["viewport"]["priority"] == "high"
    assert f["meta_description"]["status"] == "fail"
    assert f["title"]["status"] == "pass" and "Sunrise Academy" in f["title"]["evidence"]
    assert f["img_alt"]["evidence"] == "1 of 2 images have no alt attribute."
    assert f["contact"]["status"] == "fail"
    assert f["copyright"]["status"] == "warn" and "2019" in f["copyright"]["evidence"]
    assert f["hsts"]["status"] == "warn"


def test_http_only_site_fails_https_check():
    f = _by_key(analyse_html(BASIC, _result(BASIC, url="http://biz.ng/")))
    assert f["https"]["status"] == "fail"


def test_client_rendered_page_marks_content_checks_unavailable():
    spa = '<html lang="en"><head><title>Plot One | Mortgages</title><meta name="viewport" content="width=device-width"></head><body><div id="root"></div><script type="module" src="/assets/index.js"></script></body></html>'
    f = _by_key(analyse_html(spa, _result(spa)))
    for key in ("h1", "cta", "contact", "ecommerce"):
        assert f[key]["status"] == "unavailable", key
    # Head-level checks remain valid.
    assert f["viewport"]["status"] == "pass"
    assert f["title"]["status"] == "pass"


def test_unreachable_site_is_a_failed_audit_not_a_guess():
    def fetch(url, **kw):
        raise FetchError("DNS lookup failed for biz.ng")

    result = run_audit("https://biz.ng/", fetch=fetch, robots=lambda u: True)
    assert result.status == "failed"
    assert result.findings[0]["key"] == "reachable" and result.findings[0]["status"] == "fail"


def test_robots_disallow_is_respected():
    result = run_audit("https://biz.ng/", fetch=lambda *a, **k: None, robots=lambda u: False)
    assert result.status == "failed" and result.findings[0]["status"] == "unavailable"


def test_broken_internal_links_are_detected():
    page = '<html><head><title>Biz shop Abuja</title></head><body><a href="/ok">ok</a><a href="/gone">gone</a></body></html>'

    def fetch(url, **kw):
        if url.endswith("/gone"):
            return _result("nope", url=url, status=404)
        return _result(page, url=url)

    result = run_audit("https://biz.ng/", fetch=fetch, robots=lambda u: True)
    links = _by_key(result.findings)["broken_links"]
    assert links["status"] == "fail" and "1 of 2" in links["evidence"]


def test_page_names_business_requires_distinctive_tokens():
    assert page_names_business("<title>Sunrise Academy</title>", "Sunrise Academy Ltd")[0]
    assert not page_names_business("<title>Welcome</title><p>hello</p>", "Sunrise Academy")[0]


def test_listed_site_statuses():
    ok = check_listed_website("Sunrise Academy", "https://biz.ng/", fetch=lambda u, **k: _result(BASIC))
    assert ok.status == "VERIFIED"
    other = check_listed_website("Moonlight Bakery", "https://biz.ng/", fetch=lambda u, **k: _result(BASIC))
    assert other.status == "FOUND_UNVERIFIED"
    down = check_listed_website("Sunrise Academy", "https://biz.ng/", fetch=lambda u, **k: _result("err", status=503))
    assert down.status == "UNCERTAIN" and "503" in down.evidence

    def dns_fail(u, **k):
        raise FetchError("DNS lookup failed")

    assert check_listed_website("Sunrise Academy", "https://biz.ng/", fetch=dns_fail).status == "UNCERTAIN"


def test_candidate_domain_search_only_claims_name_matches():
    page = "<title>Sunrise Academy | Official</title>"
    found = search_candidate_domains("Sunrise Academy", fetch=lambda u, **k: _result(page, url=u), resolves=lambda h: h == "sunriseacademy.com.ng")
    assert found.status == "FOUND_UNVERIFIED" and "sunriseacademy.com.ng" in found.evidence
    nothing = search_candidate_domains("Sunrise Academy", fetch=lambda u, **k: _result("<title>Parked domain</title>", url=u), resolves=lambda h: True)
    assert nothing.status == "NONE_FOUND"
    assert "sunriseacademy.com.ng" in nothing.evidence

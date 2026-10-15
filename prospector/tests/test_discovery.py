import httpx
import pytest

from app.discovery.industries import classify
from app.discovery.normalize import normalize_email, normalize_name, normalize_phone, normalize_website, website_domain
from app.discovery.osm import BBox, ProviderError, build_query, element_to_record, run_overpass, tiles


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("0803 123 4567", "+2348031234567"),
        ("+234 803 123 4567", "+2348031234567"),
        ("2348031234567", "+2348031234567"),
        ("08031234567; 08051112222", "+2348031234567"),
        ("abc", None),
        ("", None),
    ],
)
def test_normalize_phone(raw, expected):
    assert normalize_phone(raw) == expected


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("example.com", "https://example.com/"),
        ("HTTP://Example.COM/About", "http://example.com/About"),
        ("https://www.facebook.com/somebiz", None),
        ("https://wa.me/2348000000000", None),
        ("ftp://example.com", None),
        ("not a url", None),
    ],
)
def test_normalize_website(raw, expected):
    assert normalize_website(raw) == expected


def test_website_domain_strips_www():
    assert website_domain("https://www.Example.com/x") == "example.com"


def test_normalize_name_drops_noise_words():
    assert normalize_name("Mama Put Restaurant Nig. Ltd") == "mama put restaurant"
    assert normalize_name("The Prudential International School") == "prudential school"


def test_normalize_email():
    assert normalize_email("Info@Biz.COM ") == "info@biz.com"
    assert normalize_email("mailto:hi@x.ng") == "hi@x.ng"
    assert normalize_email("not-an-email") is None


def test_classify_maps_tags_to_industry():
    assert classify({"amenity": "school"}) == ("Education", "school")
    assert classify({"tourism": "guest_house"}) == ("Hospitality", "guest house")
    assert classify({"shop": "clothes"}) == ("Fashion", "clothes")
    assert classify({"craft": "carpenter"}) == (None, "carpenter")


def test_tiles_split_large_box():
    cells = tiles(BBox(9.0, 7.0, 9.3, 7.3), size=0.12)
    assert len(cells) == 9
    assert cells[0].south == 9.0 and cells[-1].north == pytest.approx(9.3)


def test_build_query_website_filters():
    box = BBox(9.0, 7.4, 9.1, 7.5)
    q = build_query(box, ["Education"], "without_website", 30)
    assert '[!"website"][!"contact:website"][!"url"]' in q
    assert "out tags center 30;" in q
    q2 = build_query(box, ["Education"], "with_website", 30)
    assert '["website"];' in q2 and '["contact:website"];' in q2


def test_element_to_record_normalises_and_attributes_source():
    record = element_to_record(
        {
            "type": "node",
            "id": 123,
            "lat": 9.05,
            "lon": 7.49,
            "tags": {"name": "Sunrise Academy", "amenity": "school", "phone": "0803 123 4567", "website": "sunrise.edu.ng", "addr:city": "Abuja"},
        }
    )
    assert record["industry"] == "Education"
    assert record["phone"] == "+2348031234567"
    assert record["website"] == "https://sunrise.edu.ng/"
    assert record["sourceRef"] == "node/123"
    assert record["sourceUrl"] == "https://www.openstreetmap.org/node/123"
    assert "OpenStreetMap" in record["sourceLicense"]


def test_element_without_name_is_skipped():
    assert element_to_record({"type": "node", "id": 1, "tags": {"amenity": "school"}}) is None


def test_overpass_fails_over_to_next_server():
    calls = []

    def handler(request):
        calls.append(request.url.host)
        if request.url.host == "overpass-api.de":
            return httpx.Response(502)
        return httpx.Response(200, json={"elements": [{"type": "node", "id": 1, "tags": {"name": "X"}}]})

    client = httpx.Client(transport=httpx.MockTransport(handler))
    elements = run_overpass("[out:json];", client=client, sleep=lambda s: None)
    assert len(elements) == 1
    assert calls[0] == "overpass-api.de" and calls[-1] == "overpass.private.coffee"


def test_overpass_all_servers_down_raises_provider_error():
    client = httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(503)))
    with pytest.raises(ProviderError):
        run_overpass("[out:json];", client=client, sleep=lambda s: None)

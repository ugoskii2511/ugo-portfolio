"""Industry groups and how each maps onto OpenStreetMap tags."""

from __future__ import annotations

# industry -> list of (osm_key, value_regex)
INDUSTRIES: dict[str, list[tuple[str, str]]] = {
    "Education": [
        ("amenity", "school|college|university|kindergarten|driving_school|language_school|music_school|training|prep_school"),
        ("office", "educational_institution"),
    ],
    "Food & drink": [("amenity", "restaurant|cafe|fast_food|bar|pub|ice_cream|food_court|biergarten")],
    "Hospitality": [("tourism", "hotel|guest_house|motel|hostel|apartment|resort")],
    "Retail": [("shop", "supermarket|convenience|general|department_store|electronics|mobile_phone|computer|furniture|hardware|books|gift|variety_store|houseware|kitchen|toys|sports|stationery|bakery")],
    "Fashion": [("shop", "clothes|shoes|tailor|fabric|boutique|jewelry|bag|fashion_accessories|watches")],
    "Real estate": [("office", "estate_agent|property_management|real_estate")],
    "Health": [
        ("amenity", "clinic|hospital|pharmacy|dentist|doctors"),
        ("healthcare", "clinic|hospital|pharmacy|dentist|doctor|laboratory|optometrist|physiotherapist"),
    ],
    "Professional services": [
        ("office", "lawyer|accountant|consulting|company|financial|insurance|it|architect|advertising_agency|employment_agency|tax_advisor|notary|engineer|surveyor"),
    ],
    "Logistics": [
        ("office", "logistics|courier|moving_company|freight"),
        ("shop", "courier"),
    ],
    "Beauty & wellness": [
        ("shop", "beauty|hairdresser|cosmetics|massage|perfumery|nail_salon"),
        ("leisure", "fitness_centre|sports_centre"),
    ],
    "Automotive": [
        ("shop", "car|car_repair|car_parts|tyres|motorcycle"),
        ("amenity", "car_wash|car_rental"),
    ],
    "Agriculture": [
        ("shop", "agrarian|farm|garden_centre"),
        ("office", "agricultural|farm"),
    ],
    "Events & entertainment": [
        ("amenity", "events_venue|cinema|nightclub|theatre|conference_centre"),
        ("leisure", "dance|amusement_arcade"),
    ],
}

ALL_INDUSTRIES = list(INDUSTRIES)


def classify(tags: dict[str, str]) -> tuple[str | None, str | None]:
    """(industry, category label) for an OSM element's tags."""
    for industry, rules in INDUSTRIES.items():
        for key, regex in rules:
            value = tags.get(key)
            if value and value in regex.split("|"):
                return industry, value.replace("_", " ")
    for key in ("shop", "office", "amenity", "tourism", "craft", "healthcare", "leisure"):
        if tags.get(key):
            return None, tags[key].replace("_", " ")
    return None, None

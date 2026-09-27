from collections import Counter

import pytest

from build_registry import (
    MISSING,
    OUTSIDE_SRI_LANKA,
    SHARED_POINT,
    VERIFIED,
    WRONG_DISTRICT,
    build,
    location_status,
    migration_sql,
    point,
)


def record(
    hin="PKY0000001",
    name="Peradeniya",
    type1="Hospital",
    type2="Teaching",
    rdhs="KY",
    lat=7.2690,
    lng=80.5940,
    google_district="Kandy",
):
    source = {"hin": hin, "name": name, "type1": type1, "type2": type2, "rdhs": rdhs}
    if lat is not None:
        source["geometry"] = {"location": {"lat": lat, "lng": lng}}
        source["place_id"] = "ChIJ-dropped"
        source["addressComponents"] = [
            {"long_name": google_district, "types": ["administrative_area_level_2"]}
        ]
    return source


def status_of(source, district="KDY"):
    """Status of a record that is the only one at its point."""
    uses = Counter([point(source)]) if "geometry" in source else Counter()
    return location_status(source, district, uses)


def test_a_unique_point_inside_its_own_district_is_verified():
    assert status_of(record()) == VERIFIED


def test_a_record_without_geometry_has_no_location():
    assert status_of(record(lat=None)) == MISSING


def test_a_point_outside_sri_lanka_is_rejected():
    assert (
        status_of(record(lat=41.3293, lng=19.8130, google_district="Tirana")) == OUTSIDE_SRI_LANKA
    )


def test_a_point_shared_with_another_institution_is_rejected():
    shared = record()
    uses = Counter({(7.2690, 80.5940): 2})
    assert location_status(shared, "KDY", uses) == SHARED_POINT


def test_a_point_geocoded_into_another_district_is_rejected():
    assert status_of(record(google_district="Colombo")) == WRONG_DISTRICT


def test_google_spelling_of_monaragala_is_accepted():
    source = record(rdhs="MG", google_district="Moneragala")
    assert status_of(source, district="MON") == VERIFIED


def test_only_hospitals_and_moh_offices_are_kept():
    facilities = build(
        [
            record(hin="PKY0000001", type1="Hospital", lat=7.1),
            record(hin="PKY0000002", type1="MOH Office", type2="MOH", lat=7.2),
            record(hin="PKY0000003", type1="Other Clinics", type2="ADC", lat=7.3),
            record(hin="PKY0000004", type1="Administration", type2="RDHS", lat=7.4),
        ]
    )
    assert [(f.code, f.category) for f in facilities] == [
        ("PKY0000001", "HOSPITAL"),
        ("PKY0000002", "MOH_OFFICE"),
    ]


def test_kalmunai_rdhs_belongs_to_ampara_and_codes_match_case_insensitively():
    facilities = build(
        [
            record(hin="PKL0000001", rdhs="KL", lat=7.41, lng=81.82, google_district="Ampara"),
            record(hin="PMl0012435", rdhs="Ml", lat=None),
        ]
    )
    assert [(f.code, f.district_code) for f in facilities] == [
        ("PKL0000001", "AMP"),
        ("PML0012435", "MUL"),
    ]


def test_an_unverified_location_is_dropped_not_kept():
    [facility] = build([record(google_district="Colombo")])
    assert (facility.latitude, facility.longitude) == (None, None)
    assert facility.location_status == WRONG_DISTRICT


def test_names_and_types_have_whitespace_normalised():
    [facility] = build([record(name="  Nuwera   Eliya ", type2="Divisional C ")])
    assert facility.name == "Nuwera Eliya"
    assert facility.institution_type == "Divisional C"


def test_duplicate_codes_are_refused():
    with pytest.raises(ValueError, match="PKY0000001"):
        build([record(lat=7.1), record(lat=7.2)])


def test_migration_escapes_quotes_and_writes_null_locations():
    facilities = build(
        [
            record(hin="PKY0000001", name="Sirimavo Bandaranayake Children's Hospital"),
            record(hin="PKY0000002", lat=None),
        ]
    )
    sql = migration_sql(facilities)
    assert "'Sirimavo Bandaranayake Children''s Hospital'" in sql
    assert "'KDY', 'HOSPITAL', 'Teaching', 7.269000, 80.594000)," in sql
    assert "'KDY', 'HOSPITAL', 'Teaching', null, null);" in sql
    assert "2 facilities, 1 with a verified location" in sql


def test_no_google_identifiers_reach_the_output():
    sql = migration_sql(build([record()]))
    assert "ChIJ" not in sql

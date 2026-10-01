import math
import random
from datetime import UTC, datetime, timedelta

from sentinel_detector.geography import RING_KM, distance_km
from sentinel_detector.store import ring_counter, week_points
from sentinel_detector.windows import WEEK

END = datetime(2026, 9, 27, 6, tzinfo=UTC)
KANDY = (7.291, 80.634)
KM_PER_DEGREE = 111.195


def facility_ids(db, district, count):
    return [
        row[0]
        for row in db.execute(
            "select id from facilities where district_code = %s order by id limit %s",
            (district, count),
        )
    ]


def add_located(db, district, group, reported_at, latitude, longitude, facility_id):
    db.execute(
        """
        insert into reports (id, facility_id, district_code, symptom_group, age_band,
            latitude, longitude, reported_at, received_at)
        values (gen_random_uuid(), %s, %s, %s, '30-39', %s, %s, %s, %s)
        """,
        (facility_id, district, group, latitude, longitude, reported_at, reported_at),
    )


def offset(centre, north_km, east_km):
    return (
        round(centre[0] + north_km / KM_PER_DEGREE, 3),
        round(centre[1] + east_km / (KM_PER_DEGREE * math.cos(math.radians(centre[0]))), 3),
    )


def test_reads_the_series_located_reports_for_the_week_only(db):
    [facility] = facility_ids(db, "KDY", 1)
    add_located(db, "KDY", "DENGUE_LIKE", END - timedelta(hours=1), *KANDY, facility)
    add_located(db, "KDY", "DENGUE_LIKE", END - WEEK, *KANDY, facility)
    # Outside the week, in another group, in another district, and without a location.
    add_located(db, "KDY", "DENGUE_LIKE", END, *KANDY, facility)
    add_located(db, "KDY", "DENGUE_LIKE", END - WEEK - timedelta(seconds=1), *KANDY, facility)
    add_located(db, "KDY", "INFLUENZA_LIKE", END - timedelta(hours=1), *KANDY, facility)
    add_located(db, "MTL", "DENGUE_LIKE", END - timedelta(hours=1), 7.47, 80.62, facility)
    add_located(db, "KDY", "DENGUE_LIKE", END - timedelta(hours=1), None, None, facility)

    points = week_points(db, "KDY", "DENGUE_LIKE", END)

    assert [(p.latitude, p.longitude, p.facility_id) for p in points] == [
        (*KANDY, facility),
        (*KANDY, facility),
    ]


def test_counts_a_ring_this_week_and_in_the_eight_before(db):
    first, second, third = facility_ids(db, "KDY", 3)
    now = END - timedelta(hours=2)
    before = END - 3 * WEEK
    for facility in (first, second, second, third):
        add_located(db, "KDY", "DENGUE_LIKE", now, *offset(KANDY, 0.5, 0), facility)
    add_located(db, "KDY", "DENGUE_LIKE", before, *offset(KANDY, 0, 1), first)
    # Beyond the ring, both weeks: in the totals, not the ring.
    add_located(db, "KDY", "DENGUE_LIKE", now, *offset(KANDY, 3, 0), first)
    add_located(db, "KDY", "DENGUE_LIKE", before, *offset(KANDY, 0, -3), first)
    # No location: in neither.
    add_located(db, "KDY", "DENGUE_LIKE", now, None, None, first)

    ring = ring_counter(db, "KDY", "DENGUE_LIKE", END)(*KANDY)

    assert (ring.latitude, ring.longitude) == KANDY
    assert (ring.reports, ring.facilities, ring.baseline_reports) == (4, 3, 1)
    assert (ring.week_total, ring.baseline_total) == (5, 2)


def test_postgis_and_the_haversine_agree_on_what_is_in_the_ring(db):
    rng = random.Random(2026)
    [facility] = facility_ids(db, "KDY", 1)
    inside = 0
    for _ in range(300):
        point = offset(KANDY, rng.uniform(-3, 3), rng.uniform(-3, 3))
        # Points within a few metres of the edge are left out: the stored rounding is coarser.
        if abs(distance_km(KANDY, point) - RING_KM) < 0.005:
            continue
        add_located(db, "KDY", "DENGUE_LIKE", END - timedelta(hours=1), *point, facility)
        inside += distance_km(KANDY, point) <= RING_KM

    assert ring_counter(db, "KDY", "DENGUE_LIKE", END)(*KANDY).reports == inside

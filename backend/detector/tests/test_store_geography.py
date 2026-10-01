import math
import random
from datetime import UTC, datetime, timedelta

import pandas as pd

from sentinel_detector.geography import RING_KM, Cluster, distance_km
from sentinel_detector.store import record_alerts, record_clusters, ring_counter, week_points
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


def raise_alert(db, district="CMB", group="DENGUE_LIKE"):
    return db.execute(
        """
        insert into alerts (district_code, symptom_group, first_detected_at, last_detected_at,
            observed_count, baseline_mean, baseline_sd, z_score, peak_z_score, threshold)
        values (%s, %s, %s, %s, 41, 25, 5, 3.2, 3.2, 3)
        returning code
        """,
        (district, group, END, END),
    ).fetchone()[0]


def stored_clusters(db, code):
    return db.execute(
        """
        select c.latitude::float8, c.longitude::float8, c.radius_metres, c.report_count,
               c.facility_count, c.expected_count::float8, f.code
        from alert_clusters c
        join alerts a on a.id = c.alert_id
        left join facilities f on f.id = c.nearest_facility_id
        where a.code = %s
        order by c.id
        """,
        (code,),
    ).fetchall()


def test_records_each_cluster_with_its_ring_and_nearest_facility(db):
    code = raise_alert(db)
    # Beside the Infectious Diseases Hospital, Angoda.
    cluster = Cluster(6.923, 79.918, 17, 7, 3.37, 7.4)

    record_clusters(db, code, [cluster])

    [nearest] = db.execute("""
        select code from facilities
        where district_code = 'CMB' and location is not null
        order by st_distance(location, st_point(79.918, 6.923, 4326)::geography)
        limit 1
        """).fetchone()
    assert stored_clusters(db, code) == [(6.923, 79.918, 2000, 17, 7, 3.37, nearest)]
    assert nearest == "LCB0000117"


def test_finds_the_nearest_facility_within_the_alerts_own_district(db):
    # Gampaha's side of the Colombo boundary: a Colombo alert still names a Colombo facility.
    code = raise_alert(db)

    record_clusters(db, code, [Cluster(7.09, 79.99, 5, 3, 1.0, 4.0)])

    [(*_, nearest)] = stored_clusters(db, code)
    assert db.execute(
        "select district_code from facilities where code = %s", (nearest,)
    ).fetchone() == ("CMB",)


def test_a_later_check_replaces_the_clusters_and_none_clears_them(db):
    code = raise_alert(db)
    other = raise_alert(db, "KDY")
    record_clusters(db, code, [Cluster(6.923, 79.918, 17, 7, 3.37, 7.4)])
    record_clusters(db, other, [Cluster(*KANDY, 9, 4, 2.0, 4.9)])

    record_clusters(db, code, [Cluster(6.93, 79.93, 12, 5, 2.5, 6.0)])
    assert [row[:2] for row in stored_clusters(db, code)] == [(6.93, 79.93)]

    record_clusters(db, code, [])
    assert stored_clusters(db, code) == []
    assert len(stored_clusters(db, other)) == 1


def test_an_alert_written_by_a_check_is_marked_as_geographically_checked(db):
    scored = pd.DataFrame(
        {
            "observed": [41],
            "baseline_mean": [25.0],
            "baseline_sd": [5.0],
            "z_score": [3.2],
            "alert": [True],
        },
        index=pd.MultiIndex.from_tuples(
            [("KDY", "DENGUE_LIKE")], names=["district_code", "symptom_group"]
        ),
    )

    [raised] = record_alerts(db, scored, END, 3.0)
    first = db.execute(
        "select clusters_checked_at from alerts where code = %s", (raised.code,)
    ).fetchone()
    record_alerts(db, scored, END + timedelta(hours=1), 3.0)
    second = db.execute(
        "select clusters_checked_at from alerts where code = %s", (raised.code,)
    ).fetchone()

    assert first == (END,) and second == (END + timedelta(hours=1),)

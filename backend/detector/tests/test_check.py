import random
from datetime import UTC, datetime, timedelta

import pytest

from sentinel_detector.check import InsufficientHistory, run_check
from sentinel_detector.geography import MIN_FACILITIES, candidate_centres
from sentinel_detector.store import ring_counter, week_points
from sentinel_detector.windows import WEEK, history_start

END = datetime(2026, 9, 27, 6, tzinfo=UTC)

# Kandy's dengue-like baseline, oldest week (w8) first: mean 25, as in the project overview.
KANDY_BASELINE = [26, 24, 31, 19, 26, 25, 22, 27]


def add_reports(db, district, group, reported_at, count=1):
    db.execute(
        """
        insert into reports (id, facility_id, district_code, symptom_group, age_band,
            reported_at, received_at)
        select gen_random_uuid(),
               (select id from facilities where district_code = %(district)s order by id limit 1),
               %(district)s, %(group)s, '30-39', %(at)s, %(at)s
        from generate_series(1, %(count)s)
        """,
        {"district": district, "group": group, "at": reported_at, "count": count},
    )


def seed_history(db, end=END, current=25):
    """Nine weeks of Kandy dengue-like reports: the baseline above, then `current` this week."""
    for weeks_back, count in zip(range(8, 0, -1), KANDY_BASELINE, strict=True):
        add_reports(db, "KDY", "DENGUE_LIKE", end - weeks_back * WEEK - WEEK / 2, count)
    add_reports(db, "KDY", "DENGUE_LIKE", end - WEEK / 2, current)
    # The oldest moment the check reads, so the history is complete.
    add_reports(db, "ANU", "GASTROINTESTINAL", history_start(end))


def alerts(db):
    return db.execute("""
        select code, district_code, symptom_group, status, first_detected_at, last_detected_at,
               observed_count, baseline_mean, baseline_sd, z_score, peak_z_score, threshold
        from alerts order by id
        """).fetchall()


def test_refuses_to_check_without_any_history(db):
    with pytest.raises(InsufficientHistory, match="there are none"):
        run_check(db, END)


def test_refuses_to_check_with_less_than_nine_weeks_of_history(db):
    add_reports(db, "KDY", "DENGUE_LIKE", END - timedelta(days=30))
    with pytest.raises(InsufficientHistory, match="63 days"):
        run_check(db, END)


def test_an_ordinary_week_raises_nothing(db):
    seed_history(db, current=29)

    result = run_check(db, END)

    assert result.series == 25 * 4
    assert result.alerts == []
    assert alerts(db) == []


def test_a_week_far_above_baseline_raises_a_new_alert(db):
    seed_history(db, current=41)

    [raised] = run_check(db, END).alerts

    assert raised.is_new
    assert (raised.district_code, raised.symptom_group, raised.observed) == (
        "KDY",
        "DENGUE_LIKE",
        41,
    )
    [row] = alerts(db)
    code, district, group, status, first, last, observed, mean, sd, z, peak, threshold = row
    assert code == raised.code and code.startswith("A-")
    assert (district, group, status, observed) == ("KDY", "DENGUE_LIKE", "NEW", 41)
    assert first == last == END
    assert float(mean) == 25.0
    # The baseline's own spread (3.5) is below a Poisson count's, so that floor applies.
    assert float(sd) == 5.0
    assert float(z) == 3.2 and peak == z
    assert float(threshold) == 3.0


def test_checking_the_same_hour_twice_changes_nothing(db):
    seed_history(db, current=41)

    first = run_check(db, END + timedelta(minutes=5))
    second = run_check(db, END + timedelta(minutes=40))

    assert first.alerts[0].is_new and not second.alerts[0].is_new
    assert len(alerts(db)) == 1


def test_later_checks_extend_the_same_alert(db):
    seed_history(db, current=41)
    run_check(db, END)
    add_reports(db, "KDY", "DENGUE_LIKE", END + timedelta(minutes=30), 5)

    [raised] = run_check(db, END + timedelta(hours=1)).alerts

    assert not raised.is_new
    [row] = alerts(db)
    assert row[4] == END and row[5] == END + timedelta(hours=1)
    assert row[6] == 46
    assert row[10] >= row[9]


def test_a_rise_after_more_than_a_day_without_one_is_a_new_alert(db):
    seed_history(db, current=41)
    run_check(db, END)

    later = END + timedelta(hours=26)
    add_reports(db, "KDY", "DENGUE_LIKE", later - timedelta(hours=1), 10)
    [raised] = run_check(db, later).alerts

    assert raised.is_new
    assert len(alerts(db)) == 2


def test_an_older_check_does_not_rewrite_a_newer_one(db):
    seed_history(db, current=41)
    run_check(db, END + timedelta(hours=2))

    assert run_check(db, END).alerts == []
    [row] = alerts(db)
    assert row[5] == END + timedelta(hours=2)


def test_the_threshold_used_is_recorded(db):
    seed_history(db, current=39)

    assert run_check(db, END, threshold=3.0).alerts == []
    [raised] = run_check(db, END, threshold=2.5).alerts
    assert float(alerts(db)[0][11]) == 2.5 and raised.is_new


def test_window_edges_count_each_report_exactly_once(db):
    seed_history(db, current=0)
    # Start of the current week: counted. The end itself: not yet.
    add_reports(db, "CMB", "LEPTOSPIROSIS_LIKE", END - WEEK, 5)
    add_reports(db, "CMB", "LEPTOSPIROSIS_LIKE", END, 50)
    # Just before the history: not read at all.
    add_reports(db, "CMB", "LEPTOSPIROSIS_LIKE", history_start(END) - timedelta(seconds=1), 50)

    [raised] = run_check(db, END).alerts

    assert (raised.district_code, raised.observed) == ("CMB", 5)


KM_PER_DEGREE = 111.195

# Colombo's influenza-like baseline: a busy series in a district dense with facilities.
COLOMBO_BASELINE = [58, 62, 55, 64, 60, 57, 63, 61]


def located_facilities(db, district):
    return db.execute(
        """
        select id, latitude::float8, longitude::float8 from facilities
        where district_code = %s and location is not null order by id
        """,
        (district,),
    ).fetchall()


def add_located(db, district, reported_at, facility, near, spread_km, rng):
    """A dengue-like report from `facility`, placed normally around `near`."""
    latitude = near[0] + rng.gauss(0, spread_km) / KM_PER_DEGREE
    longitude = near[1] + rng.gauss(0, spread_km) / KM_PER_DEGREE
    db.execute(
        """
        insert into reports (id, facility_id, district_code, symptom_group, age_band,
            latitude, longitude, reported_at, received_at)
        values (gen_random_uuid(), %s, %s, 'DENGUE_LIKE', '30-39', %s, %s, %s, %s)
        """,
        (facility, district, round(latitude, 3), round(longitude, 3), reported_at, reported_at),
    )


def everyday(db, district, reported_at, count, facilities, rng):
    """Reports placed as the simulator places a district's everyday load: near any facility."""
    for _ in range(count):
        facility, *where = rng.choice(facilities)
        add_located(db, district, reported_at, facility, where, 2.0, rng)


def seed_located_history(db, district, baseline, rng):
    """Eight baseline weeks spread over the district's facilities; returns the facilities."""
    facilities = located_facilities(db, district)
    for weeks_back, count in zip(range(8, 0, -1), baseline, strict=True):
        everyday(db, district, END - weeks_back * WEEK - WEEK / 2, count, facilities, rng)
    add_reports(db, "ANU", "GASTROINTESTINAL", history_start(END))
    return facilities


def clusters(db, code):
    return db.execute(
        """
        select c.report_count, c.facility_count, c.radius_metres, c.nearest_facility_id
        from alert_clusters c join alerts a on a.id = c.alert_id where a.code = %s
        """,
        (code,),
    ).fetchall()


def test_a_flagged_series_bunched_in_one_place_records_a_cluster(db):
    rng = random.Random(2026)
    facilities = seed_located_history(db, "KDY", KANDY_BASELINE, rng)
    everyday(db, "KDY", END - WEEK / 2, 25, facilities, rng)
    # A local outbreak: 16 patients within a kilometre or so of one facility, seen by the
    # four facilities nearest to it.
    centre = facilities[0][1:]
    nearest = sorted(facilities, key=lambda f: (f[1] - centre[0]) ** 2 + (f[2] - centre[1]) ** 2)
    for i in range(16):
        add_located(db, "KDY", END - WEEK / 2, nearest[i % 4][0], centre, 0.5, rng)

    [raised] = run_check(db, END).alerts

    [cluster] = raised.clusters
    assert cluster.reports >= 16 and cluster.facilities >= 3
    [(reports, facilities_seen, radius, nearest_facility)] = clusters(db, raised.code)
    assert (reports, facilities_seen, radius) == (cluster.reports, cluster.facilities, 2000)
    assert nearest_facility is not None


def test_a_flagged_series_risen_everywhere_records_no_cluster(db):
    rng = random.Random(2026)
    facilities = seed_located_history(db, "CMB", COLOMBO_BASELINE, rng)
    # A seasonal wave: nearly twice the usual week, spread as the everyday load is.
    everyday(db, "CMB", END - WEEK / 2, 110, facilities, rng)

    [raised] = run_check(db, END).alerts

    # Central Colombo is dense with facilities, so the week does bunch there, from
    # several of them; but no more than it always does, so it is no cluster.
    points = week_points(db, "CMB", "DENGUE_LIKE", END)
    ring_at = ring_counter(db, "CMB", "DENGUE_LIKE", END)
    rings = [ring_at(*centre) for centre in candidate_centres(points)]
    assert any(ring.facilities >= MIN_FACILITIES for ring in rings)
    assert raised.clusters == ()
    assert clusters(db, raised.code) == []
    assert db.execute(
        "select clusters_checked_at from alerts where code = %s", (raised.code,)
    ).fetchone() == (END,)


def test_a_series_without_located_reports_is_still_checked(db):
    seed_history(db, current=41)

    [raised] = run_check(db, END).alerts

    assert raised.clusters == ()

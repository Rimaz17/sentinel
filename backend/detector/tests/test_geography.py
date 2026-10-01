import math
import random

import pytest

from sentinel_detector.geography import (
    MIN_REPORTS,
    Point,
    Ring,
    assess,
    candidate_centres,
    concentration,
    distance_km,
    expected_in_ring,
    find_clusters,
)

# Kandy town, and one degree of latitude in kilometres.
KANDY = (7.291, 80.634)
KM_PER_DEGREE = 111.195


def around(centre, count, spread_km, rng, facilities=(1, 2, 3)):
    """`count` reports scattered normally around `centre`, from the given facilities in turn."""
    points = []
    for i in range(count):
        north = rng.gauss(0, spread_km) / KM_PER_DEGREE
        east = rng.gauss(0, spread_km) / (KM_PER_DEGREE * math.cos(math.radians(centre[0])))
        points.append(
            Point(
                round(centre[0] + north, 3),
                round(centre[1] + east, 3),
                facilities[i % len(facilities)],
            )
        )
    return points


def offset(centre, north_km, east_km):
    return (
        centre[0] + north_km / KM_PER_DEGREE,
        centre[1] + east_km / (KM_PER_DEGREE * math.cos(math.radians(centre[0]))),
    )


def test_measures_distance_on_the_earths_surface():
    assert distance_km(KANDY, KANDY) == 0
    assert distance_km(KANDY, offset(KANDY, 2, 0)) == pytest.approx(2, abs=0.001)
    assert distance_km(KANDY, offset(KANDY, 0, 3)) == pytest.approx(3, abs=0.01)


def test_finds_reports_bunched_together():
    points = around(KANDY, 12, 0.3, random.Random(1))

    [centre] = candidate_centres(points)

    assert distance_km(centre, KANDY) < 0.3


def test_rounds_a_centre_as_report_locations_are_rounded():
    [centre] = candidate_centres(around(KANDY, 12, 0.3, random.Random(2)))

    assert centre == (round(centre[0], 3), round(centre[1], 3))


def test_finds_nothing_in_reports_scattered_kilometres_apart():
    # A grid with 5 km between neighbours: no report has another within a kilometre.
    points = [
        Point(*offset(KANDY, 5 * row, 5 * column), facility_id=row)
        for row in range(4)
        for column in range(4)
    ]

    assert candidate_centres(points) == []


def test_needs_at_least_the_minimum_number_of_reports():
    points = around(KANDY, MIN_REPORTS, 0.05, random.Random(3))

    assert len(candidate_centres(points)) == 1
    assert candidate_centres(points[:-1]) == []


def test_finds_two_places_apart_largest_first():
    rng = random.Random(4)
    far = offset(KANDY, 10, 0)
    points = around(KANDY, 6, 0.2, rng) + around(far, 15, 0.2, rng)

    first, second = candidate_centres(points)

    assert distance_km(first, far) < 0.3
    assert distance_km(second, KANDY) < 0.3


def test_finds_nothing_without_reports():
    assert candidate_centres([]) == []


def ring(reports=17, facilities=7, baseline_reports=16, week_total=41, baseline_total=200):
    """Kandy's worked example by default: 17 of the week's 41 reports in a ring that usually
    holds about 8% of the series."""
    return Ring(*KANDY, reports, facilities, baseline_reports, week_total, baseline_total)


def test_expects_the_ring_to_hold_this_weeks_share_of_its_nine_weeks():
    # 33 reports in the ring over nine weeks; this week holds 41 of the series' 241.
    assert expected_in_ring(ring()) == pytest.approx(33 * 41 / 241, abs=0.001)


def test_expects_nothing_of_a_ring_that_holds_nothing():
    assert expected_in_ring(ring(reports=0, baseline_reports=0)) == 0
    assert concentration(ring(reports=0, baseline_reports=0, week_total=0, baseline_total=0)) == 0


def test_scores_concentration_as_a_binomial_count_at_this_weeks_share():
    share = 41 / 241
    spread = math.sqrt(33 * share * (1 - share))
    assert concentration(ring()) == pytest.approx((17 - 33 * share) / spread, abs=0.001)


def test_never_takes_the_spread_as_less_than_one_report():
    # Four reports where there were none, in a quiet week: expected 4 * 10 / 210.
    assert concentration(
        ring(reports=4, baseline_reports=0, week_total=10, baseline_total=200)
    ) == pytest.approx(4 - 40 / 210, abs=0.001)


def test_a_ring_far_above_its_usual_share_from_several_facilities_is_a_cluster():
    cluster = assess(ring())

    assert cluster is not None
    assert (cluster.latitude, cluster.longitude) == KANDY
    assert (cluster.reports, cluster.facilities) == (17, 7)
    assert cluster.expected == 5.61
    assert cluster.concentration > 3


def test_a_ring_holding_its_usual_share_is_no_cluster_however_busy():
    # A seasonal wave: the week doubled everywhere, and so did the ring.
    assert assess(ring(reports=33, baseline_reports=80, week_total=82)) is None


def test_a_ring_fed_by_fewer_than_three_facilities_is_no_cluster():
    assert assess(ring(facilities=2)) is None
    assert assess(ring(facilities=3)) is not None


def test_the_concentration_must_pass_the_threshold():
    score = concentration(ring())

    assert assess(ring(), threshold=score) is None
    assert assess(ring(), threshold=score - 0.01) is not None


def ring_counter(points, baseline=(), week_total=None, baseline_total=200):
    """Counts as the store would, from points in memory: this week's in `points`, and
    `baseline` as the eight weeks before."""

    def ring_at(latitude, longitude):
        inside = [
            p for p in points if distance_km((latitude, longitude), (p.latitude, p.longitude)) <= 2
        ]
        before = [
            p
            for p in baseline
            if distance_km((latitude, longitude), (p.latitude, p.longitude)) <= 2
        ]
        return Ring(
            latitude,
            longitude,
            len(inside),
            len({p.facility_id for p in inside}),
            len(before),
            len(points) if week_total is None else week_total,
            baseline_total,
        )

    return ring_at


def test_finds_a_local_outbreak_from_several_facilities():
    rng = random.Random(5)
    outbreak = around(KANDY, 15, 0.5, rng, facilities=(1, 2, 3, 4, 5))

    [cluster] = find_clusters(outbreak, ring_counter(outbreak, week_total=40))

    assert distance_km((cluster.latitude, cluster.longitude), KANDY) < 0.5
    assert cluster.reports == 15 and cluster.facilities == 5


def test_passes_over_a_place_that_always_holds_this_many():
    rng = random.Random(6)
    week = around(KANDY, 15, 0.5, rng, facilities=(1, 2, 3, 4, 5))
    usual = around(KANDY, 120, 0.5, rng)

    assert find_clusters(week, ring_counter(week, usual, week_total=40, baseline_total=320)) == []


def test_reports_one_place_once_from_its_strongest_centre():
    rng = random.Random(7)
    # Two dense patches 1.5 km apart, too far for DBSCAN to join, near enough to share a ring.
    near = offset(KANDY, 1.5, 0)
    week = around(KANDY, 8, 0.1, rng) + around(near, 12, 0.1, rng)

    [cluster] = find_clusters(week, ring_counter(week, week_total=60))

    assert cluster.reports == 20


def test_reports_places_further_apart_separately():
    rng = random.Random(8)
    far = offset(KANDY, 8, 0)
    week = around(KANDY, 10, 0.3, rng) + around(far, 10, 0.3, rng)

    assert len(find_clusters(week, ring_counter(week, week_total=60))) == 2

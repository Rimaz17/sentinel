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


def test_expects_the_rings_usual_share_of_this_weeks_reports():
    # (16 + 0.5) / (200 + 1) of 41.
    assert expected_in_ring(ring()) == pytest.approx(3.366, abs=0.001)


def test_expects_a_little_even_where_nothing_was_reported_before():
    assert expected_in_ring(ring(baseline_reports=0)) > 0


def test_scores_concentration_as_the_z_score_scores_a_week():
    assert concentration(ring()) == pytest.approx((17 - 3.366) / math.sqrt(3.366), abs=0.01)
    # An expectation below one report is spread as one report.
    assert concentration(ring(baseline_reports=0, week_total=10)) == pytest.approx(
        17 - 10 * 0.5 / 201, abs=0.001
    )


def test_a_ring_far_above_its_usual_share_from_several_facilities_is_a_cluster():
    cluster = assess(ring())

    assert cluster is not None
    assert (cluster.latitude, cluster.longitude) == KANDY
    assert (cluster.reports, cluster.facilities) == (17, 7)
    assert cluster.expected == 3.37
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

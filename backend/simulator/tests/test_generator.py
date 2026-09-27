import math
import random
from collections import Counter
from datetime import UTC, date, datetime, timedelta

import pytest

from sentinel_simulator.baselines import WEEKLY_BASELINES
from sentinel_simulator.generator import (
    KM_PER_DEGREE_LATITUDE,
    LAT_RANGE,
    Facility,
    Generator,
    poisson,
)
from sentinel_simulator.outbreaks import Outbreak
from sentinel_simulator.rhythm import SRI_LANKA

START = datetime(2026, 7, 6, tzinfo=UTC)  # a Monday


def registry():
    """Two located facilities per district, plus ones that must never be chosen."""
    facilities = []
    for i, district in enumerate(WEEKLY_BASELINES):
        lat, lon = 6.0 + i * 0.15, 80.0 + (i % 5) * 0.3
        facilities += [
            Facility(f"P{district}0000001", district, "Teaching", lat, lon),
            Facility(f"P{district}0000002", district, "PMCU", lat + 0.05, lon),
            Facility(f"P{district}0000003", district, "Base A", None, None),
            Facility(f"P{district}0000004", district, "Dental", lat, lon + 0.05),
        ]
    return facilities


def generate(weeks=4, seed=7, spread_km=2.0):
    generator = Generator(registry(), random.Random(seed), spread_km=spread_km)
    return list(generator.reports(START, START + timedelta(weeks=weeks)))


@pytest.fixture(scope="module")
def four_weeks():
    return generate()


def test_poisson_draws_average_to_their_mean():
    rng = random.Random(1)
    draws = [poisson(3.2, rng) for _ in range(20_000)]
    assert sum(draws) / len(draws) == pytest.approx(3.2, rel=0.03)
    assert poisson(0, rng) == 0


def test_weekly_counts_sit_near_each_baseline(four_weeks):
    counts = Counter((r.facility_code[1:4], r.symptom_group) for r in four_weeks)
    kandy_dengue_per_week = counts["KDY", "DENGUE_LIKE"] / 4
    assert 20 <= kandy_dengue_per_week <= 30

    total_per_week = len(four_weeks) / 4
    expected = sum(sum(groups.values()) for groups in WEEKLY_BASELINES.values())
    assert total_per_week == pytest.approx(expected, rel=0.05)


def test_every_report_falls_inside_the_window(four_weeks):
    end = START + timedelta(weeks=4)
    assert all(START <= r.reported_at < end for r in four_weeks)


def test_reports_come_only_from_located_general_facilities_in_their_own_district(four_weeks):
    chosen = {r.facility_code[-1] for r in four_weeks}
    assert chosen == {"1", "2"}


def test_bigger_facilities_see_more_patients(four_weeks):
    by_type = Counter(r.facility_code[-1] for r in four_weeks)
    assert by_type["1"] > 5 * by_type["2"]


def test_patients_live_near_their_facility():
    reports = generate(weeks=1, spread_km=2.0)
    facilities = {f.code: f for f in registry()}
    for r in reports:
        f = facilities[r.facility_code]
        north_km = (r.latitude - f.latitude) * KM_PER_DEGREE_LATITUDE
        east_km = (r.longitude - f.longitude) * 111.320 * math.cos(math.radians(f.latitude))
        assert math.hypot(north_km, east_km) <= 6.0 + 0.01
        assert LAT_RANGE[0] <= r.latitude <= LAT_RANGE[1]


def test_each_report_gives_an_age_or_a_date_of_birth_but_not_both(four_weeks):
    assert all((r.age is None) != (r.date_of_birth is None) for r in four_weeks)
    share = sum(r.date_of_birth is not None for r in four_weeks) / len(four_weeks)
    assert share == pytest.approx(0.2, abs=0.03)


def test_a_date_of_birth_gives_an_age_in_the_same_band_the_api_will_compute(four_weeks):
    for r in (r for r in four_weeks if r.date_of_birth is not None):
        on = r.reported_at.astimezone(SRI_LANKA).date()
        born = r.date_of_birth
        years = on.year - born.year - ((on.month, on.day) < (born.month, born.day))
        assert 0 <= years < 100
        assert born <= on


def test_identity_fields_are_present_and_plainly_simulated(four_weeks):
    for r in four_weeks[:50]:
        for value in (r.patient_name, r.nic_number, r.phone_number, r.home_address):
            assert value.startswith("SIMULATED")


def test_the_payload_carries_no_facility_or_district():
    report = generate(weeks=1)[0]
    payload = report.payload()
    assert "facilityCode" not in payload
    assert "districtCode" not in payload
    assert payload["symptomGroup"] == report.symptom_group
    assert payload["reportedAt"].endswith("+05:30")
    assert ("age" in payload) != ("dateOfBirth" in payload)


def test_a_date_of_birth_is_sent_as_an_iso_date():
    report = next(r for r in generate(weeks=1) if r.date_of_birth is not None)
    assert date.fromisoformat(report.payload()["dateOfBirth"]) == report.date_of_birth


def test_the_same_seed_gives_the_same_reports():
    assert generate(weeks=1, seed=3) == generate(weeks=1, seed=3)
    assert generate(weeks=1, seed=3) != generate(weeks=1, seed=4)


def test_a_district_without_a_located_facility_is_refused():
    facilities = [f for f in registry() if not (f.district_code == "MUL" and f.latitude)]
    with pytest.raises(ValueError, match="MUL"):
        Generator(facilities, random.Random(1))


def kandy_town():
    """The shared registry, with Kandy given ten facilities a couple of kilometres apart."""
    others = [f for f in registry() if f.district_code != "KDY"]
    kandy = [
        Facility(f"PKDY00001{i:02d}", "KDY", "Divisional B", 7.25 + 0.02 * i, 80.60 + 0.015 * i)
        for i in range(10)
    ]
    return others + kandy


def kandy_outbreak(**changes):
    settings = dict(
        district_code="KDY",
        symptom_group="DENGUE_LIKE",
        start=START + timedelta(days=7),
        extra_per_week=70,
        days=14,
        profile="step",
        spread="point",
    )
    return Outbreak(**{**settings, **changes})


def outbreak_run(outbreak, seed=11):
    generator = Generator(kandy_town(), random.Random(seed), outbreaks=[outbreak])
    return list(generator.reports(START, START + timedelta(weeks=4)))


def kandy_dengue(reports, start, end):
    return [
        r
        for r in reports
        if r.symptom_group == "DENGUE_LIKE"
        and r.facility_code.startswith("PKDY")
        and start <= r.reported_at < end
    ]


def within_four_sd(observed, expected):
    """A Poisson count close enough to its expectation that only a fault would miss."""
    return abs(observed - expected) <= 4 * math.sqrt(expected)


def test_an_outbreak_adds_its_reports_during_it_and_not_outside():
    o = kandy_outbreak()
    reports = outbreak_run(o)

    baseline = WEEKLY_BASELINES["KDY"]["DENGUE_LIKE"]
    assert within_four_sd(len(kandy_dengue(reports, o.start, o.end)), 2 * (baseline + 70))
    assert within_four_sd(len(kandy_dengue(reports, START, o.start)), baseline)


def test_a_point_outbreak_is_bunched_within_about_two_km_and_seen_by_several_facilities():
    o = kandy_outbreak()
    extra = Counter()
    positions = []
    for r in kandy_dengue(outbreak_run(o), o.start, o.end):
        positions.append((r.latitude, r.longitude))
        extra[r.facility_code] += 1

    # Find the hotspot: the densest point among the reports.
    def neighbours(p):
        return sum(
            math.hypot(
                (q[0] - p[0]) * KM_PER_DEGREE_LATITUDE,
                (q[1] - p[1]) * 111.320 * math.cos(math.radians(p[0])),
            )
            <= 2.5
            for q in positions
        )

    densest = max(positions, key=neighbours)
    assert neighbours(densest) >= 140 * 0.8
    assert len(extra) >= 4


def test_a_wave_is_spread_over_the_district_like_its_everyday_load():
    o = kandy_outbreak(spread="wave")
    facilities = Counter(r.facility_code for r in kandy_dengue(outbreak_run(o), o.start, o.end))
    assert len(facilities) == 10


def test_an_outbreak_that_has_ended_adds_nothing():
    # A wave, because a point outbreak draws its centre from the random stream up front.
    o = kandy_outbreak(spread="wave", start=START - timedelta(days=30))
    without = Generator(kandy_town(), random.Random(11)).reports(START, START + timedelta(weeks=4))
    assert outbreak_run(o) == list(without)

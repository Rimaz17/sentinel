import random

import pytest

from sentinel_detector.geography_evaluation import (
    GeoTrial,
    QuietRings,
    outbreak_trial,
    outbreak_trials,
    quiet_rings,
    registry_facilities,
    report,
)


@pytest.fixture(scope="module")
def facilities():
    return registry_facilities()


def test_reads_the_registry_the_api_seeds(facilities):
    assert len(facilities) == 1501
    assert sum(f.latitude is not None for f in facilities) == 817
    [angoda] = [f for f in facilities if f.code == "LCB0000117"]
    assert (angoda.district_code, angoda.institution_type) == ("CMB", "Base A")
    assert (angoda.latitude, angoda.longitude) == (6.922551, 79.918215)


def test_rings_a_large_point_outbreak_soon_after_its_alert(facilities):
    trial = outbreak_trial("KDY", "DENGUE_LIKE", 2.0, "step", "point", facilities, random.Random(1))

    assert trial.alerted and trial.ringed
    assert trial.ringed_after - trial.alerted_after <= 24


def test_does_not_ring_a_wave_across_colombo(facilities):
    trial = outbreak_trial(
        "CMB", "INFLUENZA_LIKE", 1.0, "step", "wave", facilities, random.Random(1)
    )

    assert trial.alerted and not trial.ringed


def test_runs_every_size_profile_and_spread_for_each_series(facilities):
    trials = outbreak_trials(random.Random(2), facilities, series=[("MTL", "DENGUE_LIKE")])

    assert len(trials) == 3 * 2 * 2
    assert {(t.spread, t.profile) for t in trials} == {
        ("point", "ramp"),
        ("point", "step"),
        ("wave", "ramp"),
        ("wave", "step"),
    }


def test_counts_quiet_weeks_false_alarms(facilities):
    quiet = quiet_rings(random.Random(3), facilities, weeks=2)

    assert quiet.weeks == 2
    assert 0 <= quiet.ringed <= quiet.false_alarms


def test_reports_rings_as_markdown():
    trials = [
        GeoTrial("KDY", "DENGUE_LIKE", 25, 2.0, "step", "point", 30, 30, None),
        GeoTrial("KDY", "DENGUE_LIKE", 25, 2.0, "step", "wave", 40, None, None),
        GeoTrial("KDY", "DENGUE_LIKE", 25, 0.5, "ramp", "wave", None, None, None),
    ]

    out = report(trials, QuietRings(52, 187, 0), seed=9)

    assert out.startswith("Seed 9: 3 injected outbreaks of 14 days")
    assert "| Point | 100% | 0% | 100% | 0 |" in out
    assert "| Wave | 50% | 0% | 0% | n/a |" in out
    assert "| False alarm, quiet weeks | 187 alerts | n/a | 0% | n/a |" in out
    assert "- point, +200% at peak, step: ringed 0 hours after its alert" in out
    assert "- wave, +200% at peak, step: never ringed" in out

from datetime import UTC, datetime, timedelta

import pytest

from sentinel_simulator.outbreaks import Outbreak, parse_outbreak
from sentinel_simulator.rhythm import hour_slices

START = datetime(2026, 9, 1, tzinfo=UTC)


def outbreak(**changes):
    settings = dict(
        district_code="KDY", symptom_group="DENGUE_LIKE", start=START, extra_per_week=42, days=14
    )
    return Outbreak(**{**settings, **changes})


def total_extra(o):
    return sum(
        o.expected_in(s, e)
        for s, e in hour_slices(o.start - timedelta(days=1), o.end + timedelta(days=1))
    )


def test_a_ramp_peaks_halfway_and_is_quiet_at_either_end():
    o = outbreak()
    assert o.intensity(START) == pytest.approx(0.0)
    assert o.intensity(START + timedelta(days=7)) == pytest.approx(1.0)
    assert o.intensity(START + timedelta(days=3.5)) == pytest.approx(0.5)


def test_a_step_is_at_full_strength_throughout():
    o = outbreak(profile="step")
    assert o.intensity(START) == 1.0
    assert o.intensity(o.end - timedelta(seconds=1)) == 1.0


def test_nothing_happens_outside_the_outbreak():
    o = outbreak(profile="step")
    assert o.intensity(START - timedelta(seconds=1)) == 0.0
    assert o.intensity(o.end) == 0.0


def test_a_ramp_adds_half_its_peak_rate_over_its_length():
    # 42 a week at peak for two weeks, as a triangle: 42 extra reports.
    assert total_extra(outbreak()) == pytest.approx(42, rel=0.01)


def test_a_step_adds_its_full_rate_over_its_length():
    assert total_extra(outbreak(profile="step")) == pytest.approx(84, rel=0.01)


def test_parses_an_outbreak_relative_to_a_reference_time():
    o = parse_outbreak("district=kdy,group=dengue_like,extra=40,start=-3d,days=10", START)
    assert (o.district_code, o.symptom_group, o.extra_per_week) == ("KDY", "DENGUE_LIKE", 40)
    assert o.start == START - timedelta(days=3)
    assert o.days == 10
    assert (o.profile, o.spread) == ("ramp", "point")


def test_an_outbreak_starts_at_the_reference_time_by_default():
    o = parse_outbreak("district=CMB,group=INFLUENZA_LIKE,extra=80,spread=wave,start=12h", START)
    assert o.start == START + timedelta(hours=12)
    assert o.spread == "wave"
    assert parse_outbreak("district=CMB,group=INFLUENZA_LIKE,extra=80", START).start == START


@pytest.mark.parametrize(
    "text, message",
    [
        ("district=KDY,group=DENGUE_LIKE", "needs extra"),
        ("district=KDY,group=DENGUE_LIKE,extra=5,colour=red", "unknown outbreak setting: colour"),
        ("district=KDY,group=DENGUE_LIKE,extra=5,start=yesterday", "start must look like"),
        ("district=XYZ,group=DENGUE_LIKE,extra=5", "unknown district"),
        ("district=KDY,group=CHOLERA,extra=5", "unknown symptom group"),
        ("district=KDY,group=DENGUE_LIKE,extra=0", "positive"),
        ("district=KDY,group=DENGUE_LIKE,extra=5,profile=spike", "profile must be"),
        ("district=KDY,group=DENGUE_LIKE,extra=5,spread=everywhere", "spread must be"),
        ("KDY DENGUE_LIKE 5", "expected key=value"),
    ],
)
def test_refuses_an_outbreak_it_cannot_make_sense_of(text, message):
    with pytest.raises(ValueError, match=message):
        parse_outbreak(text, START)

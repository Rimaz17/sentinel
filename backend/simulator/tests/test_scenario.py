import math
import random
from datetime import UTC, datetime, timedelta

from sentinel_simulator.baselines import WEEKLY_BASELINES
from sentinel_simulator.generator import Facility, Generator
from sentinel_simulator.scenario import (
    EPOCH,
    EVERY,
    LASTS,
    ROTATION,
    demo_outbreaks,
    running,
    scheduled,
    strength,
)

NOW = datetime(2026, 10, 2, 9, 30, tzinfo=UTC)


def test_two_or_three_outbreaks_are_always_running():
    moment = NOW
    while moment < NOW + timedelta(days=365):
        assert 2 <= len(running(moment)) <= 3, moment
        moment += timedelta(hours=1)


def test_a_new_outbreak_starts_twice_a_week_and_lasts_ten_days():
    first, second = scheduled(40), scheduled(41)

    assert second.start - first.start == EVERY == timedelta(days=3.5)
    assert first.end - first.start == LASTS == timedelta(days=10)
    assert first.profile == "step" and first.spread == "point"


def test_no_district_and_group_recurs_within_twelve_weeks():
    assert len(set(ROTATION)) == len(ROTATION) == 24
    for index in range(-30, 200):
        later = scheduled(index + len(ROTATION))
        now = scheduled(index)
        assert (later.district_code, later.symptom_group) == (
            now.district_code,
            now.symptom_group,
        )
        # Its last outbreak's reports have left the 8-week baseline and the 7-day window.
        assert later.start - now.end >= timedelta(days=63)


def test_colombo_has_an_outbreak_every_three_weeks():
    colombo = [i for i, (district, _) in enumerate(ROTATION) if district == "CMB"]
    assert colombo == [0, 6, 12, 18]
    assert {ROTATION[i][1] for i in colombo} == set(WEEKLY_BASELINES["CMB"])


def test_each_outbreak_is_strong_enough_to_publish_without_an_inspector():
    for district, group in ROTATION:
        mean = WEEKLY_BASELINES[district][group]
        extra = strength(district, group)
        assert extra == round(20 * math.sqrt(mean))
        # A full week of it stands this many square roots of the usual week above it: the
        # detector floors the standard deviation there, and publishes from 5.
        assert extra / math.sqrt(mean) >= 19


def test_lists_exactly_the_outbreaks_running_in_a_window():
    start, end = NOW - timedelta(days=63), NOW

    found = demo_outbreaks(start, end)

    assert found
    assert all(o.start < end and o.end > start for o in found)
    starts = {o.start for o in found}
    for index in range(-5, 60):
        outbreak = scheduled(index)
        overlaps = outbreak.start < end and outbreak.end > start
        assert (outbreak.start in starts) == overlaps


def test_an_outbreak_ending_as_a_window_opens_is_left_out():
    outbreak = scheduled(10)

    assert outbreak not in demo_outbreaks(outbreak.end, outbreak.end + timedelta(days=1))
    assert outbreak not in demo_outbreaks(outbreak.start - timedelta(days=1), outbreak.start)


def test_the_schedule_is_fixed_to_the_calendar():
    assert scheduled(0).start == EPOCH
    assert demo_outbreaks(NOW, NOW + timedelta(hours=1)) == demo_outbreaks(
        NOW, NOW + timedelta(hours=1)
    )


def test_an_outbreak_centres_in_one_place_whichever_run_posts_it():
    outbreak = scheduled(0)
    district = outbreak.district_code
    # Facilities a few kilometres apart, so the one chosen as the centre matters.
    facilities = [
        Facility(f"P{district}{n:07d}", district, "Teaching", 6.80 + n * 0.05, 79.85)
        for n in range(12)
    ]
    quiet = {district: {outbreak.symptom_group: 0.0}}
    window = (outbreak.start, outbreak.start + timedelta(days=2))

    def locations(seed):
        generator = Generator(
            facilities, random.Random(seed), baselines=quiet, outbreaks=[outbreak]
        )
        return [(r.latitude, r.longitude) for r in generator.reports(*window)]

    centre = random.Random(outbreak.place).choices(facilities)[0]
    for seed in (1, 2, 3):
        found = locations(seed)
        assert found
        # Every report within three spreads (2.1 km) of the same centre, whatever the seed.
        assert all(
            _distance_km(Facility("x", district, "Teaching", lat, lon), centre) <= 2.2
            for lat, lon in found
        )


def _distance_km(a, b):
    from sentinel_simulator.generator import _distance_km as distance

    return distance(a, b)

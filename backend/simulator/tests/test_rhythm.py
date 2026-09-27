from datetime import UTC, datetime, timedelta

import pytest

from sentinel_simulator.baselines import SYMPTOM_GROUPS, WEEKLY_BASELINES
from sentinel_simulator.rhythm import SRI_LANKA, expected_in_hour, hour_slices

DISTRICTS = {
    "CMB", "GMP", "KLT", "KDY", "MTL", "NEL", "GAL", "MTR", "HMB", "JAF", "KIL", "MNR", "VAV",
    "MUL", "BTC", "AMP", "TRC", "KUR", "PTM", "ANU", "POL", "BDL", "MON", "RAT", "KEG",
}  # fmt: skip


def test_every_district_has_a_baseline_for_every_symptom_group():
    assert set(WEEKLY_BASELINES) == DISTRICTS
    for groups in WEEKLY_BASELINES.values():
        assert tuple(groups) == SYMPTOM_GROUPS
        assert all(mean > 0 for mean in groups.values())


def test_kandy_dengue_matches_the_project_overview():
    assert WEEKLY_BASELINES["KDY"]["DENGUE_LIKE"] == 25


def test_a_week_of_hours_adds_up_to_the_weekly_mean():
    monday = datetime(2026, 9, 21, tzinfo=SRI_LANKA)
    total = sum(expected_in_hour(25, monday + timedelta(hours=h)) for h in range(7 * 24))
    assert total == pytest.approx(25)


def test_a_weekday_morning_is_busier_than_a_sunday_night():
    monday_morning = datetime(2026, 9, 21, 9, tzinfo=SRI_LANKA)
    sunday_night = datetime(2026, 9, 27, 3, tzinfo=SRI_LANKA)
    assert expected_in_hour(25, monday_morning) > 10 * expected_in_hour(25, sunday_night)


def test_hours_are_reckoned_in_sri_lanka_time():
    # 03:30 UTC is 09:00 in Colombo: the morning peak, not the small hours.
    utc = datetime(2026, 9, 21, 3, 30, tzinfo=UTC)
    local = datetime(2026, 9, 21, 9, 0, tzinfo=SRI_LANKA)
    assert expected_in_hour(25, utc) == expected_in_hour(25, local)


def test_slices_split_at_local_hour_boundaries_and_cover_the_range():
    start = datetime(2026, 9, 21, 3, 10, tzinfo=UTC)  # 08:40 local
    end = datetime(2026, 9, 21, 5, 0, tzinfo=UTC)  # 10:30 local
    slices = list(hour_slices(start, end))

    def local(moment):
        return moment.astimezone(SRI_LANKA).strftime("%H:%M")

    assert [(local(s), local(e)) for s, e in slices] == [
        ("08:40", "09:00"),
        ("09:00", "10:00"),
        ("10:00", "10:30"),
    ]
    assert slices[0][0] == start and slices[-1][1] == end


def test_an_empty_range_has_no_slices():
    moment = datetime(2026, 9, 21, tzinfo=UTC)
    assert list(hour_slices(moment, moment)) == []

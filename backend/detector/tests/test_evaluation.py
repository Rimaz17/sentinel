import math
import random

import numpy as np
import pytest

from sentinel_detector.evaluation import (
    HISTORY_HOURS,
    WEEK_HOURS,
    Trial,
    false_alarms_per_week,
    outbreak_trial,
    report,
    simulate_counts,
    summarise,
    weekly_windows,
)


def test_windows_match_summing_the_hours_by_hand():
    counts = np.arange(HISTORY_HOURS + 10)
    checks = np.array([HISTORY_HOURS, HISTORY_HOURS + 7])

    windows = weekly_windows(counts, checks)

    for row, check in enumerate(checks):
        for k in range(9):
            end = check - k * WEEK_HOURS
            assert windows.iloc[row][f"w{k}"] == counts[end - WEEK_HOURS : end].sum()


def test_a_check_without_nine_weeks_behind_it_is_refused():
    with pytest.raises(ValueError):
        weekly_windows(np.zeros(HISTORY_HOURS), np.array([HISTORY_HOURS - 1]))


def test_simulated_weeks_average_to_the_baseline():
    counts = simulate_counts(25, 20 * WEEK_HOURS, random.Random(3))
    assert abs(counts.sum() - 20 * 25) <= 4 * math.sqrt(20 * 25)


def test_a_large_outbreak_is_detected_within_days_and_above_the_usual_count():
    trial = outbreak_trial("KDY", "DENGUE_LIKE", size=3.0, profile="step", rng=random.Random(1))

    assert trial.detected(3.0)
    assert 0 < trial.hours_to_detect(3.0) <= 72
    assert trial.counts_at_detection[3.0] > 25


def test_a_lower_threshold_never_detects_later():
    trial = outbreak_trial("CMB", "INFLUENZA_LIKE", size=1.0, profile="ramp", rng=random.Random(2))
    hours = [trial.hours_to_detect(t) for t in (2.0, 2.5, 3.0, 3.5)]
    detected = [h for h in hours if h is not None]
    assert detected == sorted(detected)
    assert hours[0] is not None


def test_false_alarms_fall_as_the_threshold_rises():
    rates = false_alarms_per_week(random.Random(4), weeks=8)
    assert list(rates) == [2.0, 2.5, 3.0, 3.5]
    assert rates[2.0] >= rates[2.5] >= rates[3.0] >= rates[3.5] >= 0


def test_the_same_seed_measures_the_same_thing():
    first = outbreak_trial("GAL", "LEPTOSPIROSIS_LIKE", 1.0, "ramp", random.Random(9))
    second = outbreak_trial("GAL", "LEPTOSPIROSIS_LIKE", 1.0, "ramp", random.Random(9))
    assert first == second


def made_up_trials():
    def trial(size, hours):
        detections = {3.0: [] if hours is None else [hours, hours + 1]}
        counts = {} if hours is None else {3.0: 40}
        return Trial("KDY", "DENGUE_LIKE", 25, size, "ramp", detections, counts)

    return [trial(0.5, None), trial(0.5, 60), trial(1.0, 40), trial(1.0, 20)]


def test_summary_counts_detections_and_takes_the_median_time():
    [row] = summarise(made_up_trials(), {3.0: 0.25}, thresholds=[3.0]).to_dict("records")

    assert row["detection rate"] == 0.75
    assert row["median hours to detect"] == 40
    assert row["detected at +50%"] == 0.5
    assert row["detected at +100%"] == 1.0
    assert row["false alarms per quiet week"] == 0.25


def test_report_is_a_markdown_table_with_a_worked_kandy_example():
    text = report(made_up_trials(), {3.0: 0.25}, seed=7, weeks=52)

    assert "| 3.0 sd | 75% | 50% | 100% | 40 | 0.25 |" in text
    assert "- +50% at peak, ramp: not detected while it lasted" in text
    assert "- +100% at peak, ramp: detected after 40 hours, at 40 reports in the week" in text

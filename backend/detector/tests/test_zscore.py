import statistics

import pandas as pd
import pytest

from sentinel_detector.windows import WEEKS
from sentinel_detector.zscore import SYMPTOM_GROUPS, score, weekly_counts


def one_series(current, baseline):
    return pd.DataFrame([[current, *baseline]], columns=WEEKS)


def test_scores_the_current_week_against_the_mean_and_spread_of_the_eight_before():
    baseline = [22, 27, 25, 19, 31, 24, 26, 26]
    result = score(one_series(41, baseline)).iloc[0]

    mean, sd = statistics.mean(baseline), statistics.stdev(baseline)
    assert result.observed == 41
    assert result.baseline_mean == pytest.approx(mean)
    assert result.baseline_sd == pytest.approx(sd)
    assert result.z_score == pytest.approx((41 - mean) / sd)
    assert result.alert


def test_an_ordinary_week_raises_nothing():
    assert not score(one_series(29, [22, 27, 25, 19, 31, 24, 26, 26])).iloc[0].alert


def test_exactly_at_the_threshold_is_not_above_it():
    # A flat baseline of 10 has its spread floored at 1, so 13 is exactly 3 above.
    assert score(one_series(13, [10] * 8)).iloc[0].z_score == pytest.approx(3.0)
    assert not score(one_series(13, [10] * 8)).iloc[0].alert
    assert score(one_series(14, [10] * 8)).iloc[0].alert


def test_a_series_that_is_always_zero_needs_more_than_three_reports():
    assert not score(one_series(3, [0] * 8)).iloc[0].alert
    assert score(one_series(4, [0] * 8)).iloc[0].alert


def test_a_quiet_week_is_never_an_alert():
    assert score(one_series(0, [30] * 8)).iloc[0].z_score < 0
    assert not score(one_series(0, [30] * 8)).iloc[0].alert


def test_the_threshold_sets_the_sensitivity():
    series = one_series(35, [22, 27, 25, 19, 31, 24, 26, 26])
    assert score(series, threshold=2.0).iloc[0].alert
    assert not score(series, threshold=3.0).iloc[0].alert


def test_refuses_a_threshold_that_is_not_positive():
    with pytest.raises(ValueError):
        score(one_series(1, [1] * 8), threshold=0)


def test_weekly_counts_cover_every_series_and_week_with_zeros_where_nothing_was_reported():
    table = weekly_counts(
        [
            ("KDY", "DENGUE_LIKE", 0, 41),
            ("KDY", "DENGUE_LIKE", 3, 25),
            ("CMB", "GASTROINTESTINAL", 8, 9),
        ],
        districts=["KDY", "CMB"],
    )

    assert len(table) == 2 * len(SYMPTOM_GROUPS)
    assert list(table.columns) == WEEKS
    assert list(table.loc[("KDY", "DENGUE_LIKE")]) == [41, 0, 0, 25, 0, 0, 0, 0, 0]
    assert table.loc[("CMB", "GASTROINTESTINAL"), "w8"] == 9
    assert table.loc[("CMB", "INFLUENZA_LIKE")].sum() == 0


def test_weekly_counts_with_no_reports_at_all_are_all_zero():
    table = weekly_counts([], districts=["KDY"])
    assert len(table) == len(SYMPTOM_GROUPS)
    assert table.to_numpy().sum() == 0

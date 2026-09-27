"""The detection rule: is this week far above this area's own recent weeks?

For every district and symptom group, the current week's count is compared with
the eight weeks before it. More than `threshold` standard deviations above their
mean raises an alert. This is the z-score comparison behind the CDC's EARS
methods, and it can be explained to a health officer in one sentence.

One refinement: the standard deviation is never taken as less than one report.
A series with the same count every week, most often zero, has no spread at all,
and without a floor its first extra report would be infinitely many standard
deviations out.
"""

from __future__ import annotations

from collections.abc import Iterable

import pandas as pd

from sentinel_detector.windows import BASELINE, CURRENT, WEEKS

SYMPTOM_GROUPS = ("DENGUE_LIKE", "INFLUENZA_LIKE", "GASTROINTESTINAL", "LEPTOSPIROSIS_LIKE")

DEFAULT_THRESHOLD = 3.0
MIN_SD = 1.0

SERIES = ["district_code", "symptom_group"]


def weekly_counts(rows: Iterable[tuple[str, str, int, int]], districts: Iterable[str]):
    """One row per district and symptom group, columns w0 to w8, zero where nothing was reported.

    `rows` are (district_code, symptom_group, weeks_ago, count), as the store aggregates them.
    """
    index = pd.MultiIndex.from_product([sorted(districts), SYMPTOM_GROUPS], names=SERIES)
    frame = pd.DataFrame(list(rows), columns=[*SERIES, "weeks_ago", "count"])
    table = (
        frame.groupby([*SERIES, "weeks_ago"])["count"]
        .sum()
        .unstack("weeks_ago")
        .reindex(index=index, columns=range(len(WEEKS)))
        .fillna(0)
        .astype(int)
    )
    table.columns = WEEKS
    return table


def score(weekly: pd.DataFrame, threshold: float = DEFAULT_THRESHOLD) -> pd.DataFrame:
    """Score every row of `weekly` (columns w0 to w8), keeping its index."""
    if threshold <= 0:
        raise ValueError("threshold must be positive")
    baseline = weekly[BASELINE]
    mean = baseline.mean(axis=1)
    sd = baseline.std(axis=1, ddof=1).clip(lower=MIN_SD)
    z = (weekly[CURRENT] - mean) / sd
    return pd.DataFrame(
        {
            "observed": weekly[CURRENT],
            "baseline_mean": mean,
            "baseline_sd": sd,
            "z_score": z,
            "alert": z > threshold,
        },
        index=weekly.index,
    )

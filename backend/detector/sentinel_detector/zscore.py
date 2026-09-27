"""The detection rule: is this week far above this area's own recent weeks?

For every district and symptom group, the current week's count is compared with
the eight weeks before it. More than `threshold` standard deviations above their
mean raises an alert. This is the z-score comparison behind the CDC's EARS
methods, and it can be explained to a health officer in one sentence.

One refinement, measured before it was adopted (docs/adr/0007): the standard
deviation is never taken as less than the square root of the baseline mean, nor
less than one report. Counts of independent events vary at least that much (a
Poisson count's spread is the square root of its mean), but eight weeks are too
few to show it reliably, and an unluckily steady baseline would otherwise make an
ordinary week look extraordinary. Against the simulator this cut false alarms by
two thirds at 3 sd. The floor of one report covers series whose mean is below
one, most often all zeros, which would otherwise have no spread at all.
"""

from __future__ import annotations

from collections.abc import Iterable

import numpy as np
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
    sd = np.maximum(baseline.std(axis=1, ddof=1), np.sqrt(mean)).clip(lower=MIN_SD)
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

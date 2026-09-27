"""The weeks a check compares.

A check at time `end` counts the current week, [end - 7 days, end), against the
eight weeks before it. Every check is aligned to the top of the hour, so two runs
in the same hour see exactly the same windows and reach the same answer.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

WEEK = timedelta(days=7)
BASELINE_WEEKS = 8

# w0 is the current week, w1 the week before it, and so on back to w8.
CURRENT = "w0"
BASELINE = [f"w{k}" for k in range(1, BASELINE_WEEKS + 1)]
WEEKS = [CURRENT, *BASELINE]

# How far back a check reads: the current week and the whole baseline.
HISTORY = WEEK * (BASELINE_WEEKS + 1)


def check_time(moment: datetime) -> datetime:
    """The end of the windows for a check made at `moment`: the top of that hour, in UTC."""
    if moment.tzinfo is None:
        raise ValueError("check times must be timezone-aware")
    return moment.astimezone(UTC).replace(minute=0, second=0, microsecond=0)


def history_start(end: datetime) -> datetime:
    return end - HISTORY

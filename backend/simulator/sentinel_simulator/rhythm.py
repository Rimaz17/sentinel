"""When in the week patients present: outpatient hours, and quieter weekends.

A weekly mean is spread over the days of the week and the hours of each day by
these weights, which are normalised, so a week's expected total is unchanged.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta, timezone

# Sri Lanka has kept UTC+05:30 without daylight saving since 2006. A fixed offset
# avoids depending on a time zone database, which Windows does not ship.
SRI_LANKA = timezone(timedelta(hours=5, minutes=30), "Asia/Colombo")

# Monday first, as datetime.weekday() counts.
WEEKDAY_WEIGHTS = (1.15, 1.05, 1.0, 1.0, 1.0, 0.8, 0.6)

# Local hour 00 to 23: a morning outpatient peak, a smaller afternoon one, little at night.
HOURLY_WEIGHTS = (
    0.2, 0.2, 0.2, 0.2, 0.2, 0.3,
    0.5, 1.2, 2.2, 2.6, 2.5, 2.2,
    1.6, 1.4, 1.6, 1.5, 1.3, 1.1,
    0.9, 0.8, 0.7, 0.5, 0.4, 0.3,
)  # fmt: skip

_WEEKDAY_TOTAL = sum(WEEKDAY_WEIGHTS)
_HOURLY_TOTAL = sum(HOURLY_WEIGHTS)


def expected_in_hour(weekly_mean: float, moment: datetime) -> float:
    """Expected reports in the local clock hour containing `moment`."""
    local = moment.astimezone(SRI_LANKA)
    day_share = WEEKDAY_WEIGHTS[local.weekday()] / _WEEKDAY_TOTAL
    hour_share = HOURLY_WEIGHTS[local.hour] / _HOURLY_TOTAL
    return weekly_mean * day_share * hour_share


def hour_slices(start: datetime, end: datetime):
    """Split [start, end) at local hour boundaries, yielding (slice_start, slice_end) pairs."""
    cursor = start
    while cursor < end:
        local = cursor.astimezone(SRI_LANKA)
        next_hour = local.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        slice_end = min(next_hour.astimezone(UTC), end)
        yield cursor, slice_end
        cursor = slice_end

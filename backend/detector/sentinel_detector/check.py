"""One detection check: read the last nine weeks, score every series, record alerts."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

import psycopg

from sentinel_detector.store import RaisedAlert, earliest_report, read_weekly_counts, record_alerts
from sentinel_detector.windows import HISTORY, check_time, history_start
from sentinel_detector.zscore import DEFAULT_THRESHOLD, score

# The first report never lands exactly at the start of the history; a day's grace
# lets a system that has been running for nine weeks check straight away.
HISTORY_GRACE = timedelta(days=1)


class InsufficientHistory(Exception):
    """Fewer than nine weeks of reports: missing weeks would read as quiet ones."""


@dataclass(frozen=True)
class CheckResult:
    end: datetime
    series: int
    alerts: list[RaisedAlert]


def run_check(
    connection: psycopg.Connection, moment: datetime, threshold: float = DEFAULT_THRESHOLD
) -> CheckResult:
    """Check every district and symptom group as of `moment`.

    The alerts are written in one transaction, so `connection` should be in autocommit mode.
    """
    end = check_time(moment)
    earliest = earliest_report(connection)
    if earliest is None or earliest > history_start(end) + HISTORY_GRACE:
        raise InsufficientHistory(
            f"a check needs reports from {HISTORY.days} days before it; "
            + (
                "there are none"
                if earliest is None
                else f"the earliest is {earliest:%Y-%m-%d %H:%M}"
            )
        )
    with connection.transaction():
        scored = score(read_weekly_counts(connection, end), threshold)
        alerts = record_alerts(connection, scored, end, threshold)
    return CheckResult(end, len(scored), alerts)

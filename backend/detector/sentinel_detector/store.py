"""Reading report counts from PostgreSQL and writing alerts back.

The detector only reads reports and writes alerts. It is never called from the
ingestion path; it runs on its own schedule against what has been stored.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

import pandas as pd
import psycopg

from sentinel_detector.episodes import continues
from sentinel_detector.windows import history_start
from sentinel_detector.zscore import weekly_counts

# Serialises alert writing, so two detectors running at once cannot both raise
# the same alert. The value only has to be unique within this database.
ALERT_WRITER_LOCK = 0x53454E54

# Which window a report falls in: 0 for [end - 7 days, end), 1 for the week before, and so on.
COUNTS_SQL = """
    select district_code,
           symptom_group,
           ceil(extract(epoch from (%(end)s - reported_at)) / 604800)::int - 1 as weeks_ago,
           count(*)
    from reports
    where reported_at >= %(start)s and reported_at < %(end)s
    group by 1, 2, 3
"""


@dataclass(frozen=True)
class RaisedAlert:
    code: str
    district_code: str
    symptom_group: str
    observed: int
    z_score: float
    is_new: bool


def districts(connection: psycopg.Connection) -> list[str]:
    return [row[0] for row in connection.execute("select code from districts order by code")]


def earliest_report(connection: psycopg.Connection) -> datetime | None:
    return connection.execute("select min(reported_at) from reports").fetchone()[0]


def read_weekly_counts(connection: psycopg.Connection, end: datetime) -> pd.DataFrame:
    rows = connection.execute(COUNTS_SQL, {"start": history_start(end), "end": end}).fetchall()
    return weekly_counts(rows, districts(connection))


def record_alerts(
    connection: psycopg.Connection, scored: pd.DataFrame, detected_at: datetime, threshold: float
) -> list[RaisedAlert]:
    """Raise or extend an alert for every scored series above the threshold.

    A detection extends the series' latest alert when the episode rule says it
    continues it, and raises a new alert otherwise. A check older than the
    latest alert's last detection changes nothing: the alert already reflects a
    later check.
    """
    connection.execute("select pg_advisory_xact_lock(%s)", (ALERT_WRITER_LOCK,))
    raised = []
    for (district, group), row in scored[scored["alert"]].iterrows():
        figures = {
            "district": district,
            "group": group,
            "at": detected_at,
            "observed": int(row["observed"]),
            "mean": float(row["baseline_mean"]),
            "sd": float(row["baseline_sd"]),
            "z": float(row["z_score"]),
            "threshold": threshold,
        }
        latest = connection.execute(
            """
            select id, last_detected_at from alerts
            where district_code = %s and symptom_group = %s
            order by last_detected_at desc limit 1
            """,
            (district, group),
        ).fetchone()
        if latest is not None and detected_at < latest[1]:
            continue
        if latest is not None and continues(latest[1], detected_at):
            code = connection.execute(
                """
                update alerts
                set last_detected_at = %(at)s, observed_count = %(observed)s,
                    baseline_mean = %(mean)s, baseline_sd = %(sd)s, z_score = %(z)s,
                    peak_z_score = greatest(peak_z_score, %(z)s::numeric(9, 2)),
                    threshold = %(threshold)s
                where id = %(id)s
                returning code
                """,
                {**figures, "id": latest[0]},
            ).fetchone()[0]
            is_new = False
        else:
            code = connection.execute(
                """
                insert into alerts (district_code, symptom_group, first_detected_at,
                    last_detected_at, observed_count, baseline_mean, baseline_sd, z_score,
                    peak_z_score, threshold)
                values (%(district)s, %(group)s, %(at)s, %(at)s, %(observed)s, %(mean)s, %(sd)s,
                    %(z)s, %(z)s, %(threshold)s)
                returning code
                """,
                figures,
            ).fetchone()[0]
            is_new = True
        raised.append(RaisedAlert(code, district, group, figures["observed"], figures["z"], is_new))
    return raised

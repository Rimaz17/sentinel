"""Reading report counts and locations from PostgreSQL and writing alerts back.

The detector only reads reports and writes alerts and their clusters. It is
never called from the ingestion path; it runs on its own schedule against what
has been stored. Distances are PostGIS's, on the same sphere as the geographic
check's own (docs/adr/0019-postgis.md).
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime

import pandas as pd
import psycopg

from sentinel_detector.episodes import continues
from sentinel_detector.geography import RING_KM, Cluster, Point, Ring
from sentinel_detector.windows import WEEK, history_start
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

# A series' located reports in the current week, [end - 7 days, end).
WEEK_POINTS_SQL = """
    select latitude::float8, longitude::float8, facility_id
    from reports
    where district_code = %(district)s and symptom_group = %(group)s
      and reported_at >= %(week_start)s and reported_at < %(end)s
      and location is not null
"""

# A series' located reports in the current week, and in the eight weeks before it.
LOCATED_TOTALS_SQL = """
    select count(*) filter (where reported_at >= %(week_start)s),
           count(*) filter (where reported_at < %(week_start)s)
    from reports
    where district_code = %(district)s and symptom_group = %(group)s
      and reported_at >= %(start)s and reported_at < %(end)s
      and location is not null
"""

# The same, within a distance of a point; and this week's facilities there. The
# final false measures on a sphere rather than the spheroid, as the haversine
# distances DBSCAN works with do, so the two agree on what is within the ring.
RING_SQL = """
    select count(*) filter (where reported_at >= %(week_start)s),
           count(distinct facility_id) filter (where reported_at >= %(week_start)s),
           count(*) filter (where reported_at < %(week_start)s)
    from reports
    where district_code = %(district)s and symptom_group = %(group)s
      and reported_at >= %(start)s and reported_at < %(end)s
      and st_dwithin(
          location,
          st_setsrid(st_makepoint(%(longitude)s, %(latitude)s), 4326)::geography,
          %(metres)s,
          false
      )
"""


@dataclass(frozen=True)
class RaisedAlert:
    code: str
    district_code: str
    symptom_group: str
    observed: int
    z_score: float
    is_new: bool
    clusters: tuple[Cluster, ...] = ()


def districts(connection: psycopg.Connection) -> list[str]:
    return [row[0] for row in connection.execute("select code from districts order by code")]


def earliest_report(connection: psycopg.Connection) -> datetime | None:
    return connection.execute("select min(reported_at) from reports").fetchone()[0]


def week_points(
    connection: psycopg.Connection, district: str, group: str, end: datetime
) -> list[Point]:
    """The series' located reports from the seven days to `end`."""
    rows = connection.execute(
        WEEK_POINTS_SQL,
        {"district": district, "group": group, "week_start": end - WEEK, "end": end},
    ).fetchall()
    return [Point(*row) for row in rows]


def ring_counter(
    connection: psycopg.Connection, district: str, group: str, end: datetime
) -> Callable[[float, float], Ring]:
    """Counts what lies within RING_KM of a point, for the series' week to `end`."""
    window = {
        "district": district,
        "group": group,
        "start": history_start(end),
        "week_start": end - WEEK,
        "end": end,
    }
    week_total, baseline_total = connection.execute(LOCATED_TOTALS_SQL, window).fetchone()

    def ring_at(latitude: float, longitude: float) -> Ring:
        reports, facilities, baseline_reports = connection.execute(
            RING_SQL,
            {**window, "latitude": latitude, "longitude": longitude, "metres": RING_KM * 1000},
        ).fetchone()
        return Ring(
            latitude,
            longitude,
            reports,
            facilities,
            baseline_reports,
            week_total,
            baseline_total,
        )

    return ring_at


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

    Each alert written is marked as geographically checked at `detected_at`:
    the caller records its clusters in the same transaction. Marking it here,
    in the statement that writes the alert anyway, keeps the change to one
    announcement (V12's trigger) rather than two.
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
                    threshold = %(threshold)s, clusters_checked_at = %(at)s
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
                    peak_z_score, threshold, clusters_checked_at)
                values (%(district)s, %(group)s, %(at)s, %(at)s, %(observed)s, %(mean)s, %(sd)s,
                    %(z)s, %(z)s, %(threshold)s, %(at)s)
                returning code
                """,
                figures,
            ).fetchone()[0]
            is_new = True
        raised.append(RaisedAlert(code, district, group, figures["observed"], figures["z"], is_new))
    return raised


def record_clusters(connection: psycopg.Connection, code: str, clusters: list[Cluster]) -> None:
    """Replace the alert's clusters with those of its latest check.

    Each cluster is stored with the facility nearest its centre in the same
    district, found by distance on the facilities' spatial index.
    """
    connection.execute(
        "delete from alert_clusters where alert_id = (select id from alerts where code = %s)",
        (code,),
    )
    for cluster in clusters:
        connection.execute(
            """
            insert into alert_clusters (alert_id, latitude, longitude, radius_metres,
                report_count, facility_count, expected_count, nearest_facility_id)
            select a.id, %(latitude)s, %(longitude)s, %(metres)s, %(reports)s, %(facilities)s,
                %(expected)s,
                (select f.id from facilities f
                 where f.district_code = a.district_code and f.location is not null
                 order by f.location
                     <-> st_setsrid(st_makepoint(%(longitude)s, %(latitude)s), 4326)::geography
                 limit 1)
            from alerts a
            where a.code = %(code)s
            """,
            {
                "code": code,
                "latitude": cluster.latitude,
                "longitude": cluster.longitude,
                "metres": round(RING_KM * 1000),
                "reports": cluster.reports,
                "facilities": cluster.facilities,
                "expected": cluster.expected,
            },
        )

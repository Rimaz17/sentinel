"""The demo's outbreaks: a rolling schedule that keeps alerts on the dashboards.

Left to its baseline, the simulator produces a quiet country, and the public
dashboard shows no alert. So that a visitor always finds some, the simulator
runs this schedule unless told not to (`--quiet`):

  - a new outbreak starts every three and a half days, at full strength from its
    first hour (the "step" profile), and lasts 10 days, so two or three are
    always running;
  - each is a point outbreak, bunched around one spot, as a local outbreak is,
    except the influenza-like ones, which are waves spread across their
    district, as a seasonal rise is; so the inspectors' map shows both a cluster
    ring and an alert with none (docs/adr/0020);
  - each adds 20 times the square root of its district and group's usual week,
    so the detector's z-score passes 3 within about a day and the public
    threshold of 5 within about two, and the alert is published without an
    inspector. From its eighth day the outbreak's first days fall into the
    8-week baseline and its z-score sinks, below 3 about a day and a half after
    it ends; its alert stays open a day longer, so each is public for about ten
    and a half days, and three or four always are;
  - at every moment at least two running outbreaks stand above 5, so even a
    detector's very first check, straight after a backfill, publishes two. In a
    model with Poisson noise, 500 such first checks published at least two 494
    times and at least one every time;
  - they rotate through 24 districts and symptom groups, Colombo's four groups
    every three weeks among them, so no pair recurs within 84 days and each
    one's 8-week baseline is never raised by its own last outbreak.

The schedule is fixed to the calendar, not to when the simulator starts, so a
backfill and a later live run agree on which outbreaks are running, and each
outbreak keeps one centre whichever run posts its reports.
"""

from __future__ import annotations

import math
from datetime import UTC, datetime, timedelta

from sentinel_simulator.baselines import (
    DENGUE_LIKE,
    GASTROINTESTINAL,
    INFLUENZA_LIKE,
    LEPTOSPIROSIS_LIKE,
    WEEKLY_BASELINES,
)
from sentinel_simulator.outbreaks import Outbreak

# A Monday, 05:30 in Sri Lanka: the schedule's first outbreak starts here.
EPOCH = datetime(2026, 1, 5, 0, 0, tzinfo=UTC)
EVERY = timedelta(days=3.5)
LASTS = timedelta(days=10)
STRENGTH = 20.0

ROTATION: tuple[tuple[str, str], ...] = (
    ("CMB", DENGUE_LIKE),
    ("KDY", DENGUE_LIKE),
    ("GAL", LEPTOSPIROSIS_LIKE),
    ("JAF", DENGUE_LIKE),
    ("KUR", INFLUENZA_LIKE),
    ("RAT", LEPTOSPIROSIS_LIKE),
    ("CMB", GASTROINTESTINAL),
    ("GMP", DENGUE_LIKE),
    ("BTC", GASTROINTESTINAL),
    ("ANU", INFLUENZA_LIKE),
    ("KEG", LEPTOSPIROSIS_LIKE),
    ("MTR", DENGUE_LIKE),
    ("CMB", INFLUENZA_LIKE),
    ("KLT", GASTROINTESTINAL),
    ("PTM", DENGUE_LIKE),
    ("BDL", INFLUENZA_LIKE),
    ("TRC", GASTROINTESTINAL),
    ("HMB", DENGUE_LIKE),
    ("CMB", LEPTOSPIROSIS_LIKE),
    ("NEL", INFLUENZA_LIKE),
    ("AMP", GASTROINTESTINAL),
    ("MTL", DENGUE_LIKE),
    ("POL", LEPTOSPIROSIS_LIKE),
    ("VAV", INFLUENZA_LIKE),
)


def strength(district: str, group: str) -> float:
    """Extra reports a week, whole: 20 times the square root of the usual week."""
    return float(round(STRENGTH * math.sqrt(WEEKLY_BASELINES[district][group])))


def scheduled(index: int) -> Outbreak:
    """The schedule's outbreak number `index`, counting from the epoch."""
    district, group = ROTATION[index % len(ROTATION)]
    start = EPOCH + index * EVERY
    return Outbreak(
        district_code=district,
        symptom_group=group,
        start=start,
        extra_per_week=strength(district, group),
        days=LASTS / timedelta(days=1),
        profile="step",
        spread="wave" if group == INFLUENZA_LIKE else "point",
        place=f"demo-{index}",
    )


def demo_outbreaks(start: datetime, end: datetime) -> list[Outbreak]:
    """Every scheduled outbreak that is running at some moment in [start, end)."""
    first = math.floor((start - LASTS - EPOCH) / EVERY)
    last = math.ceil((end - EPOCH) / EVERY)
    candidates = (scheduled(index) for index in range(first, last + 1))
    return [o for o in candidates if o.start < end and o.end > start]


def running(moment: datetime) -> list[Outbreak]:
    """The scheduled outbreaks running at `moment`."""
    return demo_outbreaks(moment, moment + timedelta(microseconds=1))

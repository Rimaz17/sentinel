"""Outbreaks injected on top of the baseline, as ground truth for the detector.

An outbreak adds reports in one district and symptom group for a number of days.
Its strength is given as extra reports per week at its peak, and it follows one
of two profiles over time:

  ramp  rises steadily to its peak halfway through, then falls away
  step  arrives at full strength and stays there until it ends

and one of two spreads over the map:

  point  patients bunched within a couple of kilometres of one spot, seen by the
         several facilities nearest to it: a local outbreak
  wave   patients spread across the district like its ordinary load: a seasonal rise
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timedelta

from sentinel_simulator.baselines import SYMPTOM_GROUPS, WEEKLY_BASELINES

PROFILES = ("ramp", "step")
SPREADS = ("point", "wave")

HOURS_PER_WEEK = 168


@dataclass(frozen=True)
class Outbreak:
    district_code: str
    symptom_group: str
    start: datetime
    extra_per_week: float
    days: float = 14.0
    profile: str = "ramp"
    spread: str = "point"
    # Fixes where a point outbreak centres, so every run that posts its reports
    # puts them in the same place. Without it the run's own random draw decides.
    place: str | None = None

    def __post_init__(self):
        if self.district_code not in WEEKLY_BASELINES:
            raise ValueError(f"unknown district: {self.district_code}")
        if self.symptom_group not in SYMPTOM_GROUPS:
            raise ValueError(f"unknown symptom group: {self.symptom_group}")
        if self.extra_per_week <= 0 or self.days <= 0:
            raise ValueError("an outbreak needs positive strength and duration")
        if self.profile not in PROFILES:
            raise ValueError(f"profile must be one of {', '.join(PROFILES)}")
        if self.spread not in SPREADS:
            raise ValueError(f"spread must be one of {', '.join(SPREADS)}")
        if self.start.tzinfo is None:
            raise ValueError("an outbreak's start must be timezone-aware")

    @property
    def end(self) -> datetime:
        return self.start + timedelta(days=self.days)

    def intensity(self, moment: datetime) -> float:
        """Share of peak strength at `moment`: 0 outside the outbreak, 1 at its peak."""
        if not self.start <= moment < self.end:
            return 0.0
        if self.profile == "step":
            return 1.0
        progress = (moment - self.start) / (self.end - self.start)
        return 1.0 - abs(2.0 * progress - 1.0)

    def expected_in(self, start: datetime, end: datetime) -> float:
        """Extra reports expected in [start, end), taking strength at the slice's midpoint."""
        hours = (end - start).total_seconds() / 3600
        return (
            self.extra_per_week * self.intensity(start + (end - start) / 2) * hours / HOURS_PER_WEEK
        )

    def describe(self) -> str:
        return (
            f"{self.district_code} {self.symptom_group}, +{self.extra_per_week:g} a week at peak,"
            f" {self.profile}, {self.spread}, {self.start:%Y-%m-%d %H:%M} to"
            f" {self.end:%Y-%m-%d %H:%M} UTC"
        )


_OFFSET = re.compile(r"^([+-]?\d+(?:\.\d+)?)([dh])$")


def parse_outbreak(text: str, reference: datetime) -> Outbreak:
    """An outbreak from `district=KDY,group=DENGUE_LIKE,extra=40[,start=-3d,days=14,...]`.

    `start` is an offset from `reference` in days (d) or hours (h), negative for
    the past; it defaults to `reference` itself.
    """
    fields = {}
    for part in text.split(","):
        key, sep, value = part.partition("=")
        if not sep:
            raise ValueError(f"expected key=value, got {part!r}")
        fields[key.strip()] = value.strip()

    unknown = set(fields) - {"district", "group", "extra", "start", "days", "profile", "spread"}
    if unknown:
        raise ValueError(f"unknown outbreak setting: {', '.join(sorted(unknown))}")
    missing = [key for key in ("district", "group", "extra") if key not in fields]
    if missing:
        raise ValueError(f"an outbreak needs {', '.join(missing)}")

    offset = _OFFSET.match(fields.get("start", "0h"))
    if offset is None:
        raise ValueError("start must look like -3d or 12h")
    amount, unit = float(offset.group(1)), offset.group(2)
    start = reference + (timedelta(days=amount) if unit == "d" else timedelta(hours=amount))

    return Outbreak(
        district_code=fields["district"].upper(),
        symptom_group=fields["group"].upper(),
        start=start,
        extra_per_week=float(fields["extra"]),
        days=float(fields.get("days", 14)),
        profile=fields.get("profile", "ramp"),
        spread=fields.get("spread", "point"),
    )

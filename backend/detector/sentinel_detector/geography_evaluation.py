"""Measuring the geographic check against outbreaks whose shape is known.

The simulator decides whether an outbreak is a point (patients bunched within
about 2 km of one spot, seen by the nearest few facilities) or a wave (patients
spread across the district like its everyday load). So the check can be scored
on what it is for: ringing point outbreaks, and not ringing waves.

Each trial generates one series' located reports with the simulator's own
generator and the real facility registry, nine quiet weeks and then an
outbreak, and runs the production z-score hour by hour. Where it alerts, the
production geographic check (`find_clusters`) looks at the week's reports, as
the hourly check would: at the first alert, and then every few hours while the
series stays flagged, until it rings. A ring under a wave, or under a false
alarm in a quiet week, is a false ring.

It counts what lies within the ring in memory, with the same haversine distance
on the same sphere as the store's PostGIS query, so it needs no database. See
docs/adr/0020-geographic-check.md.
"""

from __future__ import annotations

import random
import re
import statistics
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from sklearn.metrics.pairwise import haversine_distances

from sentinel_detector.episodes import episode_starts
from sentinel_detector.evaluation import (
    EPOCH,
    HISTORY_HOURS,
    HOUR,
    OUTBREAK_DAYS,
    SIZES,
    WEEK_HOURS,
    weekly_windows,
)
from sentinel_detector.geography import (
    EARTH_RADIUS_KM,
    RING_KM,
    Cluster,
    Point,
    Ring,
    find_clusters,
)
from sentinel_detector.zscore import DEFAULT_THRESHOLD, score
from sentinel_simulator.baselines import WEEKLY_BASELINES
from sentinel_simulator.generator import Facility, Generator
from sentinel_simulator.outbreaks import PROFILES, SPREADS, Outbreak

# The registry as the API seeds it, so trials place reports where the real facilities are.
REGISTRY_SEED = (
    Path(__file__).resolve().parents[2]
    / "api/src/main/resources/db/migration/V3__seed_facilities.sql"
)
_SEED_ROW = re.compile(
    r"\('([A-Z]{3}[0-9]{7})', '(?:[^']|'')*', '([A-Z]{3})', '[A-Z_]+', '([^']*)',"
    r" (null|[0-9.]+), (null|[0-9.]+)\)"
)

# Hours between ring checks while a series stays flagged. The detector looks every hour,
# and so does this: each look is another chance of a false ring under a wave, so looking
# less often would understate them.
EVERY = 1

THRESHOLD = DEFAULT_THRESHOLD
QUIET_WEEKS = 52


def registry_facilities(seed: Path = REGISTRY_SEED) -> list[Facility]:
    """The facilities of the API's seed migration, located or not."""
    text = seed.read_text(encoding="utf-8")
    return [
        Facility(
            code,
            district,
            institution_type,
            None if latitude == "null" else float(latitude),
            None if longitude == "null" else float(longitude),
        )
        for code, district, institution_type, latitude, longitude in _SEED_ROW.findall(text)
    ]


class Located:
    """One series' located reports, as arrays, with each report's hour from the epoch."""

    def __init__(self, reports, facility_ids: dict[str, int]):
        self.hours = np.array([int((r.reported_at - EPOCH) / HOUR) for r in reports], dtype=int)
        # Stored locations are rounded to three decimal places, about 110 m.
        self.latitudes = np.round([r.latitude for r in reports], 3)
        self.longitudes = np.round([r.longitude for r in reports], 3)
        self.facilities = np.array([facility_ids[r.facility_code] for r in reports], dtype=int)

    def counts(self, hours: int) -> np.ndarray:
        """Reports in each hour from the epoch."""
        return np.bincount(self.hours, minlength=hours)[:hours]

    def clusters(self, check: int) -> list[Cluster]:
        """What the geographic check finds for a check at the end of hour `check`."""
        week = (self.hours >= check - WEEK_HOURS) & (self.hours < check)
        before = (self.hours >= check - HISTORY_HOURS) & (self.hours < check - WEEK_HOURS)
        points = [
            Point(float(lat), float(lon), int(f))
            for lat, lon, f in zip(
                self.latitudes[week], self.longitudes[week], self.facilities[week], strict=True
            )
        ]

        def within(mask, latitude, longitude):
            if not mask.any():
                return mask
            positions = np.radians(np.column_stack([self.latitudes[mask], self.longitudes[mask]]))
            distances = haversine_distances(np.radians([[latitude, longitude]]), positions)[0]
            inside = np.zeros_like(mask)
            inside[np.flatnonzero(mask)[distances * EARTH_RADIUS_KM <= RING_KM]] = True
            return inside

        def ring_at(latitude: float, longitude: float) -> Ring:
            now = within(week, latitude, longitude)
            return Ring(
                latitude,
                longitude,
                int(now.sum()),
                len(set(self.facilities[now].tolist())),
                int(within(before, latitude, longitude).sum()),
                int(week.sum()),
                int(before.sum()),
            )

        return find_clusters(points, ring_at)


@dataclass(frozen=True)
class GeoTrial:
    district_code: str
    symptom_group: str
    baseline: float
    size: float
    profile: str
    spread: str
    # Hours from the outbreak's start to its first alert, and to the first ring under it.
    alerted_after: int | None
    ringed_after: int | None
    # The ring at the first alert, if there was one then.
    ring_at_alert: Cluster | None

    @property
    def alerted(self) -> bool:
        return self.alerted_after is not None

    @property
    def ringed(self) -> bool:
        return self.ringed_after is not None


def first_ring(located: Located, alerting_checks: Sequence[int]) -> tuple[int, Cluster] | None:
    """The first of the alerting checks, taken EVERY hours apart, that rings, and its ring."""
    first = alerting_checks[0]
    for check in alerting_checks:
        if (check - first) % EVERY:
            continue
        clusters = located.clusters(check)
        if clusters:
            return check, clusters[0]
    return None


def outbreak_trial(
    district: str,
    group: str,
    size: float,
    profile: str,
    spread: str,
    facilities: list[Facility],
    rng: random.Random,
) -> GeoTrial:
    """One outbreak after nine quiet weeks, checked every hour while it lasts."""
    baseline = WEEKLY_BASELINES[district][group]
    onset = HISTORY_HOURS + rng.randrange(WEEK_HOURS)
    length = OUTBREAK_DAYS * 24
    outbreak = Outbreak(
        district_code=district,
        symptom_group=group,
        start=EPOCH + onset * HOUR,
        extra_per_week=size * baseline,
        days=OUTBREAK_DAYS,
        profile=profile,
        spread=spread,
    )
    generator = Generator(
        facilities, rng, baselines={district: {group: baseline}}, outbreaks=[outbreak]
    )
    ids = {f.code: i for i, f in enumerate(facilities)}
    located = Located(list(generator.reports(EPOCH, EPOCH + (onset + length) * HOUR)), ids)

    checks = np.arange(onset + 1, onset + length + 1)
    alerting = score(weekly_windows(located.counts(onset + length), checks), THRESHOLD)["alert"]
    alerting_checks = checks[alerting.to_numpy()].tolist()
    alerted_after = alerting_checks[0] - onset if alerting_checks else None
    ringed_after, ring_at_alert = None, None
    if alerting_checks:
        found = first_ring(located, alerting_checks)
        if found is not None:
            ringed_after = found[0] - onset
            if found[0] == alerting_checks[0]:
                ring_at_alert = found[1]
    return GeoTrial(
        district,
        group,
        baseline,
        size,
        profile,
        spread,
        alerted_after,
        ringed_after,
        ring_at_alert,
    )


def outbreak_trials(
    rng: random.Random,
    facilities: list[Facility],
    sizes: Sequence[float] = SIZES,
    profiles: Sequence[str] = PROFILES,
    spreads: Sequence[str] = SPREADS,
    series: Sequence[tuple[str, str]] | None = None,
) -> list[GeoTrial]:
    """One outbreak of every size, profile and spread in every district and symptom group."""
    if series is None:
        series = [(d, g) for d, groups in WEEKLY_BASELINES.items() for g in groups]
    return [
        outbreak_trial(district, group, size, profile, spread, facilities, rng)
        for district, group in series
        for spread in spreads
        for size in sizes
        for profile in profiles
    ]


@dataclass(frozen=True)
class QuietRings:
    weeks: int
    false_alarms: int
    ringed: int


def quiet_rings(
    rng: random.Random, facilities: list[Facility], weeks: int = QUIET_WEEKS
) -> QuietRings:
    """Every alert episode of `weeks` quiet weeks nationally, and how many were ever ringed."""
    hours = HISTORY_HOURS + weeks * WEEK_HOURS
    generator = Generator(facilities, rng)
    ids = {f.code: i for i, f in enumerate(facilities)}
    by_series: dict[tuple[str, str], list] = {}
    for report in generator.reports(EPOCH, EPOCH + hours * HOUR):
        district = facilities[ids[report.facility_code]].district_code
        by_series.setdefault((district, report.symptom_group), []).append(report)

    checks = np.arange(HISTORY_HOURS, hours)
    false_alarms = ringed = 0
    for reports in by_series.values():
        located = Located(reports, ids)
        alerting = score(weekly_windows(located.counts(hours), checks), THRESHOLD)["alert"]
        alerting_checks = checks[alerting.to_numpy()].tolist()
        starts = [
            int((s - EPOCH) / HOUR)
            for s in episode_starts(EPOCH + h * HOUR for h in alerting_checks)
        ]
        for i, start in enumerate(starts):
            stop = starts[i + 1] if i + 1 < len(starts) else hours
            episode = [h for h in alerting_checks if start <= h < stop]
            false_alarms += 1
            ringed += first_ring(located, episode) is not None
    return QuietRings(weeks, false_alarms, ringed)


def _share(part: int, whole: int) -> str:
    return "n/a" if whole == 0 else f"{part / whole:.0%}"


def _median(values: list[int]) -> str:
    return "n/a" if not values else f"{statistics.median(values):.0f}"


def report(trials: list[GeoTrial], quiet: QuietRings, seed: int) -> str:
    """The measurements as Markdown, ready for the README."""
    sizes = sorted({t.size for t in trials})
    header = [
        "Outbreak",
        "Alerted",
        "Ringed at first alert",
        "Ringed while alerted",
        "Median hours, alert to ring",
    ]
    lines = [
        f"Seed {seed}: {len(trials)} injected outbreaks of {OUTBREAK_DAYS} days (every district"
        f" and symptom group at +{', +'.join(f'{size:.0%}' for size in sizes)} of its usual"
        " weekly count at peak, each as a ramp and as a step, each as a point and as a wave),"
        f" and {quiet.weeks} quiet weeks of all series. Shares of ringed outbreaks are of those"
        f" alerted, at {THRESHOLD:.1f} sd.",
        "",
        "| " + " | ".join(header) + " |",
        "|" + "---|" * len(header),
    ]
    rows = []
    for spread in sorted({t.spread for t in trials}):
        rows.append((spread.capitalize(), [t for t in trials if t.spread == spread]))
        for size in sizes:
            rows.append(
                (
                    f"{spread.capitalize()} at +{size:.0%}",
                    [t for t in trials if t.spread == spread and t.size == size],
                )
            )
    for label, group in rows:
        alerted = [t for t in group if t.alerted]
        ringed = [t for t in alerted if t.ringed]
        cells = [
            label,
            _share(len(alerted), len(group)),
            _share(sum(t.ring_at_alert is not None for t in alerted), len(alerted)),
            _share(len(ringed), len(alerted)),
            _median([t.ringed_after - t.alerted_after for t in ringed]),
        ]
        lines.append("| " + " | ".join(cells) + " |")
    lines.append(
        "| False alarm, quiet weeks | "
        + f"{quiet.false_alarms} alerts | n/a | {_share(quiet.ringed, quiet.false_alarms)}"
        + " | n/a |"
    )

    kandy = [
        t
        for t in trials
        if (t.district_code, t.symptom_group) == ("KDY", "DENGUE_LIKE") and t.alerted
    ]
    if kandy:
        lines += ["", f"Kandy dengue-like (usual week about 25 reports) at {THRESHOLD:.1f} sd:", ""]
        for t in kandy:
            if t.ringed:
                outcome = f"ringed {t.ringed_after - t.alerted_after} hours after its alert"
                if t.ring_at_alert is not None:
                    ring = t.ring_at_alert
                    outcome = (
                        f"ringed at its alert: {ring.reports} reports within {RING_KM:g} km"
                        f" from {ring.facilities} facilities, {ring.expected:.1f} expected"
                    )
            else:
                outcome = "never ringed"
            lines.append(f"- {t.spread}, +{t.size:.0%} at peak, {t.profile}: {outcome}")
    return "\n".join(lines) + "\n"

"""Measuring the detector against outbreaks whose start is known.

Because the simulator decides when each outbreak starts, the detector can be
scored against ground truth. This runs the production scoring and episode rules
over counts drawn from the simulator's own distributions, hour by hour:

  detection rate      share of injected outbreaks that raised an alert while
                      they were still happening
  time to detect      median hours from an outbreak's start to its first alert
  false alarms        alert episodes per week, across all 100 district and
                      symptom group series, when nothing was injected

each at several thresholds. It works on counts rather than individual reports:
the z-score only ever sees counts, and counts are fast enough to run hundreds of
outbreaks and a quiet year in under a minute. See docs/adr/0008.
"""

from __future__ import annotations

import random
import statistics
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

try:
    import sentinel_simulator  # noqa: F401
except ImportError:  # run from the repository: the simulator is a sibling project
    sys.path.append(str(Path(__file__).resolve().parents[2] / "simulator"))

from sentinel_detector.episodes import episode_starts  # noqa: E402
from sentinel_detector.windows import HISTORY, WEEKS  # noqa: E402
from sentinel_detector.zscore import score  # noqa: E402
from sentinel_simulator.baselines import WEEKLY_BASELINES  # noqa: E402
from sentinel_simulator.generator import poisson  # noqa: E402
from sentinel_simulator.outbreaks import PROFILES, Outbreak  # noqa: E402
from sentinel_simulator.rhythm import SRI_LANKA, expected_in_hour  # noqa: E402

HOUR = timedelta(hours=1)
WEEK_HOURS = 168
HISTORY_HOURS = int(HISTORY / HOUR)

# Every simulation starts at midnight on a Monday in Colombo, so its hours line
# up with the simulator's local-hour rhythm.
EPOCH = datetime(2026, 1, 5, tzinfo=SRI_LANKA)

THRESHOLDS = (2.0, 2.5, 3.0, 3.5)
# Peak extra reports per week, as a share of the series' usual weekly count.
SIZES = (0.5, 1.0, 2.0)
OUTBREAK_DAYS = 14
QUIET_WEEKS = 52


def simulate_counts(
    weekly_mean: float, hours: int, rng: random.Random, outbreak: Outbreak | None = None
) -> np.ndarray:
    """Reports in each hour from EPOCH: the baseline, plus the outbreak if there is one."""
    counts = np.empty(hours, dtype=np.int64)
    for h in range(hours):
        moment = EPOCH + h * HOUR
        mean = expected_in_hour(weekly_mean, moment)
        if outbreak is not None:
            mean += outbreak.expected_in(moment, moment + HOUR)
        counts[h] = poisson(mean, rng)
    return counts


def weekly_windows(counts: np.ndarray, checks: np.ndarray) -> pd.DataFrame:
    """The w0 to w8 counts a check would read, for a check at the end of each hour in `checks`."""
    if checks.min() < HISTORY_HOURS:
        raise ValueError("every check needs nine weeks of counts before it")
    running = np.concatenate([[0], np.cumsum(counts)])
    columns = {}
    for k, name in enumerate(WEEKS):
        end = checks - k * WEEK_HOURS
        columns[name] = running[end] - running[end - WEEK_HOURS]
    return pd.DataFrame(columns)


@dataclass(frozen=True)
class Trial:
    district_code: str
    symptom_group: str
    baseline: float
    size: float
    profile: str
    # Hours from the outbreak's start to each check that raised an alert, per threshold.
    detections: dict[float, list[int]]
    # Reports in the current week at the first alert, per threshold.
    counts_at_detection: dict[float, int]

    def detected(self, threshold: float) -> bool:
        return bool(self.detections[threshold])

    def hours_to_detect(self, threshold: float) -> int | None:
        hits = self.detections[threshold]
        return hits[0] if hits else None


def outbreak_trial(
    district: str,
    group: str,
    size: float,
    profile: str,
    rng: random.Random,
    thresholds: Sequence[float] = THRESHOLDS,
) -> Trial:
    """One outbreak after nine quiet weeks, checked every hour while it lasts."""
    baseline = WEEKLY_BASELINES[district][group]
    onset = HISTORY_HOURS + rng.randrange(WEEK_HOURS)
    outbreak = Outbreak(
        district_code=district,
        symptom_group=group,
        start=EPOCH + onset * HOUR,
        extra_per_week=size * baseline,
        days=OUTBREAK_DAYS,
        profile=profile,
        # Where patients live does not change the counts the z-score sees.
        spread="wave",
    )
    length = OUTBREAK_DAYS * 24
    counts = simulate_counts(baseline, onset + length, rng, outbreak)
    checks = np.arange(onset + 1, onset + length + 1)
    windows = weekly_windows(counts, checks)

    detections, counts_at_detection = {}, {}
    for threshold in thresholds:
        alerting = score(windows, threshold)["alert"].to_numpy()
        hits = (checks[alerting] - onset).tolist()
        detections[threshold] = hits
        if hits:
            counts_at_detection[threshold] = int(windows["w0"].to_numpy()[alerting][0])
    return Trial(district, group, baseline, size, profile, detections, counts_at_detection)


def outbreak_trials(
    rng: random.Random,
    sizes: Sequence[float] = SIZES,
    profiles: Sequence[str] = PROFILES,
    thresholds: Sequence[float] = THRESHOLDS,
) -> list[Trial]:
    """One outbreak of every size and profile in every district and symptom group."""
    return [
        outbreak_trial(district, group, size, profile, rng, thresholds)
        for district, groups in WEEKLY_BASELINES.items()
        for group in groups
        for size in sizes
        for profile in profiles
    ]


def false_alarms_per_week(
    rng: random.Random, weeks: int = QUIET_WEEKS, thresholds: Sequence[float] = THRESHOLDS
) -> dict[float, float]:
    """Alert episodes a week, nationally, when every series runs at its baseline."""
    checks = np.arange(HISTORY_HOURS, HISTORY_HOURS + weeks * WEEK_HOURS)
    episodes = dict.fromkeys(thresholds, 0)
    for groups in WEEKLY_BASELINES.values():
        for weekly_mean in groups.values():
            windows = weekly_windows(
                simulate_counts(weekly_mean, HISTORY_HOURS + weeks * WEEK_HOURS, rng), checks
            )
            for threshold in thresholds:
                alerting = score(windows, threshold)["alert"].to_numpy()
                times = [EPOCH + int(h) * HOUR for h in checks[alerting]]
                episodes[threshold] += len(episode_starts(times))
    return {threshold: count / weeks for threshold, count in episodes.items()}


def summarise(
    trials: list[Trial], false_alarms: dict[float, float], thresholds: Sequence[float] = THRESHOLDS
) -> pd.DataFrame:
    """One row per threshold, with detection broken down by outbreak size."""
    rows = []
    for threshold in thresholds:
        detected = [t for t in trials if t.detected(threshold)]
        row = {
            "threshold": threshold,
            "detection rate": len(detected) / len(trials),
            "median hours to detect": _median([t.hours_to_detect(threshold) for t in detected]),
            "false alarms per quiet week": false_alarms[threshold],
        }
        for size in sorted({t.size for t in trials}):
            of_size = [t for t in trials if t.size == size]
            row[f"detected at +{size:.0%}"] = sum(t.detected(threshold) for t in of_size) / len(
                of_size
            )
        rows.append(row)
    return pd.DataFrame(rows)


def _median(values: list[int]) -> float | None:
    return statistics.median(values) if values else None


def report(trials: list[Trial], false_alarms: dict[float, float], seed: int, weeks: int) -> str:
    """The measurements as Markdown, ready for the README."""
    summary = summarise(trials, false_alarms, thresholds=sorted(trials[0].detections))
    sizes = sorted({t.size for t in trials})
    series = sum(len(groups) for groups in WEEKLY_BASELINES.values())
    header = [
        "Threshold",
        "Detected",
        *[f"at +{size:.0%}" for size in sizes],
        "Median hours to detect",
        "False alarms per quiet week",
    ]
    lines = [
        f"Seed {seed}: {len(trials)} injected outbreaks of {OUTBREAK_DAYS} days (every district"
        f" and symptom group at +{', +'.join(f'{size:.0%}' for size in sizes)} of its usual"
        f" weekly count at peak, each as a ramp and as a step), and {weeks} quiet weeks of all"
        f" {series} series.",
        "",
        "| " + " | ".join(header) + " |",
        "|" + "---|" * len(header),
    ]
    for record in summary.to_dict("records"):
        hours = record["median hours to detect"]
        cells = [
            f"{record['threshold']:.1f} sd",
            f"{record['detection rate']:.0%}",
            *[f"{record[f'detected at +{size:.0%}']:.0%}" for size in sizes],
            "n/a" if pd.isna(hours) else f"{hours:.0f}",
            f"{record['false alarms per quiet week']:.2f}",
        ]
        lines.append("| " + " | ".join(cells) + " |")

    kandy = [t for t in trials if (t.district_code, t.symptom_group) == ("KDY", "DENGUE_LIKE")]
    if kandy and 3.0 in kandy[0].detections:
        lines += ["", "Kandy dengue-like (usual week about 25 reports) at 3.0 sd:", ""]
        for t in kandy:
            hours = t.hours_to_detect(3.0)
            outcome = (
                f"detected after {hours} hours, at {t.counts_at_detection[3.0]} reports in the week"
                if hours is not None
                else "not detected while it lasted"
            )
            lines.append(f"- +{t.size:.0%} at peak, {t.profile}: {outcome}")
    return "\n".join(lines) + "\n"

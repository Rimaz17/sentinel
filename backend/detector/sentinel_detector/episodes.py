"""When a detection is a new alert, and when it is more of the same one.

Checks run every hour over a seven-day window, so a single rise stays above the
threshold for many consecutive checks. Each of those is the same episode, and
raising a fresh alert for every one would bury the inspector. A detection
continues a series' latest alert if that alert was detected within the last day;
after a longer quiet spell it is a new alert.

The store applies this rule to the alerts table, and the evaluation applies it
to simulated checks, so the false-alarm figures count exactly what an inspector
would see.
"""

from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime, timedelta

EPISODE_GAP = timedelta(hours=24)


def continues(last_detected_at: datetime, detected_at: datetime) -> bool:
    """Whether a detection at `detected_at` extends an alert last detected at `last_detected_at`."""
    return detected_at - last_detected_at <= EPISODE_GAP


def episode_starts(detections: Iterable[datetime]) -> list[datetime]:
    """The detections, in time order, that would each have raised a new alert."""
    starts = []
    last = None
    for detected_at in sorted(detections):
        if last is None or not continues(last, detected_at):
            starts.append(detected_at)
        last = detected_at
    return starts

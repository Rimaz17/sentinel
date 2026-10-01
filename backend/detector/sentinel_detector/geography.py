"""The geographic check: are a flagged series' reports bunched in one place?

The z-score says a district and symptom group is running high. It cannot say
whether the extra reports come from one neighbourhood, which suggests a local
outbreak, or from all over the district, which suggests a seasonal wave. The
response differs, so for every series the z-score flags, this looks at the
same seven days' located reports on the map.

DBSCAN proposes the places: groups of reports each within a kilometre of
another, at least four strong, measured on the Earth's surface (haversine). Each
proposal is then tested before it is shown to an inspector; see `assess`.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.metrics.pairwise import haversine_distances

# The mean radius of the Earth, the sphere PostGIS measures on when told not to
# use the spheroid, so the store's distances and these agree.
EARTH_RADIUS_KM = 6371.0088

# DBSCAN's two settings: how near a report must be to another to share a place,
# and how many reports make a place. See docs/adr/0020.
NEIGHBOURHOOD_KM = 1.0
MIN_REPORTS = 4

# Report locations are stored to three decimal places, about 110 m, and so is a
# place's centre.
CENTRE_DECIMALS = 3


@dataclass(frozen=True)
class Point:
    """A located report: where, and which facility reported it."""

    latitude: float
    longitude: float
    facility_id: int


def candidate_centres(points: Sequence[Point]) -> list[tuple[float, float]]:
    """The centre of each place DBSCAN finds among `points`, the largest place first.

    A centre is the mean position of the place's reports, rounded as report
    locations are. Reports DBSCAN leaves out as noise belong to no place.
    """
    if len(points) < MIN_REPORTS:
        return []
    radians = np.radians([[p.latitude, p.longitude] for p in points])
    labels = DBSCAN(
        eps=NEIGHBOURHOOD_KM / EARTH_RADIUS_KM,
        min_samples=MIN_REPORTS,
        metric="haversine",
        algorithm="ball_tree",
    ).fit_predict(radians)
    places = []
    for label in sorted(set(labels) - {-1}):
        members = [p for p, member in zip(points, labels, strict=True) if member == label]
        centre = (
            round(float(np.mean([p.latitude for p in members])), CENTRE_DECIMALS),
            round(float(np.mean([p.longitude for p in members])), CENTRE_DECIMALS),
        )
        places.append((len(members), centre))
    places.sort(key=lambda place: place[0], reverse=True)
    return [centre for _, centre in places]


def distance_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    """Great-circle distance between two (latitude, longitude) points, in kilometres."""
    return float(haversine_distances(np.radians([a, b]))[0, 1] * EARTH_RADIUS_KM)

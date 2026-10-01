"""The geographic check: are a flagged series' reports bunched in one place?

The z-score says a district and symptom group is running high. It cannot say
whether the extra reports come from one neighbourhood, which suggests a local
outbreak, or from all over the district, which suggests a seasonal wave. The
response differs, so for every series the z-score flags, this looks at the
same seven days' located reports on the map.

DBSCAN proposes the places: groups of reports each within a kilometre of
another, at least four strong, measured on the Earth's surface (haversine). Each
proposal is then judged in a 2 km ring around its centre before it is shown to
an inspector; see `assess`. Reports bunch around a busy hospital every week, so
being dense is not enough: the ring must hold far more than its usual share.
"""

from __future__ import annotations

import math
from collections.abc import Callable, Sequence
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

# The ring a place is judged in, and drawn as on the inspectors' map.
RING_KM = 2.0
# Reports in the ring must come from at least this many facilities.
MIN_FACILITIES = 3
# Standard deviations above its usual share a ring must run, as the z-score's 3.
CONCENTRATION_THRESHOLD = 3.0


@dataclass(frozen=True)
class Point:
    """A located report: where, and which facility reported it."""

    latitude: float
    longitude: float
    facility_id: int


@dataclass(frozen=True)
class Ring:
    """What lies within RING_KM of a place's centre, in the series being checked.

    `reports` and `facilities` are from the current seven days; `baseline_reports`
    from the eight weeks before. `week_total` and `baseline_total` are the
    series' located reports in each period, anywhere in the district.
    """

    latitude: float
    longitude: float
    reports: int
    facilities: int
    baseline_reports: int
    week_total: int
    baseline_total: int


@dataclass(frozen=True)
class Cluster:
    """A place that passed: where it is, and what its ring held."""

    latitude: float
    longitude: float
    reports: int
    facilities: int
    # What the ring would hold this week at its share of the baseline weeks: the
    # figure shown to inspectors (see usual_in_ring).
    expected: float
    concentration: float


def week_share(ring: Ring) -> float:
    """The current week's share of the series' located reports across all nine weeks."""
    total = ring.week_total + ring.baseline_total
    return ring.week_total / total if total else 0.0


def expected_in_ring(ring: Ring) -> float:
    """This week's reports the ring would hold if it kept its usual share of the series.

    Of the reports the ring held across all nine weeks, a ring like any other
    would hold this week's share of the series this week.
    """
    return (ring.reports + ring.baseline_reports) * week_share(ring)


def usual_in_ring(ring: Ring) -> float:
    """This week's reports at the ring's share of the eight baseline weeks.

    The figure an inspector reads beside a cluster: of this week's reports in
    the series, how many would fall in this ring in an ordinary week. The test
    itself uses `expected_in_ring`, which also allows for the baseline weeks
    being few, and so is pulled up by the outbreak it is testing.
    """
    if ring.baseline_total == 0:
        return 0.0
    return ring.week_total * ring.baseline_reports / ring.baseline_total


def concentration(ring: Ring) -> float:
    """How far the ring's reports run above its usual share, in standard deviations.

    The usual comparison of two Poisson counts: given the ring's reports across
    all nine weeks, this week's are a binomial draw at this week's share of the
    series, if the ring is ordinary. Taking the spread from both periods allows
    for the baseline weeks being few, which a share taken from them alone would
    not. As with the z-score, the spread is never taken as less than one report.
    """
    held = ring.reports + ring.baseline_reports
    share = week_share(ring)
    spread = math.sqrt(held * share * (1 - share))
    return (ring.reports - expected_in_ring(ring)) / max(spread, 1.0)


def assess(ring: Ring, threshold: float = CONCENTRATION_THRESHOLD) -> Cluster | None:
    """A cluster if the ring is a local outbreak's signature, otherwise None.

    It must hold reports from at least MIN_FACILITIES facilities: one facility's
    patients bunch around it every week, and a single source could be one
    clinic's data problem. And its reports must run more than `threshold`
    standard deviations above the ring's usual share of the series. A seasonal
    wave raises every part of a district together, so each part keeps its
    share; a local outbreak raises one part far beyond it.
    """
    if ring.facilities < MIN_FACILITIES:
        return None
    score = concentration(ring)
    if score <= threshold:
        return None
    return Cluster(
        ring.latitude,
        ring.longitude,
        ring.reports,
        ring.facilities,
        round(usual_in_ring(ring), 2),
        round(score, 2),
    )


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


def find_clusters(
    points: Sequence[Point],
    ring_at: Callable[[float, float], Ring],
    threshold: float = CONCENTRATION_THRESHOLD,
) -> list[Cluster]:
    """The clusters among a flagged series' located reports for the week, strongest first.

    `points` are the week's located reports; `ring_at` counts what lies within
    RING_KM of a centre, which the store asks of PostGIS. Two places whose
    centres lie within a ring of each other are one place, seen from the
    stronger.
    """
    passed = [
        cluster
        for centre in candidate_centres(points)
        if (cluster := assess(ring_at(*centre), threshold)) is not None
    ]
    passed.sort(key=lambda cluster: cluster.concentration, reverse=True)
    kept: list[Cluster] = []
    for cluster in passed:
        here = (cluster.latitude, cluster.longitude)
        if all(distance_km(here, (k.latitude, k.longitude)) >= RING_KM for k in kept):
            kept.append(cluster)
    return kept

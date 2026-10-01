"""Turns baselines and rhythm into individual simulated reports.

Each report comes from a facility in its district, chosen in proportion to the
facility's size, and is placed near that facility, where its patients live. Every
report carries identity fields, as a real facility's record would, so the
ingestion API's stripping is exercised on every submission. The identity values
are marked SIMULATED and describe no one.
"""

from __future__ import annotations

import math
import random
from collections.abc import Iterator, Mapping, Sequence
from dataclasses import dataclass
from datetime import date, datetime

from sentinel_simulator.baselines import (
    DENGUE_LIKE,
    GASTROINTESTINAL,
    INFLUENZA_LIKE,
    LEPTOSPIROSIS_LIKE,
    WEEKLY_BASELINES,
)
from sentinel_simulator.outbreaks import Outbreak
from sentinel_simulator.rhythm import SRI_LANKA, expected_in_hour, hour_slices

# The bounds the ingestion API accepts. Jittered points are kept inside them.
LAT_RANGE = (5.8, 10.0)
LON_RANGE = (79.4, 82.0)

KM_PER_DEGREE_LATITUDE = 110.574
KM_PER_DEGREE_LONGITUDE_AT_EQUATOR = 111.320

# Relative outpatient load by the ministry's institution type. Specialist
# institutions without a general outpatient department see none of these
# symptom groups and are never chosen.
TYPE_WEIGHTS = {
    "Teaching": 8.0,
    "Provincial General": 7.0,
    "District General": 5.0,
    "Base A": 4.0,
    "Base B": 3.0,
    "Divisional A": 2.0,
    "Divisional B": 1.5,
    "Divisional C": 1.0,
    "PMCU": 1.0,
    "MOH": 1.0,
    "Prison": 0.5,
    "Dental": 0.0,
    "Mental": 0.0,
    "Rehabilitation": 0.0,
    "Nephrology": 0.0,
    "Leprosy": 0.0,
}
DEFAULT_TYPE_WEIGHT = 1.0

# Weight of each ten-year band, 0-9 up to 90+, for each symptom group.
AGE_BAND_WEIGHTS = {
    DENGUE_LIKE: (10, 20, 22, 17, 12, 9, 6, 3, 1, 0),
    INFLUENZA_LIKE: (24, 14, 11, 11, 10, 10, 9, 7, 3, 1),
    GASTROINTESTINAL: (30, 14, 12, 11, 9, 8, 7, 5, 3, 1),
    LEPTOSPIROSIS_LIKE: (2, 8, 18, 22, 22, 16, 9, 3, 0, 0),
}

# Share of reports that give a date of birth instead of an age.
DATE_OF_BIRTH_SHARE = 0.2

# A point outbreak's patients live within about 2 km of its centre (three spreads)
# and go to whichever of the nearest few facilities they choose.
POINT_SPREAD_KM = 0.7
POINT_FACILITIES = 6


@dataclass(frozen=True)
class Facility:
    code: str
    district_code: str
    institution_type: str
    latitude: float | None
    longitude: float | None


@dataclass(frozen=True)
class SimulatedReport:
    facility_code: str
    symptom_group: str
    reported_at: datetime
    age: int | None
    date_of_birth: date | None
    latitude: float
    longitude: float
    patient_name: str
    nic_number: str
    phone_number: str
    home_address: str

    def payload(self) -> dict:
        """The request body. The facility is not in it: it travels as the submitter's identity."""
        body = {
            "symptomGroup": self.symptom_group,
            "reportedAt": self.reported_at.astimezone(SRI_LANKA).isoformat(timespec="seconds"),
            "latitude": self.latitude,
            "longitude": self.longitude,
            "patientName": self.patient_name,
            "nicNumber": self.nic_number,
            "phoneNumber": self.phone_number,
            "homeAddress": self.home_address,
        }
        if self.age is not None:
            body["age"] = self.age
        else:
            body["dateOfBirth"] = self.date_of_birth.isoformat()
        return body


def poisson(mean: float, rng: random.Random) -> int:
    """A Poisson draw. Knuth's method for the small hourly means used here."""
    if mean <= 0:
        return 0
    if mean > 30:
        return max(0, round(rng.gauss(mean, math.sqrt(mean))))
    limit = math.exp(-mean)
    count = 0
    product = rng.random()
    while product > limit:
        count += 1
        product *= rng.random()
    return count


class Generator:
    def __init__(
        self,
        facilities: list[Facility],
        rng: random.Random,
        spread_km: float = 2.0,
        baselines: Mapping[str, Mapping[str, float]] = WEEKLY_BASELINES,
        outbreaks: Sequence[Outbreak] = (),
    ):
        self._rng = rng
        self._spread_km = spread_km
        self._baselines = baselines
        self._serial = 0
        self._candidates: dict[str, tuple[list[Facility], list[float]]] = {}
        for district in baselines:
            located = [
                f
                for f in facilities
                if f.district_code == district
                and f.latitude is not None
                and TYPE_WEIGHTS.get(f.institution_type, DEFAULT_TYPE_WEIGHT) > 0
            ]
            if not located:
                raise ValueError(f"no located facility can report for district {district}")
            self._candidates[district] = (located, _weights(located))

        self._outbreaks = list(outbreaks)
        # For each point outbreak: its centre, and the facilities nearest to it.
        self._hotspots: dict[int, tuple[Facility, list[Facility], list[float]]] = {}
        for i, outbreak in enumerate(self._outbreaks):
            if outbreak.spread == "point":
                located, weights = self._candidates[outbreak.district_code]
                draw = random.Random(outbreak.place) if outbreak.place else self._rng
                centre = draw.choices(located, weights)[0]
                nearest = sorted(located, key=lambda f: _distance_km(centre, f))[:POINT_FACILITIES]
                self._hotspots[i] = (centre, nearest, _weights(nearest))

    def reports(self, start: datetime, end: datetime) -> Iterator[SimulatedReport]:
        """Reports presenting in [start, end), hour by hour."""
        for slice_start, slice_end in hour_slices(start, end):
            fraction = (slice_end - slice_start).total_seconds() / 3600
            for district, groups in self._baselines.items():
                for group, weekly_mean in groups.items():
                    mean = expected_in_hour(weekly_mean, slice_start) * fraction
                    for _ in range(poisson(mean, self._rng)):
                        yield self._ordinary(district, group, self._during(slice_start, slice_end))
            for i, outbreak in enumerate(self._outbreaks):
                for _ in range(poisson(outbreak.expected_in(slice_start, slice_end), self._rng)):
                    reported_at = self._during(slice_start, slice_end)
                    if i in self._hotspots:
                        centre, nearest, weights = self._hotspots[i]
                        facility = self._rng.choices(nearest, weights)[0]
                        location = self._near(centre.latitude, centre.longitude, POINT_SPREAD_KM)
                        yield self._report(facility, outbreak.symptom_group, reported_at, location)
                    else:
                        yield self._ordinary(
                            outbreak.district_code, outbreak.symptom_group, reported_at
                        )

    def _during(self, start: datetime, end: datetime) -> datetime:
        return start + (end - start) * self._rng.random()

    def _ordinary(self, district: str, group: str, reported_at: datetime) -> SimulatedReport:
        """A report placed like the district's everyday load: near a facility of any size."""
        facilities, weights = self._candidates[district]
        facility = self._rng.choices(facilities, weights)[0]
        location = self._near(facility.latitude, facility.longitude, self._spread_km)
        return self._report(facility, group, reported_at, location)

    def _report(
        self,
        facility: Facility,
        group: str,
        reported_at: datetime,
        location: tuple[float, float],
    ) -> SimulatedReport:
        latitude, longitude = location
        age = self._age(group)
        gives_date_of_birth = self._rng.random() < DATE_OF_BIRTH_SHARE
        self._serial += 1
        return SimulatedReport(
            facility_code=facility.code,
            symptom_group=group,
            reported_at=reported_at,
            age=None if gives_date_of_birth else age,
            date_of_birth=self._date_of_birth(age, reported_at) if gives_date_of_birth else None,
            latitude=latitude,
            longitude=longitude,
            patient_name=f"SIMULATED patient {self._serial:06d}",
            nic_number=f"SIMULATED-{self._serial:06d}",
            phone_number="SIMULATED-0000000000",
            home_address=f"SIMULATED address {self._serial:06d}, {facility.district_code}",
        )

    def _near(self, latitude: float, longitude: float, spread_km: float) -> tuple[float, float]:
        """A point around another, normally distributed, cut off at three spreads."""
        while True:
            north_km = self._rng.gauss(0, spread_km)
            east_km = self._rng.gauss(0, spread_km)
            if math.hypot(north_km, east_km) <= 3 * spread_km:
                break
        lat = latitude + north_km / KM_PER_DEGREE_LATITUDE
        lon = longitude + east_km / (
            KM_PER_DEGREE_LONGITUDE_AT_EQUATOR * math.cos(math.radians(latitude))
        )
        return (
            round(min(max(lat, LAT_RANGE[0]), LAT_RANGE[1]), 7),
            round(min(max(lon, LON_RANGE[0]), LON_RANGE[1]), 7),
        )

    def _age(self, group: str) -> int:
        band = self._rng.choices(range(10), AGE_BAND_WEIGHTS[group])[0]
        return band * 10 + self._rng.randrange(10)

    def _date_of_birth(self, age: int, reported_at: datetime) -> date:
        """A birth date that makes the patient exactly `age` on the local day of the report."""
        reported_on = reported_at.astimezone(SRI_LANKA).date()
        day = 28 if (reported_on.month, reported_on.day) == (2, 29) else reported_on.day
        birthday = reported_on.replace(year=reported_on.year - age, day=day)
        return date.fromordinal(birthday.toordinal() - self._rng.randrange(365))


def _weights(facilities: list[Facility]) -> list[float]:
    return [TYPE_WEIGHTS.get(f.institution_type, DEFAULT_TYPE_WEIGHT) for f in facilities]


def _distance_km(a: Facility, b: Facility) -> float:
    north = (b.latitude - a.latitude) * KM_PER_DEGREE_LATITUDE
    east = (
        (b.longitude - a.longitude)
        * KM_PER_DEGREE_LONGITUDE_AT_EQUATOR
        * math.cos(math.radians(a.latitude))
    )
    return math.hypot(north, east)

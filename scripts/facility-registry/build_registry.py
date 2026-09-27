#!/usr/bin/env python3
"""Build Sentinel's facility registry from the Ministry of Health institution list.

Reads the line-delimited `institutions_geo.json` published by Team Watchdog
(see README.md in this folder) and writes two files:

  facilities.csv                  the trimmed registry, reviewed and committed
  V3__seed_facilities.sql         the Flyway migration that loads it

Only hospitals and MOH offices are kept: they are where patients present. The
rest of the list is administration, training schools, campaigns and school
dental clinics, none of which report symptoms.

Every source record carries Google geocoding output. Only the coordinates are
kept, and only where they pass verification (see `location_status`). Google
place IDs, viewports and address components are dropped.

Usage:  python scripts/facility-registry/build_registry.py path/to/institutions_geo.json
Needs:  Python 3.12+, no third-party packages.

The migration is applied once and then frozen: Flyway rejects a changed
checksum. Rebuild only before the migration has been merged.
"""

from __future__ import annotations

import csv
import json
import sys
from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
CSV_PATH = HERE / "facilities.csv"
MIGRATION_PATH = ROOT / "backend/api/src/main/resources/db/migration/V3__seed_facilities.sql"

# The ministry groups institutions by RDHS (Regional Director of Health
# Services) area. There is one per district, plus Kalmunai, which lies inside
# Ampara district. Codes are matched case-insensitively: two records say "Ml".
RDHS_TO_DISTRICT = {
    "AN": "ANU",
    "AP": "AMP",
    "BC": "BTC",
    "BD": "BDL",
    "CB": "CMB",
    "GL": "GAL",
    "GP": "GMP",
    "HT": "HMB",
    "JF": "JAF",
    "KE": "KEG",
    "KG": "KUR",
    "KL": "AMP",
    "KN": "KIL",
    "KT": "KLT",
    "KY": "KDY",
    "MG": "MON",
    "ML": "MUL",
    "MN": "MNR",
    "MR": "MTR",
    "MT": "MTL",
    "NE": "NEL",
    "PN": "POL",
    "PT": "PTM",
    "RP": "RAT",
    "TM": "TRC",
    "VN": "VAV",
}

# District names as Google spells them in the geocoded address, for checking
# that a coordinate landed in the facility's own district.
DISTRICT_NAMES = {
    "AMP": "Ampara",
    "ANU": "Anuradhapura",
    "BDL": "Badulla",
    "BTC": "Batticaloa",
    "CMB": "Colombo",
    "GAL": "Galle",
    "GMP": "Gampaha",
    "HMB": "Hambantota",
    "JAF": "Jaffna",
    "KDY": "Kandy",
    "KEG": "Kegalle",
    "KIL": "Kilinochchi",
    "KLT": "Kalutara",
    "KUR": "Kurunegala",
    "MNR": "Mannar",
    "MON": "Monaragala",
    "MTL": "Matale",
    "MTR": "Matara",
    "MUL": "Mullaitivu",
    "NEL": "Nuwara Eliya",
    "POL": "Polonnaruwa",
    "PTM": "Puttalam",
    "RAT": "Ratnapura",
    "TRC": "Trincomalee",
    "VAV": "Vavuniya",
}
GOOGLE_NAME_ALIASES = {"Moneragala": "Monaragala"}

CATEGORIES = {"Hospital": "HOSPITAL", "MOH Office": "MOH_OFFICE"}

# A generous box around Sri Lanka and its islands. The same bounds are enforced
# by the facilities table and by report ingestion.
LAT_RANGE = (5.8, 10.0)
LON_RANGE = (79.4, 82.0)

VERIFIED = "verified"
MISSING = "missing"
OUTSIDE_SRI_LANKA = "outside_sri_lanka"
SHARED_POINT = "shared_point"
WRONG_DISTRICT = "wrong_district"

CSV_FIELDS = [
    "code",
    "name",
    "district_code",
    "category",
    "institution_type",
    "latitude",
    "longitude",
    "location_status",
]


@dataclass(frozen=True)
class Facility:
    code: str
    name: str
    district_code: str
    category: str
    institution_type: str
    latitude: float | None
    longitude: float | None
    location_status: str


def read_source(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as source:
        return [json.loads(line) for line in source if line.strip()]


def point(record: dict) -> tuple[float, float] | None:
    geometry = record.get("geometry")
    if not geometry:
        return None
    location = geometry["location"]
    return (location["lat"], location["lng"])


def google_district(record: dict) -> str | None:
    for component in record.get("addressComponents") or []:
        if "administrative_area_level_2" in component["types"]:
            name = component["long_name"]
            return GOOGLE_NAME_ALIASES.get(name, name)
    return None


def location_status(record: dict, district_code: str, point_uses: Counter) -> str:
    """Decide whether a record's coordinates can be trusted.

    `point_uses` counts every coordinate across the whole source. A point that
    two institutions share is a geocoder fallback (a town centre, or a Colombo
    address matched by name), not either institution's location.
    """
    location = point(record)
    if location is None:
        return MISSING
    lat, lon = location
    if not (LAT_RANGE[0] <= lat <= LAT_RANGE[1] and LON_RANGE[0] <= lon <= LON_RANGE[1]):
        return OUTSIDE_SRI_LANKA
    if point_uses[location] > 1:
        return SHARED_POINT
    if google_district(record) != DISTRICT_NAMES[district_code]:
        return WRONG_DISTRICT
    return VERIFIED


def normalise_name(name: str) -> str:
    return " ".join(name.split())


def build(records: Iterable[dict]) -> list[Facility]:
    records = list(records)
    point_uses = Counter(p for p in map(point, records) if p is not None)

    facilities = []
    for record in records:
        category = CATEGORIES.get(record["type1"].strip())
        if category is None:
            continue
        district_code = RDHS_TO_DISTRICT[record["rdhs"].upper()]
        status = location_status(record, district_code, point_uses)
        location = point(record) if status == VERIFIED else None
        facilities.append(
            Facility(
                code=record["hin"].upper(),
                name=normalise_name(record["name"]),
                district_code=district_code,
                category=category,
                institution_type=normalise_name(record["type2"]),
                latitude=round(location[0], 6) if location else None,
                longitude=round(location[1], 6) if location else None,
                location_status=status,
            )
        )

    duplicates = [code for code, n in Counter(f.code for f in facilities).items() if n > 1]
    if duplicates:
        raise ValueError(f"duplicate facility codes: {sorted(duplicates)}")
    return sorted(facilities, key=lambda f: f.code)


def write_csv(facilities: list[Facility], path: Path) -> None:
    with path.open("w", encoding="utf-8", newline="") as out:
        writer = csv.writer(out, lineterminator="\n")
        writer.writerow(CSV_FIELDS)
        for f in facilities:
            writer.writerow(
                [
                    f.code,
                    f.name,
                    f.district_code,
                    f.category,
                    f.institution_type,
                    "" if f.latitude is None else f"{f.latitude:.6f}",
                    "" if f.longitude is None else f"{f.longitude:.6f}",
                    f.location_status,
                ]
            )


def sql_text(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def sql_number(value: float | None) -> str:
    return "null" if value is None else f"{value:.6f}"


def migration_sql(facilities: list[Facility]) -> str:
    located = sum(1 for f in facilities if f.latitude is not None)
    rows = ",\n".join(
        "    ("
        + ", ".join(
            [
                sql_text(f.code),
                sql_text(f.name),
                sql_text(f.district_code),
                sql_text(f.category),
                sql_text(f.institution_type),
                sql_number(f.latitude),
                sql_number(f.longitude),
            ]
        )
        + ")"
        for f in facilities
    )
    return (
        "-- Generated by scripts/facility-registry/build_registry.py. Do not edit by hand.\n"
        "-- Source and verification rules: scripts/facility-registry/README.md\n"
        f"-- {len(facilities)} facilities, {located} with a verified location.\n"
        "\n"
        "insert into facilities\n"
        "    (code, name, district_code, category, institution_type, latitude, longitude)\n"
        "values\n"
        f"{rows};\n"
    )


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2
    facilities = build(read_source(Path(argv[1])))
    write_csv(facilities, CSV_PATH)
    MIGRATION_PATH.write_text(migration_sql(facilities), encoding="utf-8", newline="\n")

    statuses = Counter(f.location_status for f in facilities)
    print(f"{len(facilities)} facilities written")
    for status, count in sorted(statuses.items()):
        print(f"  {status:<18} {count}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

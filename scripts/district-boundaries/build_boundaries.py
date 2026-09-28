"""Builds the public map's district outlines from geoBoundaries.

The public dashboard shades Sri Lanka's 25 districts rather than plotting
reports, so it needs their boundaries. CLAUDE.md asks for them from a real
provider, never hand-drawn. This script takes geoBoundaries' simplified ADM2
file for Sri Lanka, pinned to one release, keeps only each district's Sentinel
code and name, and rounds coordinates to four decimal places (about 11 m, far
finer than a district outline needs), so the file the browser downloads is
small.

    python scripts/district-boundaries/build_boundaries.py
    python scripts/district-boundaries/build_boundaries.py --source saved.geojson

Standard library only. See README.md beside this file for the source and its
licence.
"""

from __future__ import annotations

import argparse
import json
import urllib.request
from pathlib import Path

SOURCE_URL = (
    "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/LKA/ADM2/"
    "geoBoundaries-LKA-ADM2_simplified.geojson"
)
OUTPUT = (
    Path(__file__).resolve().parents[2]
    / "frontend/src/features/public/map/districts.geo.json"
)
DECIMALS = 4

# geoBoundaries' names, less " District", to Sentinel's codes (V1__create_districts.sql).
CODES = {
    "Colombo": "CMB",
    "Gampaha": "GMP",
    "Kalutara": "KLT",
    "Kandy": "KDY",
    "Matale": "MTL",
    "Nuwara Eliya": "NEL",
    "Galle": "GAL",
    "Matara": "MTR",
    "Hambantota": "HMB",
    "Jaffna": "JAF",
    "Kilinochchi": "KIL",
    "Mannar": "MNR",
    "Vavuniya": "VAV",
    "Mullaitivu": "MUL",
    "Batticaloa": "BTC",
    "Ampara": "AMP",
    "Trincomalee": "TRC",
    "Kurunegala": "KUR",
    "Puttalam": "PTM",
    "Anuradhapura": "ANU",
    "Polonnaruwa": "POL",
    "Badulla": "BDL",
    "Monaragala": "MON",
    "Ratnapura": "RAT",
    "Kegalle": "KEG",
}


def rounded(coordinates):
    if isinstance(coordinates[0], (int, float)):
        return [round(value, DECIMALS) for value in coordinates]
    return [rounded(part) for part in coordinates]


def build(source: dict) -> dict:
    features = []
    for feature in source["features"]:
        name = feature["properties"]["shapeName"].removesuffix(" District")
        if name not in CODES:
            raise ValueError(f"no Sentinel district is named {name!r}")
        geometry = feature["geometry"]
        features.append(
            {
                "type": "Feature",
                "properties": {"code": CODES[name], "name": name},
                "geometry": {
                    "type": geometry["type"],
                    "coordinates": rounded(geometry["coordinates"]),
                },
            }
        )
    missing = set(CODES.values()) - {f["properties"]["code"] for f in features}
    if missing:
        raise ValueError(f"the source has no outline for {sorted(missing)}")
    features.sort(key=lambda f: f["properties"]["name"])
    return {"type": "FeatureCollection", "features": features}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--source", type=Path, help="a saved copy of the source file")
    args = parser.parse_args()
    if args.source:
        source = json.loads(args.source.read_text(encoding="utf-8"))
    else:
        with urllib.request.urlopen(SOURCE_URL, timeout=60) as response:
            source = json.load(response)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(build(source), separators=(",", ":")) + "\n", encoding="utf-8"
    )
    print(f"Wrote {len(CODES)} districts to {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()

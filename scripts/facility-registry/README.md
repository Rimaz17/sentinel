# Facility registry

Sentinel only accepts reports from facilities in its registry. The registry is
seeded from public Ministry of Health data rather than typed in by hand.

| File | What it is |
|---|---|
| `build_registry.py` | Turns the source list into the two files below |
| `facilities.csv` | The trimmed registry, one row per facility, with the outcome of location verification |
| `backend/api/src/main/resources/db/migration/V3__seed_facilities.sql` | The Flyway migration that loads it, generated from the same records |

## Source

"Ministry of Health Institutions", published by Team Watchdog in the
[Databank Sri Lanka](https://github.com/team-watchdog/databank-sri-lanka)
repository under the Apache License 2.0, sourced from Sri Lanka's Ministry of
Health.

| | |
|---|---|
| File | `datasets/ministry-of-health-institutions/institutions_geo.json` |
| Commit | `144942f97b0bbddb2546504d1b5c2ee9eed894e6` (2022-11-09) |
| SHA-256 | `597eb96c39cdc7079f3d836f6d29990afd8006c4a3ce572cd9c7e2e8557cf33a` |
| Records | 1,736 |

The source file is not committed. It carries Google Places output (place IDs,
viewports, address components) from the geocoding its publishers ran, and
Sentinel keeps none of that. To rebuild:

```bash
curl -LO https://raw.githubusercontent.com/team-watchdog/databank-sri-lanka/144942f97b0bbddb2546504d1b5c2ee9eed894e6/datasets/ministry-of-health-institutions/institutions_geo.json
python scripts/facility-registry/build_registry.py institutions_geo.json
```

Flyway refuses a migration whose checksum has changed, so `V3__seed_facilities.sql`
is frozen once merged. Registry changes after that belong in a new migration.

## What is kept

**Hospitals and MOH offices: 1,501 facilities** (1,149 hospitals of every grade
from teaching hospital to primary medical care unit, and 352 MOH offices). These
are where patients present. The rest of the source is administration offices,
training schools, national campaigns and school dental clinics, none of which
report symptoms.

The project overview quotes 1,505 facilities. The filter above gives 1,501, and
no principled filter reproduces 1,505 exactly, so the registry holds 1,501.

Per facility: the ministry's Health Institution Number as its code, its name,
district, category, institution type and, where verified, its coordinates.

- **District** comes from the ministry's RDHS area code, not from the geocoding.
  There is one RDHS area per district plus Kalmunai, which lies inside Ampara
  district and is mapped there.
- **Codes** are upper-cased: two records carry `Ml` where every other record in
  Mullaitivu has `ML`.
- **Names** are the ministry's own, with whitespace tidied. Many hospitals are
  named only by their town, as in the source.

## Location verification

The source coordinates are machine geocoded and many are wrong: 13 records sit
outside Sri Lanka (Albania, Pakistan, Texas), and 721 records share just 155
points, because the geocoder fell back to a town centre or to a Colombo address
with a similar name. A facility plotted in the wrong district would put its
simulated reports there too, so a coordinate is kept only if it passes all of
these, in order:

| Check | Fails as | Facilities |
|---|---|---|
| The record has coordinates | `missing` | 2 |
| The point is inside Sri Lanka (lat 5.8 to 10.0, lon 79.4 to 82.0) | `outside_sri_lanka` | 3 |
| No other institution in the whole source has the same point | `shared_point` | 645 |
| The geocoded address is in the facility's own district | `wrong_district` | 34 |
| All of the above | `verified` | **817** |

Every district keeps at least eight located facilities (Kilinochchi has the
fewest, Kandy has 72). Facilities that fail stay in the registry with no
location: they still exist and can still submit, but they cannot anchor a point
on a map.

The rule is deliberately strict and costs some genuine locations, including a
few major hospitals whose point another record also uses. When district
boundary polygons arrive for the public map, a point-in-polygon check can
replace the geocoder's own district name and some of these can be recovered.

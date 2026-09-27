# 0006, Facility locations are verified before use

Status: accepted · 2026-09-27

## Context

The facility registry is seeded from the Ministry of Health institution list
published by Team Watchdog. Names, types, institution numbers and RDHS areas are
the ministry's. The coordinates are not: they were produced by running each name
through Google's geocoder, and many are wrong. Thirteen records sit outside Sri
Lanka, and 721 records share just 155 points, because the geocoder fell back to a
town centre or matched a Colombo address with a similar name. Rural Anuradhapura
hospitals, for example, sit on the National Hospital in Colombo.

A facility's location matters twice. The simulator places each report near its
facility, so a misplaced facility moves its reports to another district's map;
and Phase 6 clusters reports geographically, where a false pile-up at a fallback
point would look like an outbreak.

## Decision

The registry build (`scripts/facility-registry/build_registry.py`) keeps a
coordinate only if it is present, inside Sri Lanka, not shared with any other
institution in the source, and geocoded into the facility's own district. Every
facility is kept; one that fails simply has no location. The outcome for each
facility is recorded in `facilities.csv`, and the rules and counts in that
folder's README.

Of 1,501 facilities, 817 keep a location, at least eight in every district.
Facilities without one can still submit reports; the simulator draws its reports
only from located facilities.

No Google identifiers (place IDs, viewports, address components) are kept.

## Consequences

- Maps and clustering start from locations that are at least plausible, and a
  bad point cannot quietly manufacture a cluster.
- Some genuine locations are lost, including a few major hospitals whose point
  another record shares. The simulated load in those districts falls on the
  remaining facilities.
- The district check trusts the geocoder's own district name. When district
  boundary polygons arrive for the public map, a point-in-polygon check can
  replace it and may recover some locations.

## Alternatives considered

- **Keep every coordinate.** Simplest, but close to half the registry would sit
  on a point that fails these checks, a great many of them piled onto a handful
  of points in Colombo.
- **Re-geocode the list with an open geocoder.** Nominatim discourages bulk
  geocoding, and in any case institution names are ambiguous (many hospitals are
  named only by their town), so the results would need the same verification.
- **Place unverified facilities at their district's centre.** It invents a
  location, and every such facility in a district would share one point, the
  very artefact being removed.

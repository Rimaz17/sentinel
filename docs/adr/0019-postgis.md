# 0019, PostGIS for report and facility locations

Status: accepted · 2026-10-02

## Context

Phase 6 adds a geographic check (ADR 0020) that has to ask distance questions
of the stored reports: how many of a series' reports lie within 2 km of a point
this week, and how many in the eight weeks before; and which facility is
nearest a point. The overview names PostgreSQL with PostGIS for "distance
queries such as reports within 2 km", and the working rules say PostGIS handles
all spatial queries. Until now the database was plain PostgreSQL 17, and a
report's location was two `numeric(6, 3)` columns rounded to about 110 m at
ingestion (V4).

## Decision

- **The PostGIS image, same PostgreSQL.** Local compose, the API's
  Testcontainers and the detector's test database all run
  `postgis/postgis:17-3.5-alpine`: PostgreSQL 17 with PostGIS 3.5. It is the
  same server build as `postgres:17-alpine`, so a data volume written by the
  plain image opens unchanged; this was tried on a volume first migrated by the
  plain image, and V14 to V17 then applied and gave the existing reports their
  points. On the plain image, V14 fails with "extension postgis is not
  available", which says what is wrong.
- **The extension is created by migration** (V14, `create extension if not
  exists postgis`), so Flyway stays the only schema authority. The image's own
  start-up script also creates PostGIS, with its topology and Tiger geocoder
  extensions, in a database it initialises itself; Sentinel uses none of
  those, and a volume from the plain image never gets them.
- **`geography(Point, 4326)`, generated from the stored coordinates.** Reports
  (V15) and facilities (V16) each gain a `location` column generated from their
  latitude and longitude, null where there is none, with a GiST index. Nothing
  that writes a report or seeds a facility changes, a point can never disagree
  with its coordinates, and a report's point carries the same 110 m rounding.
  `geography` measures in metres on the Earth, which is what "within 2 km"
  means, without choosing a projection for the island.
- **Distances on a sphere where they must agree with DBSCAN.** The ring counts
  use `st_dwithin(..., false)`: the sphere of mean radius 6,371,008.8 m rather
  than the WGS 84 spheroid. scikit-learn's haversine works on that same sphere,
  so what DBSCAN calls near and what the ring counts as inside agree; a test
  checks them against each other on 300 points. Over 2 km the two models
  differ by a few metres at most, less than the stored rounding.
- **The nearest facility is a KNN query**, `order by location <-> point limit
  1` on the facilities' index, within the alert's own district.
- **No spatial types in the API.** The Spring Boot service only reads clusters
  the detector has written, as plain numbers, so it takes no Hibernate Spatial
  or JTS dependency. Its entities do not map the generated columns, which
  `ddl-auto: validate` allows.

## Consequences

- Anyone running the stack pulls a larger image (729 MB against 424 MB on
  disk, as Docker reports them here) and must recreate the database container once
  (`docker compose ... up -d` does it); their data volume is kept.
- A managed PostgreSQL without PostGIS cannot run Sentinel from Phase 6. Every
  mainstream managed PostgreSQL offers it as an extension.
- The `location` columns cost a little storage and a spatial index per table;
  at the simulated national rate of about 1,100 reports a week that is
  negligible.
- Report and facility coordinates now exist twice, as numbers and as points,
  but the points are derived and can never be written on their own.

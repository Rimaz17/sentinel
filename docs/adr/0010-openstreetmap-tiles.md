# 0010, OpenStreetMap tiles, since CARTO's now need a key

Status: accepted · 2026-09-28

## Context

The stack fixes the map as Leaflet with free OpenStreetMap or CARTO tiles, no API
key and no billing, and never Google Maps. CARTO's light basemap was the first
choice for the dashboard: near-white, grey roads, close to the page's own paper
and ink.

When the dashboard first ran against it, on 2026-09-28, every CARTO tile came
back stamped "API KEY REQUIRED · carto.com/basemaps/apikey". The request still
answers 200, so nothing fails; the watermark is simply drawn across the map.

## Decision

Use OpenStreetMap's own tile server, `tile.openstreetmap.org`, which serves tiles
without a key under the OSM Tile Usage Policy. Its standard style is colourful,
so the tile layer is drawn in greyscale at 60% opacity over the paper ground:
roads, towns and coastline stay legible, and the only colour on the map is the
symptom groups'. Attribution to OpenStreetMap contributors is shown on the map
and in the dashboard's footer.

## Consequences

- Still no key, no billing and no Google dependency, as the stack requires.
- The OSM Tile Usage Policy suits light use such as a demonstration and forbids
  heavy use. A real deployment would run its own tile server or pay a provider;
  that belongs with the deployment work in Phase 7.
- The tiles are fetched from a third party by the viewer's browser, which learns
  the approximate area being viewed. Only map tiles are requested, never report
  data.

## Alternatives considered

- **CARTO with a key.** Needs an account and a secret in the frontend, which the
  project avoids.
- **Another keyless provider.** Most free providers now require a key as well;
  OSM's own server is the reference service and is named in the specification.
- **Self-hosted tiles.** The right answer for production, and too heavy for
  Phase 3.

# District boundaries

The public dashboard shades Sri Lanka's 25 districts. Their outlines come from
[geoBoundaries](https://www.geoboundaries.org), the `gbOpen` ADM2 release for Sri
Lanka, pinned to commit `9469f09` of `wmgeolab/geoBoundaries`, in its simplified
form.

| | |
|---|---|
| Source | OpenStreetMap, via Wambacher's OSM boundaries, as geoBoundaries republishes it |
| Licence | Open Data Commons Open Database License 1.0; © OpenStreetMap contributors |
| Year represented | 2017 |
| Units | 25, matching Sentinel's districts one for one by name |

`build_boundaries.py` downloads that file, keeps only each district's Sentinel
code and name, rounds coordinates to four decimal places (about 11 m), checks that
all 25 districts are present and nothing else is, and writes
`frontend/src/features/public/map/districts.geo.json`:

```bash
python scripts/district-boundaries/build_boundaries.py
```

The outlines are for shading a map, not for deciding which district a place lies
in: every report's district comes from its facility's record in the registry.

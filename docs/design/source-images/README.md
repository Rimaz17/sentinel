# Source images

Full-resolution originals for the landing page figures. These are **not shipped** ,
they are archived here so the web assets can be regenerated if sizes or formats
change.

| File | Source | Appears |
|---|---|---|
| `dengue-vector.jpg` | 1110×944, cut-out | Hero, right column |
| `two-views.jpg` | 2048×2048, opaque | Detection section, left column |
| `network-map.jpg` | 1024×1029, cut-out | Entry paths, right column |
| `privacy-fields.jpg` | 2644×1600, cut-out icon sheet | Privacy section, right column |

Three of these are cut-outs that were exported as JPEG, so their transparency
arrived baked in as a checkerboard. The build script keys it back out and trims
each one to its own artwork. The icon sheet needs a different key from the
drawings, and its two rows are restacked to close the gap between them, see
`## Imagery` in `../DESIGN.md`.

The shipped derivatives live in `frontend/src/assets/` as WebP at several widths.
Regenerate them with:

```bash
python scripts/build-images.py
```

All three are illustrations. None of them is a rendering of real or simulated
system output, and the page captions say so.

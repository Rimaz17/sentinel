# Source images

Full-resolution originals for the landing page figures. These are **not shipped** —
they are archived here so the web assets can be regenerated if sizes or formats
change.

| File | Used as | Appears |
|---|---|---|
| `dengue-vector.jpg` | 2816×1536 | Full-bleed figure below the hero |
| `two-views.jpg` | 1024×1054 | Inside "An outbreak rarely announces itself" |
| `network-map.jpg` | 764×768 | Inside "See what is happening in your district" |

The shipped derivatives live in `frontend/src/assets/` as WebP at several widths.
Regenerate them with:

```bash
python scripts/build-images.py
```

All three are illustrations. None of them is a rendering of real or simulated
system output, and the page captions say so.

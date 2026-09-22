#!/usr/bin/env python3
"""Regenerate the landing page's web images from the archived originals.

The originals in docs/design/source-images/ are multi-megabyte JPEGs. Shipping
them would be a real cost to the people this page is aimed at, who arrive on
low-end phones over mobile data. This produces WebP at the widths the layout
actually asks for, which a browser then picks between via srcset.

Usage:  python scripts/build-images.py
Needs:  Pillow  (pip install Pillow)
"""

from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required: pip install Pillow")

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "docs" / "design" / "source-images"
OUT_DIR = ROOT / "frontend" / "src" / "assets"

# WebP quality. 80 is visually indistinguishable from the source for these
# images and roughly fifteen times smaller.
QUALITY = 80

# Each source, and the rendered widths the layout can ask for. A width larger
# than the source is skipped rather than upscaled.
SPEC: dict[str, list[int]] = {
    # Full-bleed below the hero: spans the viewport, so it needs retina widths.
    "dengue-vector": [960, 1440, 2048, 2816],
    # Roughly a half-column figure.
    "two-views": [640, 1024],
    # Roughly a third-column figure.
    "network-map": [512, 764],
}


def main() -> int:
    if not SOURCE_DIR.is_dir():
        sys.exit(f"No source directory at {SOURCE_DIR}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    total = 0.0

    for base, widths in SPEC.items():
        src = SOURCE_DIR / f"{base}.jpg"
        if not src.is_file():
            sys.exit(f"Missing source image: {src}")

        with Image.open(src) as im:
            im = im.convert("RGB")
            for width in widths:
                if width > im.width:
                    print(f"  skip {base}-{width}: source is only {im.width}px wide")
                    continue
                height = round(im.height * width / im.width)
                out = OUT_DIR / f"{base}-{width}.webp"
                im.resize((width, height), Image.LANCZOS).save(
                    out, "WEBP", quality=QUALITY, method=6
                )
                kb = out.stat().st_size / 1024
                total += kb
                print(f"  {out.name:28s} {width}x{height:<5d} {kb:7.1f} KB")

    print(f"  {'total':28s} {'':11s} {total:7.1f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

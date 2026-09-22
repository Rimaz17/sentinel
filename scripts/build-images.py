#!/usr/bin/env python3
"""Build the landing page's web images from the archived originals.

Two of the three originals are cutouts that were exported as JPEG, so their
transparency arrived baked in as a checkerboard. This keys that back out, trims
the result to the artwork's own bounding box, and writes WebP at the widths the
layout asks for.

Trimming matters as much as keying: the exports carry a wide empty margin, and
left in, that margin becomes whitespace inside the page's columns.

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

QUALITY = 80

# `key`: the artwork is dark on a light checkerboard, so anything at or above
# `dark` (the darker checker square) is background and anything below it is ink.
# `cut` discards the last few percent of opacity, which is JPEG ringing around
# the checker edges rather than artwork — without it a faint checker ghost
# survives into the page.
SPEC = {
    "dengue-vector": dict(
        widths=[640, 960, 1280],
        key=dict(dark=171.0, ink=38.0, cut=0.10),
        trim=0.02,
    ),
    "network-map": dict(
        widths=[640, 960, 1280],
        key=dict(dark=186.0, ink=40.0, cut=0.10),
        trim=0.02,
    ),
    # Already a finished opaque artwork; nothing to key or trim.
    "two-views": dict(widths=[640, 960, 1280, 1600], key=None, trim=None),
}


def key_checkerboard(im: Image.Image, dark: float, ink: float, cut: float) -> Image.Image:
    """Recover straight alpha for dark artwork composited over a light checker."""
    im = im.convert("RGB")
    w, h = im.size
    src = im.load()
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dst = out.load()
    span = dark - ink
    scale = 1.0 / (1.0 - cut)

    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            lum = (r * 299 + g * 587 + b * 114) / 1000.0
            a = (dark - lum) / span
            if a <= cut:
                continue
            a = min(1.0, (a - cut) * scale)
            # Undo the composite against the checker to get the artwork's own colour.
            base = (1.0 - a) * dark
            dst[x, y] = (
                int(max(0, min(255, (r - base) / a))),
                int(max(0, min(255, (g - base) / a))),
                int(max(0, min(255, (b - base) / a))),
                int(round(a * 255)),
            )
    return out


def trim_to_artwork(im: Image.Image, margin: float) -> Image.Image:
    """Crop to the alpha bounding box, keeping a small proportional margin."""
    box = im.getbbox()
    if box is None:
        return im
    left, top, right, bottom = box
    mx = int((right - left) * margin)
    my = int((bottom - top) * margin)
    return im.crop(
        (
            max(0, left - mx),
            max(0, top - my),
            min(im.width, right + mx),
            min(im.height, bottom + my),
        )
    )


def main() -> int:
    if not SOURCE_DIR.is_dir():
        sys.exit(f"No source directory at {SOURCE_DIR}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    total = 0.0
    for base, spec in SPEC.items():
        src = SOURCE_DIR / f"{base}.jpg"
        if not src.is_file():
            sys.exit(f"Missing source image: {src}")

        im = Image.open(src)
        if spec["key"]:
            print(f"  {base}: keying checkerboard ...")
            im = key_checkerboard(im, **spec["key"])
            before = im.size
            im = trim_to_artwork(im, spec["trim"])
            print(f"           trimmed {before[0]}x{before[1]} -> {im.size[0]}x{im.size[1]}")
        else:
            im = im.convert("RGB")

        for width in spec["widths"]:
            if width > im.width:
                continue
            height = round(im.height * width / im.width)
            out = OUT_DIR / f"{base}-{width}.webp"
            im.resize((width, height), Image.LANCZOS).save(
                out, "WEBP", quality=QUALITY, method=6
            )
            kb = out.stat().st_size / 1024
            total += kb
            print(f"  {out.name:26s} {width}x{height:<5d} {kb:7.1f} KB")

    print(f"  {'total':26s} {'':11s} {total:7.1f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

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
    from PIL import Image, ImageFilter
except ImportError:
    sys.exit("Pillow is required: pip install Pillow")

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "docs" / "design" / "source-images"
OUT_DIR = ROOT / "frontend" / "src" / "assets"

QUALITY = 80

# `key`: the artwork is dark on a light checkerboard, so anything at or above
# `dark` (the darker checker square) is background and anything below it is ink.
# `cut` discards the last few percent of opacity, which is JPEG ringing around
# the checker edges rather than artwork, without it a faint checker ghost
# survives into the page.
SPEC = {
    "dengue-vector": dict(
        widths=[640, 768, 960, 1280],
        key=dict(dark=171.0, ink=38.0, cut=0.10),
        trim=0.02,
    ),
    "network-map": dict(
        widths=[640, 768, 960, 1280],
        key=dict(dark=186.0, ink=40.0, cut=0.10),
        trim=0.02,
    ),
    # Already a finished opaque artwork; nothing to key or trim.
    "two-views": dict(widths=[640, 768, 960, 1280, 1600], key=None, trim=None),
    # An icon sheet, also exported as a cut-out. Its artwork is opaque rather
    # than a dark wash, so it is keyed by value instead: the checkerboard takes
    # exactly two levels, and anything outside those two bands is artwork. A
    # darkness key would erase the grey fills, which sit just below the darker
    # checker square.
    "privacy-fields": dict(
        widths=[640, 768, 960, 1280],
        key=None,
        trim=0.01,
        bands=dict(bands=[(177, 199), (214, 242)], opening=2),
        # The sheet carries a tall empty gap between its two rows. Left in, it
        # ships as dead space inside the page's column, so the rows are found
        # and recomposed against a fixed gap.
        rows=dict(gap=110),
    ),
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


def key_by_bands(im: Image.Image, bands, opening: int) -> Image.Image:
    """Opaque artwork over a checkerboard, keyed by value.

    The background takes exactly two levels, so a pixel outside both bands is
    artwork and keeps its own colour. A morphological opening then clears the
    JPEG speckle that survives between the bands.
    """
    im = im.convert("RGB")
    w, h = im.size
    src = im.load()
    mask = Image.new("L", (w, h), 0)
    mk = mask.load()

    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            lum = (r * 299 + g * 587 + b * 114) / 1000.0
            if not any(lo <= lum <= hi for lo, hi in bands):
                mk[x, y] = 255

    for _ in range(opening):
        mask = mask.filter(ImageFilter.MinFilter(3))
    for _ in range(opening):
        mask = mask.filter(ImageFilter.MaxFilter(3))

    out = im.convert("RGBA")
    out.putalpha(mask)
    return out


def recompose_rows(im: Image.Image, gap: int) -> Image.Image:
    """Find the sheet's rows of artwork and restack them against a fixed gap."""
    alpha = im.getchannel("A")
    w, h = im.size
    px = alpha.load()

    filled = []
    for y in range(h):
        row = False
        for x in range(0, w, 3):
            if px[x, y] > 0:
                row = True
                break
        filled.append(row)

    bands, start = [], None
    for y, on in enumerate(filled):
        if on and start is None:
            start = y
        elif not on and start is not None:
            if y - start > 20:
                bands.append((start, y))
            start = None
    if start is not None and h - start > 20:
        bands.append((start, h))

    if len(bands) < 2:
        return im

    strips = [im.crop((0, top, w, bottom)) for top, bottom in bands]
    total = sum(s.height for s in strips) + gap * (len(strips) - 1)
    out = Image.new("RGBA", (w, total), (0, 0, 0, 0))
    y = 0
    for s in strips:
        out.paste(s, (0, y))
        y += s.height + gap
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
        if spec.get("bands"):
            print(f"  {base}: keying by value bands ...")
            im = key_by_bands(im, **spec["bands"])
            if spec.get("rows"):
                before = im.size
                im = recompose_rows(im, **spec["rows"])
                print(f"           rows restacked {before[0]}x{before[1]} -> {im.size[0]}x{im.size[1]}")
            im = trim_to_artwork(im, spec["trim"])
            print(f"           trimmed to {im.size[0]}x{im.size[1]}")
        elif spec["key"]:
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

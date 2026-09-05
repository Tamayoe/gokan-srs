#!/usr/bin/env python3
"""Rasterises public/gokan.svg into the favicon files search engines actually fetch.

Run manually when the logo changes; this is not wired into the build:

    python apps/gokan-srs/scripts/build-favicon.py

Why this exists at all, given the site already shipped an SVG favicon: search engines and
their favicon services largely probe `/favicon.ico` at the site root. Nothing was there, so
CloudFront's SPA fallback answered with `index.html` at `200 text/html`, and anything
expecting an image got a web page. That is why DuckDuckGo rendered no icon.

Why Python and Pillow in a Bun repository: the mark draws 語感 as SVG `<text>`, so rasterising
it needs a CJK font at render time. The JS-side SVG rasterisers available here fall back to a
font without CJK coverage and silently emit tofu boxes, which is a worse failure than no icon
because it looks fine until you zoom in. Pillow lets us name a font explicitly and assert the
glyphs measured non-empty before writing anything. It is a rare manual step, so the odd
toolchain is cheaper than making the normal build depend on it.

Geometry mirrors public/gokan.svg exactly (100x100 viewBox, r=44 ring at 2.5 stroke, 34px
text, 2px letter spacing) so the raster and the vector stay the same mark.

The background is opaque white rather than the SVG's transparent, because a favicon is
composited onto whatever chrome the client uses. The indigo mark on transparent disappears
against a dark results page.
"""

import io
import struct
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"

INDIGO = (46, 58, 89, 255)      # #2E3A59, the design system's primary accent
BACKGROUND = (255, 255, 255, 255)

# Ordered by preference. All are mincho/serif faces to match the SVG's 'Noto Serif JP'.
FONT_CANDIDATES = [
    r"C:\Windows\Fonts\yumin.ttf",
    r"C:\Windows\Fonts\msmincho.ttc",
    "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc",
    "/System/Library/Fonts/Hiragino Mincho ProN.ttc",
]

ICO_SIZES = [16, 32, 48]
# Google documents wanting a favicon that is a multiple of 48px square.
PNG_SIZES = [48, 96, 192]
SUPERSAMPLE = 8
TEXT = "語感"


def load_font(pixel_size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if not Path(path).exists():
            continue
        font = ImageFont.truetype(path, pixel_size)
        if font.getmask(TEXT).size[0] > 0:
            return font
    raise SystemExit(
        "No CJK font found. Install Noto Serif CJK or edit FONT_CANDIDATES.\n"
        "Writing an icon without one would silently produce tofu boxes."
    )


def render(size: int) -> Image.Image:
    """One icon, drawn oversampled then downscaled so the thin ring survives at 16px."""
    s = size * SUPERSAMPLE
    scale = s / 100.0

    image = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    # Opaque disc, then the seal ring on top, matching the SVG's r=44 / stroke 2.5.
    draw.ellipse([(0, 0), (s - 1, s - 1)], fill=BACKGROUND)
    inset = (50 - 44) * scale
    draw.ellipse(
        [(inset, inset), (s - inset, s - inset)],
        outline=INDIGO,
        width=max(1, round(2.5 * scale)),
    )

    font = load_font(round(34 * scale))
    tracking = 2 * scale

    # Pillow has no letter-spacing, so the glyphs are placed one at a time and the run is
    # centred as a whole. Measuring each glyph rather than assuming a square em keeps the
    # pair optically centred instead of drifting right.
    widths = [draw.textlength(ch, font=font) for ch in TEXT]
    total = sum(widths) + tracking * (len(TEXT) - 1)
    ascent, descent = font.getmetrics()
    x = (s - total) / 2
    y = (s - (ascent + descent)) / 2

    for ch, width in zip(TEXT, widths):
        draw.text((x, y), ch, font=font, fill=INDIGO)
        x += width + tracking

    return image.resize((size, size), Image.LANCZOS)


def write_ico(path: Path, images: list[Image.Image]) -> None:
    """Packs one .ico holding a separately drawn image per size.

    Written by hand rather than via Pillow's ICO save, which only accepts a single source
    image and resizes it internally: the 16px entry would then be a downscale of the 48px
    one, and the ring plus two dense kanji turn to mush at that size. Drawing each entry at
    its own scale is the whole reason the ring is still visible in a browser tab.

    Entries carry PNG payloads, which every browser since IE9 and every search engine
    favicon service reads.
    """
    payloads = []
    for image in images:
        buffer = io.BytesIO()
        image.save(buffer, format="PNG", optimize=True)
        payloads.append(buffer.getvalue())

    header = struct.pack("<HHH", 0, 1, len(images))
    entry_size = 16
    offset = len(header) + entry_size * len(images)

    entries = bytearray()
    for image, payload in zip(images, payloads):
        width, height = image.size
        entries += struct.pack(
            "<BBBBHHII",
            width if width < 256 else 0,
            height if height < 256 else 0,
            0,          # palette size, 0 for truecolour
            0,          # reserved
            1,          # colour planes
            32,         # bits per pixel
            len(payload),
            offset,
        )
        offset += len(payload)

    path.write_bytes(bytes(header) + bytes(entries) + b"".join(payloads))


def main() -> None:
    if not PUBLIC.exists():
        raise SystemExit(f"{PUBLIC} not found")

    icons = {size: render(size) for size in sorted(set(ICO_SIZES + PNG_SIZES))}

    ico_path = PUBLIC / "favicon.ico"
    write_ico(ico_path, [icons[n] for n in ICO_SIZES])
    print(f"wrote {ico_path.relative_to(ROOT)} ({', '.join(f'{n}x{n}' for n in ICO_SIZES)})")

    for size in PNG_SIZES:
        path = PUBLIC / f"favicon-{size}x{size}.png"
        icons[size].save(path, format="PNG", optimize=True)
        print(f"wrote {path.relative_to(ROOT)}")


if __name__ == "__main__":
    sys.exit(main())

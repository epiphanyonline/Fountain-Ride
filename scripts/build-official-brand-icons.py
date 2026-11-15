"""Regenerate compact PNG icon sizes from Fountain Ride's approved flowing F mark.

Requires: Pillow, CairoSVG. Outputs deterministic white-backed black artwork.
No external images or fonts are required. Never uploads secrets.
"""
from pathlib import Path
import io
import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SVG_PATH = ROOT / "public" / "fountain-ride-mark.svg"
SVG_DATA = SVG_PATH.read_bytes()

for size in (192, 512):
    png = cairosvg.svg2png(bytestring=SVG_DATA, output_width=size, output_height=size)
    icon = Image.open(io.BytesIO(png)).convert("RGB")
    target = ROOT / "public" / f"icon-{size}.png"
    icon.save(target, format="PNG", optimize=True)
    print(f"Updated {target.relative_to(ROOT)}: {target.stat().st_size} bytes")

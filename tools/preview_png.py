"""
preview_png.py — rasterizes a recorded pixel-office frame into a PNG for eyeballing.
Owner lane: QA/CENTUM
Run:         python3 tools/preview_png.py /tmp/frame.json /tmp/preview.png [--scale 3]
Inputs:      JSON from tools/render_office_preview.js: {w,h,rects:[[x,y,w,h,color,alpha],...]}
Outputs:     PNG (nearest-neighbour upscaled)
Why:         no browser in the sandbox; this is how the pixel art is checked before shipping.
Built: 2026-09-23 by Manager
"""
import argparse
import json
import struct
import zlib
from pathlib import Path

DEFAULT_BG = (11, 18, 27)


def color_alpha(c):
    """Alpha embedded in an rgba() string (the JS harness multiplies it in, this is a safety net)."""
    c = (c or "").strip()
    if c.startswith("rgba("):
        try:
            return float(c[5:-1].split(",")[3])
        except Exception:
            return 1.0
    return 1.0


def parse_color(c):
    c = (c or "#000").strip()
    if c.startswith("#"):
        if len(c) == 4:
            c = "#" + "".join(ch * 2 for ch in c[1:])
        return tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))
    if c.startswith("rgba("):
        parts = c[5:-1].split(",")
        return tuple(int(float(p)) for p in parts[:3])
    if c.startswith("rgb("):
        parts = c[4:-1].split(",")
        return tuple(int(float(p)) for p in parts[:3])
    return (255, 0, 255)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("frame")
    ap.add_argument("out")
    ap.add_argument("--scale", type=int, default=3)
    ap.add_argument("--bg", default="#0b121b")
    args = ap.parse_args()

    data = json.loads(Path(args.frame).read_text())
    W, H = data["w"], data["h"]
    canvas = [[list(parse_color(args.bg)) for _ in range(W)] for _ in range(H)]

    for x, y, w, h, color, alpha in data["rects"]:
        rgb = parse_color(color)
        a = (0.0 if alpha is None else float(alpha)) * color_alpha(color)
        if a <= 0.01 or w <= 0 or h <= 0:
            continue
        for yy in range(max(0, y), min(H, y + h)):
            row = canvas[yy]
            for xx in range(max(0, x), min(W, x + w)):
                dst = row[xx]
                for i in range(3):
                    dst[i] = int(dst[i] * (1 - a) + rgb[i] * a)

    S = args.scale
    rows = []
    for yy in range(H):
        row = bytearray([0])
        for xx in range(W):
            r, g, b = canvas[yy][xx]
            row += bytes([r, g, b]) * S
        rows.append(bytes(row) * S)
    raw = b"".join(rows)

    def chunk(tag, payload):
        return struct.pack(">I", len(payload)) + tag + payload + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", W * S, H * S, 8, 2, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    Path(args.out).write_bytes(png)
    print(f"wrote {args.out} ({W*S}x{H*S})")


if __name__ == "__main__":
    main()

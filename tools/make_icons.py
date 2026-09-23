"""
make_icons.py — draws the office app icon (gold 'C' badge on a dark tile) as PNGs.
Owner lane: QA/CENTUM
Run:         python3 tools/make_icons.py
Inputs:      nothing
Outputs:     app/icons/icon-192.png, icon-512.png, apple-touch-icon.png
Ledger:      none
Known issues: pure-stdlib PNG writer (no PIL in the sandbox). Anti-aliasing is done by
              3x supersampling, so the edges are clean at phone sizes.
Techniques used: OFFICE.md §5.8 (build artifacts live in the repo)
Built: 2026-09-23 by Manager
"""
import math
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "app" / "icons"
BG = (13, 20, 29)
GOLD = (245, 185, 66)
GOLD_D = (214, 150, 32)


def rounded_tile(px, size, radius):
    """Return True if (x, y) is inside a rounded square covering the whole canvas."""
    r = radius
    x = min(px[0], size - 1 - px[0])
    y = min(px[1], size - 1 - px[1])
    if x >= r or y >= r:
        return True
    return (r - x) ** 2 + (r - y) ** 2 <= r * r


def draw(size):
    ss = 3  # supersample
    S = size * ss
    cx = cy = (S - 1) / 2
    ring_r = S * 0.29
    ring_w = S * 0.082
    gap_half = 34.0  # degrees of the C opening, centred on the right
    dot_r = S * 0.052
    acc = [[0, 0, 0, 0] for _ in range(size * size)]

    for y in range(S):
        for x in range(S):
            if not rounded_tile((x, y), S, S * 0.22):
                continue
            dx, dy = x - cx, y - cy
            d = math.hypot(dx, dy)
            # gold ring with a gap on the right -> a "C"
            angle = math.degrees(math.atan2(dy, dx))
            in_gap = -gap_half < angle < gap_half
            on_ring = abs(d - ring_r) <= ring_w / 2 and not in_gap
            on_dot = d <= dot_r
            if on_ring or on_dot:
                t = (y / S) * 0.85 + 0.15  # vertical gradient on the gold
                col = [int(GOLD[i] * (1 - t) + GOLD_D[i] * t) for i in range(3)] + [255]
            else:
                col = list(BG) + [255]
            k = (y // ss) * size + (x // ss)
            a = acc[k]
            for i in range(4):
                a[i] += col[i]

    n = ss * ss
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            a = acc[y * size + x]
            row += bytes([a[i] // n for i in range(4)])
        rows.append(bytes(row))
    raw = b"".join(rows)

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    return png


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for size, name in ((192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")):
        (OUT / name).write_bytes(draw(size))
        print(f"wrote app/icons/{name} ({size}x{size})")


if __name__ == "__main__":
    main()

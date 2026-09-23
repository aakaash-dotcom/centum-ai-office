"""
serve_office.py — serves the office app on 0.0.0.0:4173 for phone/LAN/preview use.
Owner lane: QA/CENTUM
Run:         python3 tools/serve_office.py [--port 4173] [--build]
Inputs:      app/ (index.html, styles.css, app.js, data/office.json)
Outputs:     HTTP server (no writes)
Notes:       rebuilds office.json on start unless --no-build; sends no-store so a phone
             refresh always shows the latest state; binds 0.0.0.0 (never 127.0.0.1) so
             LAN and the sandbox preview both work.
Built: 2026-09-23 by Manager
"""
import argparse
import http.server
import socketserver
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app"


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("  %s\n" % (fmt % args))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=4173)
    ap.add_argument("--no-build", action="store_true")
    args = ap.parse_args()

    if not args.no_build:
        subprocess.run([sys.executable, str(ROOT / "tools" / "build_office_data.py")], check=False)
        subprocess.run([sys.executable, str(ROOT / "tools" / "build_standalone.py")], check=False)

    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("0.0.0.0", args.port), Handler) as httpd:
        print(f"CENTUM AI Office app serving on http://0.0.0.0:{args.port}  (Ctrl+C to stop)")
        httpd.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

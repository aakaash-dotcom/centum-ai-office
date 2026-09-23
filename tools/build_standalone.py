"""
build_standalone.py — packs the whole app into ONE html file (app/index.standalone.html).
Owner lane: QA/CENTUM
Run:         python3 tools/build_standalone.py   (after build_office_data.py)
Inputs:      app/index.html, app/styles.css, app/app.js, app/data/office.json
Outputs:     app/index.standalone.html
Why:         a single file can be opened from anywhere - phone download, WhatsApp, a
             USB cable, or GitHub's raw view - with no server and no internet.
Techniques used: OFFICE.md §5.8 (artifacts in the repo, never only in a session)
Built: 2026-09-23 by Manager
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app"
OUT = APP / "index.standalone.html"

html = (APP / "index.html").read_text(encoding="utf-8")
css = (APP / "styles.css").read_text(encoding="utf-8")
js = (APP / "app.js").read_text(encoding="utf-8")
pixel = (APP / "office.js").read_text(encoding="utf-8")
data = json.loads((APP / "data" / "office.json").read_text(encoding="utf-8"))

# strip the external assets, inline everything
html = re.sub(r'<link rel="manifest"[^>]*>', "", html)
html = re.sub(r'<link rel="apple-touch-icon"[^>]*>', "", html)
html = re.sub(r'<link rel="icon"[^>]*>', "", html)
html = html.replace('<link rel="stylesheet" href="styles.css">', f"<style>\n{css}\n</style>")

bundle = (
    "window.CENTUM_OFFICE_DATA = "
    + json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    + ";\n"
    + pixel          # pixel office engine first, app.js second
    + "\n"
    + js
)
bundle = bundle.replace("</script>", "<\\/script>")
html = re.sub(
    r'<script src="office\.js(\?[^"]*)?"></script>\s*'
    r'<script src="data/office\.data\.js(\?[^"]*)?"[^>]*></script>\s*'
    r'<script src="app\.js(\?[^"]*)?"></script>',
    lambda _m: f"<script>\n{bundle}\n</script>",  # lambda: keep JS backslashes literal
    html,
)
if '<script src=' in html:
    raise SystemExit("ERROR: standalone build left external script tags behind: " + html[:400])
html = html.replace("<title>CENTUM AI Office</title>",
                    "<title>CENTUM AI Office</title>\n<!-- single-file build: no server, no internet needed -->")
OUT.write_text(html, encoding="utf-8")
print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1024:.0f} KB)")

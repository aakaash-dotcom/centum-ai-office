"""
secret_guard.py — fail the build if an Apps Script URL/deployment id or the
client files are ever committed.

Per §7 of HANDOVER: "Never paste the secret into a prompt, a task file, a log,
or another agent's chat." A smoke check fails the build if a deployment id or
a /macros/s/<long> URL appears in any tracked file.

Run as:  python3 tools/secret_guard.py       (exits 1 on violations)
Called by rebuild-office-app.yml before the app builds.
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Patterns that MUST NOT appear in any tracked file
BANNED_PATTERNS = [
    (re.compile(r"/macros/s/[A-Za-z0-9_-]{20,}"), "Apps Script /exec URL"),
    (re.compile(r"AKfycb[A-Za-z0-9_-]{20,}"),       "Apps Script deployment id"),
    (re.compile(r"APPS_SCRIPT_SECRET\s*=\s*['\"][^'\"]+['\"]"), "hard-coded APPS_SCRIPT_SECRET"),
]

# Clients we must never commit (the real secret lives inside them)
BANNED_FILENAMES = {"bridge.py", "drive_upload.py", "drive_client.py", ".env", "credentials.json"}


def ls_files() -> list[Path]:
    out = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, timeout=10)
    if out.returncode != 0:
        return []
    return [ROOT / p for p in out.stdout.splitlines() if p.strip()]


def main() -> int:
    bad = []
    for path in ls_files():
        if path.name in BANNED_FILENAMES and path.exists():
            bad.append(f"{path}: banned filename (client file)")
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        for rx, label in BANNED_PATTERNS:
            m = rx.search(text)
            if m:
                bad.append(f"{path}: contains {label}: {m.group(0)[:40]}…")
                break
    if bad:
        print("SECRET GUARD FAIL — commit blocked:\n")
        for b in bad:
            print("  - " + b)
        print("\nThe Apps Script secret and URL must NEVER enter this public repo.")
        return 1
    print("SECRET GUARD OK — no URLs/deployment ids/secrets in tracked files.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

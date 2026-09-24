"""
drive_call.py — one read-only call to the Apps Script bridge.

Why a POST with text/plain: plain urllib/curl JSON POSTs lose the body across
the Apps Script 302 redirect, and that looks exactly like "invalid secret".
We follow the 302 manually.

Secrets: APPS_SCRIPT_URL and APPS_SCRIPT_SECRET are read from env, never
from a file, never printed. Errors never contain the secret.

Run as a script:
    python3 tools/drive_call.py --action list --path "StudyHub/TN" --out results.json

Or import from drive_inventory.py.

Allowed actions (read-only, strictly enforced):
    info, list, list_files, list_folders, search, ping
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, Iterable, List

ALLOWED_ACTIONS = {"info", "list", "list_files", "list_folders", "search", "ping"}
TIMEOUT_SECONDS = 180
MIN_GAP_SECONDS = 0.25
MAX_RETRIES = 3
BACKOFF_BASE = 2.0

_last_call_at: float = 0.0


class DriveError(RuntimeError):
    """Raised when a Drive call fails. Message never contains the secret."""


def _redact(msg: str, secret: str | None) -> str:
    if not secret:
        return msg
    return msg.replace(secret, "<SECRET>")


def _read_env() -> tuple[str, str]:
    url = os.environ.get("APPS_SCRIPT_URL", "").strip()
    secret = os.environ.get("APPS_SCRIPT_SECRET", "").strip()
    if not url or not secret:
        raise DriveError(
            "APPS_SCRIPT_URL and APPS_SCRIPT_SECRET must be set in the environment."
        )
    if "/macros/s/" not in url or not url.endswith("/exec"):
        raise DriveError("APPS_SCRIPT_URL looks wrong (expect a …/macros/s/…/exec URL).")
    return url, secret


def _throttle() -> None:
    global _last_call_at
    now = time.monotonic()
    wait = MIN_GAP_SECONDS - (now - _last_call_at)
    if wait > 0:
        time.sleep(wait)
    _last_call_at = time.monotonic()


def _post_once(url: str, body: bytes, secret: str) -> Dict[str, Any]:
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={"Content-Type": "text/plain;charset=utf-8"},
    )
    # urllib follows 302 by turning POST into GET and dropping the body.
    # We must stop at 302 and re-POST ourselves.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **kw):
            return None

    opener = urllib.request.build_opener(NoRedirect)
    try:
        with opener.open(req, timeout=TIMEOUT_SECONDS) as resp:
            status = resp.status
            if status in (301, 302, 303, 307, 308):
                loc = resp.headers.get("Location", "")
                if not loc:
                    raise DriveError("302 without a Location header from Apps Script.")
                # follow by re-POSTing to the new URL
                return _post_once(loc, body, secret)
            raw = resp.read()
    except urllib.error.HTTPError as e:
        raw = e.read() if hasattr(e, "read") else b""
        status = e.code
    except urllib.error.URLError as e:
        raise DriveError("network error talking to Apps Script: " + _redact(str(e.reason), secret))

    try:
        text = raw.decode("utf-8", errors="replace")
    except Exception:
        raise DriveError("non-utf8 response from Apps Script")

    if not text.strip():
        raise DriveError(
            f"Apps Script returned an empty body (HTTP {status}). Usual causes: "
            '(a) the deployment is not shared with "Anyone" '
            '(Apps Script > Deploy > Manage deployments > edit > Who has access > Anyone > Deploy); '
            '(b) a /dev URL is being used instead of the deployed /exec URL; '
            '(c) the script threw before answering (check Executions in the Apps Script editor).'
        )

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        snippet = text[:200]
        raise DriveError("Apps Script did not return JSON: " + _redact(snippet, secret))

    if isinstance(data, dict) and data.get("ok") is False:
        err = data.get("error") or data.get("message") or "unknown error"
        raise DriveError("Apps Script error: " + _redact(str(err), secret))

    return data


def call(action: str, path: str = "", extra: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """Make one read-only Drive call, retrying with backoff. Returns parsed JSON."""
    if action not in ALLOWED_ACTIONS:
        raise DriveError(
            f"action {action!r} is not allowed. Allowed: {sorted(ALLOWED_ACTIONS)}."
        )
    url, secret = _read_env()
    payload: Dict[str, Any] = {"action": action, "path": path or "", "secret": secret}
    if extra:
        for k, v in extra.items():
            if k != "secret":
                payload[k] = v
    body = json.dumps(payload).encode("utf-8")

    last_err: DriveError | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        _throttle()
        try:
            return _post_once(url, body, secret)
        except DriveError as e:
            last_err = e
            # do not retry invalid-secret-looking errors forever
            msg = str(e)
            if "invalid secret" in msg.lower() or "wrong secret" in msg.lower():
                raise
            if attempt < MAX_RETRIES:
                time.sleep(BACKOFF_BASE ** attempt)
    assert last_err is not None
    raise last_err


# --------------------------------------------------------------------------- helpers

def entries_of(resp: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Merge `files` + `folders` (also `items`/`data`/`result` if present),
    tagging entries that came from a folders list so callers can tell.

    A first-key-wins merge silently drops every subfolder when files and
    folders share a key — that bug was caught by the self-test. We key on id
    when present, otherwise on name, and folders-entries win the `is_folder`
    tag while preserving other fields.
    """
    out: Dict[Any, Dict[str, Any]] = {}

    def absorb(items: Iterable[Any], *, from_folders: bool) -> None:
        if not items:
            return
        if isinstance(items, dict):
            items = list(items.values())
        for it in items:
            if not isinstance(it, dict):
                continue
            key = it.get("id") or it.get("folderId") or it.get("name") or it.get("title")
            if key is None:
                continue
            existing = out.get(key)
            if existing is None:
                merged = dict(it)
                if from_folders:
                    merged["is_folder"] = True
                else:
                    merged.setdefault("is_folder", False)
                out[key] = merged
            else:
                # merge fields; folders tag sticks once seen
                for k, v in it.items():
                    existing.setdefault(k, v)
                if from_folders:
                    existing["is_folder"] = True

    # the spec says merge files+folders first, then items/data/result fallbacks
    absorb(resp.get("files"), from_folders=False)
    absorb(resp.get("folders"), from_folders=True)
    # alternate shapes the Apps Script may return
    absorb(resp.get("items"), from_folders=False)
    absorb(resp.get("data"), from_folders=False)
    if isinstance(resp.get("result"), list):
        absorb(resp["result"], from_folders=False)
    elif isinstance(resp.get("result"), dict):
        absorb(resp["result"].get("files"), from_folders=False)
        absorb(resp["result"].get("folders"), from_folders=True)
        absorb(resp["result"].get("items"), from_folders=False)

    return list(out.values())


# --------------------------------------------------------------------------- CLI

def main(argv: List[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="One read-only Drive call.")
    p.add_argument("--action", required=True, help="|".join(sorted(ALLOWED_ACTIONS)))
    p.add_argument("--path", default="", help="Drive path or folder id")
    p.add_argument("--query", default="", help="search query (for action=search)")
    p.add_argument("--out", default="", help="output JSON path (stdout if empty)")
    args = p.parse_args(argv)

    try:
        extra: Dict[str, Any] = {}
        if args.query:
            extra["query"] = args.query
        resp = call(args.action, args.path, extra=extra or None)
    except DriveError as e:
        print("ERROR: " + str(e), file=sys.stderr)
        return 2

    text = json.dumps(resp, indent=2, ensure_ascii=False, sort_keys=True)
    if args.out:
        out = Path(args.out)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(text + "\n", encoding="utf-8")
        print(f"wrote {out} ({len(resp_entries(resp))} entries)")
    else:
        print(text)
    return 0


def resp_entries(resp: Dict[str, Any]) -> List[Dict[str, Any]]:
    if "entries" in resp and isinstance(resp["entries"], list):
        return resp["entries"]
    return entries_of(resp)


if __name__ == "__main__":
    sys.exit(main())

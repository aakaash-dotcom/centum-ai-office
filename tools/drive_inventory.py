"""
drive_inventory.py — TASK-101 read-only walk of Drive.

Walks:
    root
    one level down from root (mode=level1)
    depth 2 only inside "Question Papers/" and "StudyHub/"
    Question Papers/ is listed ONCE and each IMMEDIATE child (10th, 12th, ...) is
    listed ONCE. Never a tree, never grandchildren (the full tree times out).

Then re-verifies every path → folder-id pair already present in
ledgers/drive_map.json BY ID, labelling each with its path so stale entries
are obvious.

Honours a hard --budget of API calls; names what it skipped when the budget
runs out. Writes three deliverables:

    reports/DRIVE_INVENTORY.md     30-second summary, per-folder tables,
                                   twenty-files table, "what we do not know yet"
    ledgers/drive_inventory.csv    timestamp,folder_path,folder_id,files,
                                   subfolders,size_note,patterns,flags,listed_by
    ledgers/drive_map.json         folder path → folder id

Suspicion flags:
    check-subject        — pdf present, nobody opened it (no views / no recent activity)
    looks-duplicated     — two entries with the same name/size in one folder
    needs-decision:foreign-brand — name/title suggests Sura/Don/WTS/Surya guide

Uses drive_call.call() and drive_call.entries_of() — never touches the secret
directly. Run from a GitHub runner (where the internet exists), or from any
Agent session that has network access to script.google.com.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# local
sys.path.insert(0, str(Path(__file__).resolve().parent))
import drive_call  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
REPORT_MD = ROOT / "reports" / "DRIVE_INVENTORY.md"
INVENTORY_CSV = ROOT / "ledgers" / "drive_inventory.csv"
DRIVE_MAP = ROOT / "ledgers" / "drive_map.json"


def valid_folder_pairs(value: Any) -> Dict[str, str]:
    """Keep only real folder-path → non-empty string-id pairs."""
    if not isinstance(value, dict):
        return {}
    return {
        path: folder_id
        for path, folder_id in value.items()
        if isinstance(path, str) and path.strip() and not path.startswith("_")
        and isinstance(folder_id, str) and folder_id.strip()
    }


FOREIGN_BRAND_TOKENS = [
    "sura", "don ", "don publication", "wts", "surya", "namma kalvi",
    "padasalai", "telegram", "whatsapp",
]

DEEP_EXCEPTIONS = {"Question Papers", "StudyHub"}
NO_RECURSE = {"Question Papers"}


# --------------------------------------------------------------------------- data model

class Walker:
    def __init__(self, mode: str, budget: int):
        self.mode = mode
        self.budget_left = budget
        self.calls = 0
        self.folders: List[Dict[str, Any]] = []  # {path, id, files, subfolders, size_note, patterns, flags, listed_by, entries}
        self.map: Dict[str, str] = {}
        self.prior_folders: Dict[str, str] = {}
        self.errors: List[str] = []
        self.skipped: List[str] = []
        self.started_at = dt.datetime.now(dt.timezone.utc)
        # Load only real path → id strings for the verification pass. Legacy
        # metadata keys and null/empty folder ids are not Drive folders.
        try:
            prior = json.loads(DRIVE_MAP.read_text(encoding="utf-8")) if DRIVE_MAP.exists() else {}
        except Exception:
            prior = {}
        if not isinstance(prior, dict):
            prior = {}
        self.map = valid_folder_pairs(prior.get("folders", {}))
        self.prior_folders = dict(self.map)

    def _record_error(self, action: str, path: str, message: str) -> None:
        error = f"{action}({path}) failed: {message}"
        self.errors.append(error)
        print(f"  ! {error}", file=sys.stderr)

    # ------- api accounting
    def api(self, action: str, path: str, **extra: Any) -> Optional[Dict[str, Any]]:
        if self.budget_left <= 0:
            raise BudgetExhausted(f"budget exhausted before {action}({path!r})")
        self.budget_left -= 1
        self.calls += 1
        try:
            resp = drive_call.call(action, path, extra=extra or None)
        except drive_call.DriveError as e:
            self._record_error(action, path, str(e))
            return None
        if resp is None:
            self._record_error(action, path, "returned no response")
            return None
        if isinstance(resp, list) and not resp and action == "list":
            # An empty list is a successful listing of an empty folder.
            return {"files": [], "folders": []}
        if not isinstance(resp, dict):
            self._record_error(action, path, "returned an unexpected response")
            return None
        if resp.get("error") or resp.get("ok") is False:
            message = resp.get("error") or resp.get("message") or "request failed"
            self._record_error(action, path, str(message))
            return None
        return resp

    # ------- list helper that builds flags
    def list_folder(self, path: str, folder_id: Optional[str] = None,
                    listed_by: str = "path") -> Optional[Dict[str, Any]]:
        target = folder_id if folder_id else path
        label = path or "<root>"
        print(f"  - list {label}  (budget left: {self.budget_left})")
        resp = self.api("list", target)
        if resp is None:
            self.skipped.append(f"{label} (listing failed)")
            return None

        entries = drive_call.entries_of(resp)
        files = [e for e in entries if not e.get("is_folder")]
        subs = [e for e in entries if e.get("is_folder")]

        flags: List[str] = []
        patterns: List[str] = []
        # flag: pdf present but no "viewed" / "openedByMe" metadata we can see
        pdfs = [e for e in files if str(e.get("name", "")).lower().endswith(".pdf")]
        if pdfs:
            patterns.append(f"{len(pdfs)} pdf")
            nobody = sum(1 for e in pdfs if not e.get("lastViewedByMeTime")
                         and not e.get("viewedByMe"))
            if nobody == len(pdfs) and pdfs:
                flags.append("check-subject")
        # flag: duplicate names / similar sizes
        seen_names: Dict[str, int] = {}
        for e in files:
            n = str(e.get("name", "")).lower()
            seen_names[n] = seen_names.get(n, 0) + 1
        if any(v > 1 for v in seen_names.values()):
            flags.append("looks-duplicated")
        # flag: foreign-brand tokens in titles
        for e in files + subs:
            n = str(e.get("name", "")).lower()
            if any(tok in n for tok in FOREIGN_BRAND_TOKENS):
                flags.append("needs-decision:foreign-brand")
                break
        # size note
        sizes = []
        total_bytes = 0
        for e in files:
            try:
                total_bytes += int(e.get("size") or 0)
            except Exception:
                pass
        size_note = human_bytes(total_bytes) if total_bytes else ("empty" if not files else "mixed")
        if not files and not subs:
            size_note = "empty"

        # Keep only folder path → string-id pairs, never file records.
        listed_folder_id = folder_id or resp.get("folder_id") or resp.get("id")
        if (isinstance(listed_folder_id, str) and listed_folder_id.strip()
                and label.strip() and not label.startswith("_")):
            self.map[label] = listed_folder_id
        for sub in subs:
            sub_name = sub.get("name")
            sub_id = sub.get("id")
            if not isinstance(sub_name, str) or not sub_name.strip():
                continue
            sub_path = f"{path.rstrip('/')}/{sub_name}" if path else sub_name
            if (isinstance(sub_id, str) and sub_id.strip()
                    and sub_path.strip() and not sub_path.startswith("_")):
                self.map[sub_path] = sub_id

        info = {
            "path": label,
            "id": listed_folder_id if isinstance(listed_folder_id, str) else "",
            "files": len(files),
            "subfolders": len(subs),
            "size_note": size_note,
            "patterns": sorted(set(patterns)),
            "flags": sorted(set(flags)),
            "listed_by": listed_by,
            "entries": entries,
            "sub_entries": subs,
        }
        self.folders.append(info)
        return info


class BudgetExhausted(RuntimeError):
    pass


def human_bytes(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.0f} {unit}" if n == int(n) else f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


# --------------------------------------------------------------------------- walk

def walk(mode: str, budget: int) -> Walker:
    w = Walker(mode=mode, budget=budget)
    print(f"Drive inventory — mode={mode} budget={budget}")
    try:
        root = w.list_folder("", listed_by="root")
        if root is None or mode == "root":
            return w
        # level1: one level down from root
        level1_subs = list(root["sub_entries"])
        for sub in level1_subs:
            name = str(sub.get("name", ""))
            sid = sub.get("id")
            if not sid:
                continue
            try:
                info = w.list_folder(name, folder_id=sid, listed_by="level1")
            except BudgetExhausted as be:
                w.skipped.append(f"level1/{name} ({be})")
                print(f"  · budget exhausted at {name}")
                return w
            if info is None:
                continue
            # depth 2 (one level INSIDE the top-level folder, i.e. root depth 2)
            # is allowed for StudyHub/ and Question Papers/. For Question Papers/
            # each immediate child (10th, 12th, ...) is listed exactly once and
            # its own subfolders are only NAMED, never opened — no grandchildren,
            # never a tree. Other folders stop at level1.
            if name not in DEEP_EXCEPTIONS:
                continue
            tag = "qp-child" if name in NO_RECURSE else "depth2"
            seen_children: set = set()
            for sub2 in info["sub_entries"]:
                s2name = str(sub2.get("name", ""))
                s2id = sub2.get("id")
                if not s2id or s2id in seen_children:
                    continue
                seen_children.add(s2id)
                try:
                    w.list_folder(f"{name}/{s2name}", folder_id=s2id, listed_by=tag)
                except BudgetExhausted as be:
                    w.skipped.append(f"{name}/{s2name} ({be})")
                    print(f"  · budget exhausted at {name}/{s2name}")
                    return w
    except BudgetExhausted as be:
        w.skipped.append(str(be))
        print(f"  · budget exhausted: {be}")

    # Verification pass: re-check only the valid path → id pairs read from
    # drive_map.json; newly observed folders were already listed this run.
    print("verifying known ids …")
    for folder_path, fid in w.prior_folders.items():
        if w.budget_left <= 0:
            w.skipped.append(f"verify {folder_path} (budget exhausted)")
            break
        try:
            w.api("info", fid)
        except BudgetExhausted:
            w.skipped.append(f"verify {folder_path} (budget exhausted)")
            break

    return w


# --------------------------------------------------------------------------- writers

def write_csv(w: Walker) -> None:
    INVENTORY_CSV.parent.mkdir(parents=True, exist_ok=True)
    new_file = not INVENTORY_CSV.exists()
    with INVENTORY_CSV.open("a", newline="", encoding="utf-8") as f:
        cols = ["timestamp", "folder_path", "folder_id", "files", "subfolders",
                "size_note", "patterns", "flags", "listed_by"]
        wr = csv.DictWriter(f, fieldnames=cols)
        if new_file:
            wr.writeheader()
        ts = w.started_at.strftime("%Y-%m-%dT%H:%M:%SZ")
        for fol in w.folders:
            wr.writerow({
                "timestamp": ts,
                "folder_path": fol["path"],
                "folder_id": fol["id"],
                "files": fol["files"],
                "subfolders": fol["subfolders"],
                "size_note": fol["size_note"],
                "patterns": ";".join(fol["patterns"]),
                "flags": ";".join(fol["flags"]),
                "listed_by": fol["listed_by"],
            })


def write_map(w: Walker) -> None:
    DRIVE_MAP.parent.mkdir(parents=True, exist_ok=True)
    folders = valid_folder_pairs(w.map)
    payload = {
        "_note": "Folder path to Drive folder id.",
        "_updated": w.started_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "folders": folders,
    }
    DRIVE_MAP.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def write_report(w: Walker) -> None:
    REPORT_MD.parent.mkdir(parents=True, exist_ok=True)
    total_files = sum(f["files"] for f in w.folders)
    total_subs = sum(f["subfolders"] for f in w.folders)
    flagged = [f for f in w.folders if f["flags"]]
    ts = w.started_at.strftime("%Y-%m-%d %H:%M UTC")

    lines: List[str] = []
    lines.append("# Drive Inventory\n")
    lines.append(f"_Generated {ts} by tools/drive_inventory.py — mode **{w.mode}**, "
                 f"**{w.calls}** API calls used._\n")

    # 30-second summary
    lines.append("## 30-second summary\n")
    lines.append(f"- **{len(w.folders)} folders listed**, **{total_files} files**, "
                 f"**{total_subs} subfolders** seen.")
    lines.append(f"- **{len(flagged)} folders** carry suspicion flags (see below).")
    if w.skipped:
        lines.append(f"- **{len(w.skipped)} paths skipped** because the budget ran out or listing failed.")
    lines.append("")

    # per-folder tables
    lines.append("## Folders\n")
    lines.append("| path | files | subfolders | size | patterns | flags | listed by |")
    lines.append("|---|---:|---:|---|---|---|---|")
    for fol in w.folders:
        lines.append(
            f"| `{fol['path'] or '/'}` "
            f"| {fol['files']} | {fol['subfolders']} | {fol['size_note']} "
            f"| {', '.join(fol['patterns']) or '—'} "
            f"| {', '.join(fol['flags']) or '—'} "
            f"| {fol['listed_by']} |"
        )
    lines.append("")

    # twenty-files table — the largest/latest 20 files seen
    all_files: List[Tuple[str, Dict[str, Any]]] = []
    for fol in w.folders:
        for e in fol["entries"]:
            if not e.get("is_folder"):
                all_files.append((fol["path"], e))
    def _size(e: Dict[str, Any]) -> int:
        try:
            return int(e.get("size") or 0)
        except Exception:
            return 0
    all_files.sort(key=lambda pe: _size(pe[1]), reverse=True)
    lines.append("## Twenty largest files\n")
    lines.append("| folder | name | size | id |")
    lines.append("|---|---|---:|---|")
    for folder_path, e in all_files[:20]:
        name = str(e.get("name", "?"))[:60]
        lines.append(
            f"| `{folder_path or '/'}` | {name} | {human_bytes(_size(e))} "
            f"| `{e.get('id', '?')}` |"
        )
    lines.append("")

    # what we do not know yet
    lines.append("## What we do not know yet\n")
    if not w.skipped:
        lines.append("- Nothing was skipped at this budget.\n")
    else:
        for s in w.skipped:
            lines.append(f"- {s}")
        lines.append("")
    not_listed_deep = [f["path"] for f in w.folders
                       if f["listed_by"] == "level1"
                       and f["path"].split("/")[-1] not in DEEP_EXCEPTIONS]
    if not_listed_deep:
        lines.append("- The following level-1 folders were NOT walked deeper (per policy): "
                     + ", ".join(f"`{p}`" for p in not_listed_deep) + ".\n")
    lines.append("- `Question Papers/` was listed once and each immediate child (10th, 12th, ...) once; "
                 "their subfolders are named but NOT opened (no grandchildren - the full walk times out).\n")
    lines.append("- `check-subject` means a PDF is present but no agent session has opened it "
                 "to verify the subject on page 1 — run the page-1 gate before shipping.\n")

    REPORT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


# --------------------------------------------------------------------------- CLI

def main(argv: List[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="TASK-101 read-only Drive inventory.")
    p.add_argument("--mode", choices=["root", "level1"], default="level1")
    p.add_argument("--budget", type=int, default=200)
    args = p.parse_args(argv)

    # quick fail if no secrets, with a message that never prints them
    try:
        drive_call._read_env()
    except drive_call.DriveError as e:
        # When running the self-test we monkeypatch the api; allow running in
        # offline mode when SELFTEST_FAKE is set so build scripts don't crash.
        if os.environ.get("DRIVE_SELFFAKE") != "1":
            print("ERROR: " + str(e), file=sys.stderr)
            return 2

    w = walk(args.mode, args.budget)
    if not w.folders:
        if not w.errors:
            print("ERROR: no folders could be listed.", file=sys.stderr)
        return 3

    write_csv(w)
    write_map(w)
    write_report(w)
    print(f"\nDone. {w.calls} API calls. {len(w.folders)} folders. "
          f"{sum(f['files'] for f in w.folders)} files.")
    print(f"Wrote: {REPORT_MD}")
    print(f"       {INVENTORY_CSV}")
    print(f"       {DRIVE_MAP}")
    return 4 if w.errors else 0


if __name__ == "__main__":
    sys.exit(main())

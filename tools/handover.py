"""
handover.py — replaces a stopped agent with a new one at the same station.

Owner lane: QA/CENTUM (run by the Manager, or by the owner's copy-paste prompt)
Run:         python3 tools/handover.py --slot agent-01 --reason "no log for 95 minutes"
             python3 tools/handover.py --slot agent-01 --reason "..." --status IDLE --dry-run
Inputs:      board.json, agents/<slot>/{current.md,log.md,roster.md,handover.md}
Outputs:     agents/<slot>/current.md   (rewritten for the new generation)
             agents/<slot>/handover.md  (new block appended, never edited)
             agents/<slot>/roster.md    (new row appended)
             agents/<slot>/log.md       (REPLACED / START lines appended)
             board.json                 (occupant generation bumped)
             app/data/office.json       (rebuilt, so the pixel office shows the new occupant)
Why:         the owner's rule - "if any agent stops working then we have to remove that agent
             and add a new agent who will continue from where the old agent left off".
             Removal is never deletion: the station keeps its history, the successor inherits
             the lane, the task, the stop condition, and the exact resume point.
Built: 2026-09-23 by Manager
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOARD = ROOT / "board.json"


def now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def read(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""


def field(text: str, name: str, default: str = "") -> str:
    m = re.search(rf"^{re.escape(name)}:\s*(.*)$", text, re.M)
    return m.group(1).strip() if m else default


def log_tail(path: Path, count: int = 6) -> list[str]:
    lines = [ln.strip() for ln in read(path).splitlines() if ln.strip() and not ln.startswith("#")]
    return lines[-count:]


def main() -> int:
    ap = argparse.ArgumentParser(description="Replace a stopped agent at a station, keeping continuity.")
    ap.add_argument("--slot", required=True, help="station id, e.g. agent-01")
    ap.add_argument("--reason", required=True, help="why the current occupant is being replaced")
    ap.add_argument("--dry-run", action="store_true", help="show what would happen, write nothing")
    args = ap.parse_args()

    slot = args.slot.strip()
    slot_dir = ROOT / "agents" / slot
    if not slot_dir.exists():
        print(f"ERROR: no such station: {slot_dir}")
        return 2

    board = json.loads(read(BOARD) or "{}")
    slots = (board.get("departments", {}).get("content", {}) or {}).get("slots", {})
    if slot not in slots:
        print(f"ERROR: {slot} is not a station in board.json")
        return 2
    slot_board = slots[slot]

    current_path, log_path = slot_dir / "current.md", slot_dir / "log.md"
    roster_path, handover_path = slot_dir / "roster.md", slot_dir / "handover.md"

    occupant = slot_board.get("occupant") or {"id": slot, "generation": 1, "since": slot_board.get("last_log_time") or now_iso()}
    gen = int(occupant.get("generation") or 1)
    new_gen = gen + 1
    new_id = f"{slot}-g{new_gen}"
    stamp = now_iso()

    current = read(current_path)
    status = field(current, "STATUS", slot_board.get("status", "EMPTY"))
    progress = field(current, "PROGRESS", "0%")
    files = field(current, "FILES PRODUCED", "0")
    task = field(current, "TASK", slot_board.get("task_name", ""))
    role = field(current, "ROLE", slot_board.get("role", ""))
    next_step = field(current, "NEXT STEP", "read the task file and continue")
    stop = field(current, "STOP CONDITION", "")
    tail = log_tail(log_path)

    handover_block = f"""
## Handover — gen {gen} -> gen {new_gen} · {stamp}
Reason: {args.reason}
Last status: {status}, progress {progress}, files produced {files}
Role: {role}
Task: {task}
Last log lines:
""" + "\n".join(f"  - {ln}" for ln in tail) + f"""
Next step (what the successor does first): {next_step}
Stop condition: {stop}
Warnings: do not redo anything already proven done on Drive; never delete Drive content;
check the target Drive folder with a list call before starting work.
Successor: `{new_id}` (station {slot}, generation {new_gen})
"""

    roster_row = f"| {new_gen} | `{new_id}` | {stamp} | — | current occupant | gen {gen} -> {new_gen}: {args.reason} |\n"

    new_current = f"""# {slot} — occupant `{new_id}` (generation {new_gen})

STATION: {slot} — successors continue the lane, they do not restart it
OCCUPANT: `{new_id}` (gen {new_gen}; replaced `{occupant.get('id', slot)}`)
STATUS: STAGED (owner must start this agent — it is a new occupant)
ROLE: {role}
TASK: {task}
PROGRESS: {progress}
FILES PRODUCED: {files}
BLOCKER: none
NEXT STEP: read `agents/{slot}/handover.md` (newest block), then your predecessor's `log.md` tail, then resume — {next_step}
STOP CONDITION: {stop}
HANDOVER FROM: `{occupant.get('id', slot)}` — reason: {args.reason}

---

## Where you are picking up
You are generation {new_gen} at this station. Your predecessor stopped: **{args.reason}**.
The lane, the task and the stop condition are unchanged. Start by reading the handover and the
log tail, confirm on Drive what is already done, and continue from the first step that is not
finished. Do not restart the task, do not re-upload verified files, do not delete anything.

## Your rules (unchanged)
`OFFICE.md` — all of it, especially §2 (freeze), §5 (techniques) and §15 (stations and replacements).
Checklist: `training/quality-checklist.md` for the content type you are producing.
"""

    log_lines = (
        f"\n{stamp} | REPLACED | gen {gen} ({occupant.get('id', slot)}) removed: {args.reason} | "
        f"station hands over to {new_id} | next: show handover to successor\n"
        f"{stamp} | START | {new_id} (gen {new_gen}) staged at station {slot} | 0 new files | "
        f"next: owner starts this agent; read handover.md first\n"
    )

    if args.dry_run:
        print(f"DRY RUN — would replace gen {gen} with {new_id} at station {slot}")
        print(handover_block)
        return 0

    # ---- write (append-only where history is involved) --------------------
    with handover_path.open("a", encoding="utf-8") as fh:
        fh.write(handover_block)
    with roster_path.open("a", encoding="utf-8") as fh:
        fh.write(roster_row)
    with log_path.open("a", encoding="utf-8") as fh:
        fh.write(log_lines)
    current_path.write_text(new_current, encoding="utf-8")

    slot_board["occupant"] = {
        "id": new_id,
        "generation": new_gen,
        "since": stamp,
        "replaces": occupant.get("id", slot),
        "reason": args.reason,
    }
    slot_board["status"] = "STAGED"
    slot_board["progress_percent"] = int(re.sub(r"\D", "", progress) or 0)
    slot_board["last_log_entry"] = f"{stamp} | REPLACED | gen {gen} -> {new_id}: {args.reason}"
    slot_board["last_log_time"] = stamp
    slot_board.setdefault("replacements", []).append({"gen": gen, "occupant": occupant.get("id", slot), "reason": args.reason, "at": stamp})
    board["last_updated"] = stamp
    BOARD.write_text(json.dumps(board, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # ---- refresh the pixel office so the new occupant appears -------------
    for script in ("build_office_data.py", "build_standalone.py"):
        subprocess.run([sys.executable, str(ROOT / "tools" / script)], check=False)

    print(f"REPLACED: gen {gen} ({occupant.get('id', slot)}) -> {new_id} at station {slot}")
    print(f"  reason: {args.reason}")
    print(f"  handover appended: agents/{slot}/handover.md")
    print(f"  roster row appended: agents/{slot}/roster.md")
    print(f"  new assignment written: agents/{slot}/current.md")
    print("  app data rebuilt — the new agent now appears at that desk")
    print("\nNEXT: give the owner the start prompt for the new occupant (Copy start prompt in the app, or generate it from app/data/office.json).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

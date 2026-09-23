"""
build_office_data.py — compiles the whole office repo into app/data/office.json.

Owner lane: QA/CENTUM
Run:         python3 tools/build_office_data.py
Inputs:      board.json, agents/*/current.md + log.md, tasks/{queue,active,review,done}/*.md,
             reports/daily/*.md, reports/READY_MANIFEST.md, departments/**/overview.md
Outputs:     app/data/office.json   (the app renders from this file and nothing else)
Ledger:      none (the JSON is the artifact)
Known issues: the log-line format is fixed by OFFICE.md §7 - lines that do not match are
             kept as raw text so nothing is silently dropped.
Techniques used: OFFICE.md §5.8 (repo is the single source of truth), md2html.py for rendering
Built: 2026-09-23 by Manager
"""
from __future__ import annotations

import datetime as dt
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import md2html  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
APP_DATA = ROOT / "app" / "data" / "office.json"

STATUS_STYLE = {
    "ACTIVE": {"color": "#2fd07a", "label": "Working"},
    "REVIEW": {"color": "#f5b942", "label": "In review"},
    "BLOCKED": {"color": "#ff5c5c", "label": "Blocked"},
    "IDLE": {"color": "#8a94a6", "label": "Idle"},
    "DONE": {"color": "#31c8c8", "label": "Done"},
    "STAGED": {"color": "#5b8def", "label": "Staged"},
    "EMPTY": {"color": "#4a5568", "label": "Empty"},
}

LOG_RE = re.compile(r"^(\d{4}-\d{2}-\d{2}T[\d:]+Z?)\s*\|\s*([^|]+?)\s*\|\s*(.*)$")
CURRENT_RE = re.compile(
    r"^(STATUS|ROLE|TASK|PROGRESS|FILES PRODUCED|BLOCKER|NEXT STEP|STOP CONDITION):\s*(.*)$",
    re.M,
)
TASK_FIELD_RE = re.compile(r"^(Lane|Priority|Shelf|Blocked by|Owner approval needed|Estimate):\s*(.*)$", re.M)


def now_utc() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def ist_label(moment: dt.datetime) -> str:
    try:
        from zoneinfo import ZoneInfo

        local = moment.astimezone(ZoneInfo("Asia/Kolkata"))
    except Exception:  # pragma: no cover - fallback if tzdata is missing
        local = moment.astimezone(dt.timezone(dt.timedelta(hours=5, minutes=30)))
    return local.strftime("%d %b %Y, %I:%M %p IST").replace(" 0", " ")


def read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""


def minutes_since(iso: str, reference: dt.datetime) -> int | None:
    try:
        clean = iso.strip()
        if clean.endswith("Z"):
            clean = clean[:-1] + "+00:00"
        stamp = dt.datetime.fromisoformat(clean)
        if stamp.tzinfo is None:
            stamp = stamp.replace(tzinfo=dt.timezone.utc)
        return int((reference - stamp).total_seconds() // 60)
    except Exception:
        return None


def human_age(minutes: int | None) -> str:
    if minutes is None:
        return "unknown"
    if minutes < 1:
        return "just now"
    if minutes < 60:
        return f"{minutes} min ago"
    if minutes < 60 * 24:
        return f"{minutes // 60} h ago"
    return f"{minutes // (60 * 24)} d ago"


# --------------------------------------------------------------------------- parsers


def parse_current(path: Path, reference: dt.datetime) -> dict:
    """Parse the KEY: value header block of current.md (OFFICE.md §7)."""
    text = read(path)
    fields = {k.upper(): v.strip() for k, v in CURRENT_RE.findall(text)}
    status = fields.get("STATUS", "EMPTY").upper().split()[0] if fields.get("STATUS") else "EMPTY"
    status = status if status in STATUS_STYLE else "EMPTY"
    stop = ""
    m = re.search(r"^STOP CONDITION:\s*(.+)$", text, re.M)
    if m:
        stop = m.group(1).strip()
    task = fields.get("TASK", "")
    progress = 0
    pm = re.search(r"(\d+)\s*%", fields.get("PROGRESS", ""))
    if pm:
        progress = int(pm.group(1))
    files = 0
    fm = re.search(r"(\d+)", fields.get("FILES PRODUCED", ""))
    if fm:
        files = int(fm.group(1))
    return {
        "status": status,
        "role": fields.get("ROLE", ""),
        "task_label": task,
        "progress_percent": progress,
        "files_produced": files,
        "blocker": None if not fields.get("BLOCKER") or fields["BLOCKER"].lower().startswith("none") else fields["BLOCKER"],
        "next_step": fields.get("NEXT STEP", ""),
        "stop_condition": stop or fields.get("STOP CONDITION", ""),
        "html": md2html.convert(text),
        "raw": text,
    }


def parse_log(path: Path, reference: dt.datetime, keep: int = 40) -> list[dict]:
    """Parse log.md lines into structured entries; unmatched lines are preserved raw."""
    entries: list[dict] = []
    for line in read(path).splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m = LOG_RE.match(line)
        if m:
            ts, verb, body = m.group(1), m.group(2).strip(), m.group(3).strip()
            age = minutes_since(ts, reference)
            entries.append(
                {
                    "timestamp": ts,
                    "verb": verb.upper(),
                    "body": body.replace(" | ", " · "),
                    "age_minutes": age,
                    "age_label": human_age(age),
                    "raw": line,
                }
            )
        else:
            entries.append({"timestamp": "", "verb": "", "body": line, "age_minutes": None, "age_label": "", "raw": line})
    return entries[-keep:][::-1]  # newest first


def parse_task(path: Path) -> dict:
    text = read(path)
    slug = path.stem
    title = ""
    for line in text.splitlines():
        if line.startswith("# "):
            title = line[2:].strip()
            break
    title = re.sub(r"^TASK-\d+\s*[—:-]\s*", "", title)
    fields = {k.lower(): v.strip() for k, v in TASK_FIELD_RE.findall(text)}
    stop = ""
    m = re.search(r"##\s*Stop condition\s*\n+(.+?)(?:\n##|\Z)", text, re.S)
    if m:
        stop = re.sub(r"\s+", " ", m.group(1)).strip()
    why = ""
    m = re.search(r"##\s*Why this task\s*\n+(.+?)(?:\n##|\Z)", text, re.S)
    if m:
        why = re.sub(r"\s+", " ", m.group(1)).strip()
    num = re.match(r"TASK-(\d+)", slug)
    return {
        "slug": slug,
        "id": f"TASK-{num.group(1)}" if num else slug,
        "title": title,
        "lane": fields.get("lane", ""),
        "priority": fields.get("priority", ""),
        "shelf": fields.get("shelf", ""),
        "blocked_by": fields.get("blocked by", ""),
        "owner_approval": fields.get("owner approval needed", ""),
        "estimate": fields.get("estimate", ""),
        "stop_condition": stop,
        "why": md2html.strip_markdown(why, 260),
        "html": md2html.convert(text),
        "path": str(path.relative_to(ROOT)),
    }


def parse_report(path: Path) -> dict:
    text = read(path)
    health = ""
    m = re.search(r"^##\s*OFFICE HEALTH:\s*(.+)$", text, re.M)
    if m:
        health = m.group(1).strip().split("—")[0].strip().rstrip(".")
    date = path.stem
    actions: list[dict] = []
    block = ""
    lines = text.splitlines()
    start = end = None
    for idx, line in enumerate(lines):
        if start is None and "OWNER ACTIONS REQUIRED" in line:
            start = idx
            continue
        if start is not None and line.startswith("## ") and "WHAT HAPPENS NEXT" in line:
            end = idx
            break
    if start is not None:
        block = "\n".join(lines[start + 1 : end if end else len(lines)])
        parts = re.split(r"^###\s+", block, flags=re.M)
        for part in parts[1:]:
            plines = part.splitlines()
            heading = plines[0].strip()
            body = "\n".join(plines[1:]).strip()
            num = re.match(r"^(\d+)[.)]\s*(.*)$", heading)
            prompts = [c for c in re.findall(r"```[a-zA-Z]*\n(.*?)```", body, re.S)]
            actions.append(
                {
                    "number": num.group(1) if num else "",
                    "title": num.group(2) if num else heading,
                    "html": md2html.convert(body),
                    "prompts": prompts,
                }
            )
    return {
        "date": date,
        "title": f"Daily report — {date}",
        "health": health,
        "html": md2html.convert(text),
        "actions_html": md2html.convert(block) if block else "",
        "actions": actions,
        "path": str(path.relative_to(ROOT)),
        "markdown": text,
    }


def parse_manifest(path: Path) -> list[dict]:
    """Pull the two markdown tables out of READY_MANIFEST.md."""
    tables: list[dict] = []
    text = read(path)
    current: dict | None = None
    for line in text.splitlines():
        if not line.strip().startswith("|"):
            current = None
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if all(set(c) <= set("-: ") for c in cells):
            continue
        if current is None:
            current = {"head": cells, "rows": []}
            tables.append(current)
            continue
        current["rows"].append(cells)
    return tables


def make_prompt(slot_id: str, task: dict) -> str:
    """Build the paste-into-Arena prompt for a slot + task (shape: training/roles/role-prompt-template.md)."""
    lane = task.get("lane", "")
    if "(" in lane:
        lane = lane.split("(")[0].strip()
    stop = task.get("stop_condition") or "the deliverables listed in the task file exist on Drive"
    owner_note = ""
    if str(task.get("owner_approval", "")).lower().startswith("yes"):
        owner_note = "\nThis task needs the owner's GO before any Drive write. If the freeze is still on, do the\nread-only parts and stop."
    return (
        f"You are a worker agent in the CENTUM AI Office. Slot: {slot_id} — Role: {lane or task.get('lane','')}.\n\n"
        f"Repository: aakaash-dotcom/centum-ai-office\n\n"
        f"READ FIRST, in order:\n"
        f"1. OFFICE.md — master rules. Section 2 is the freeze: check whether it is still on.\n"
        f"2. agents/{slot_id}/current.md — your assignment and stop condition.\n"
        f"3. agents/{slot_id}/log.md — your log; write every step here.\n"
        f"4. tasks/queue/{task['slug']}.md — the full task. Follow its Steps exactly.\n"
        f"5. training/content-standards.md and training/quality-checklist.md.\n\n"
        f"YOUR TASK: {task['id']} — {task['title']}\n"
        f"LANE: {task.get('lane','')} · SHELF: {task.get('shelf','')} · PRIORITY: {task.get('priority','')}\n"
        f"BLOCKED BY: {task.get('blocked_by','none')}{owner_note}\n\n"
        f"STOP CONDITION (do not go past this): {stop}\n\n"
        f"Techniques to use, from OFFICE.md §5: page-1 subject gate before any upload; md5 duplicate check\n"
        f"against COLLECT_LOG.csv; Drive uploads through bridge.py with Content-Type text/plain, timeouts\n"
        f"of 180s or more, files under 8 MB, four workers, and the pattern replace -> verify by list ->\n"
        f"upload -> verify by list; never delete anything on Drive — quarantine instead; ledgers in\n"
        f"ledgers/ (gate_results.csv, publish_log.csv, duplicates.csv, wm_done.json); file naming per\n"
        f"OFFICE.md §5.9.\n\n"
        f"BEFORE YOU SET STATUS: REVIEW — run training/quality-checklist.md §0 plus the section named in\n"
        f"the task file, and write each item PASS/FAIL into agents/{slot_id}/current.md.\n\n"
        f"NEVER: delete Drive content, move or rename files in the old vault, paste the Apps Script secret\n"
        f"into any file or message, edit catalogue.json, upload without the page-1 gate, or work on classes\n"
        f"11/12 while they are parked.\n\n"
        f"Log every step in agents/{slot_id}/log.md in the format in OFFICE.md §7.\n"
        f"If blocked: write the blocker block from OFFICE.md §9, set STATUS: BLOCKED, and stop.\n\n"
        f"Paste this into a fresh Arena chat for slot {slot_id}."
    )


def repo_file_count() -> int:
    try:
        out = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, timeout=20)
        return len([ln for ln in out.stdout.splitlines() if ln.strip()])
    except Exception:
        return 0


# --------------------------------------------------------------------------- main build


def build() -> dict:
    reference = now_utc()
    board = json.loads(read(ROOT / "board.json") or "{}")

    # ----- tasks (parsed first: slots need them for their paste prompts)
    tasks: dict[str, list[dict]] = {"queue": [], "active": [], "review": [], "done": []}
    for folder in tasks:
        for f in sorted((ROOT / "tasks" / folder).glob("TASK-*.md")):
            tasks[folder].append(parse_task(f))
    tasks_by_id: dict[str, dict] = {}
    for folder, items in tasks.items():
        for t in items:
            t["bucket"] = folder
            t.setdefault("start_prompt", "")
            tasks_by_id.setdefault(t["id"], t)

    # ----- departments + slots
    departments: list[dict] = []
    all_slots: list[dict] = []
    for key, dept in (board.get("departments") or {}).items():
        overview_path = ROOT / str(dept.get("overview", ""))
        slots_out: list[dict] = []
        for slot_id, slot in (dept.get("slots") or {}).items():
            agent_dir = ROOT / "agents" / slot_id
            current = parse_current(agent_dir / "current.md", reference)
            log = parse_log(agent_dir / "log.md", reference)
            task_label = current["task_label"] or slot.get("task_name") or ""
            m = re.search(r"(TASK-\d+)", task_label)
            task = tasks_by_id.get(m.group(1)) if m else None
            task_slug = task["slug"] if task else ""
            last = log[0] if log else {}
            status = current["status"]
            board_status = (slot.get("status") or "EMPTY").upper()
            status = status if status != "EMPTY" else board_status
            status = status if status in STATUS_STYLE else board_status
            style = STATUS_STYLE.get(status, STATUS_STYLE["EMPTY"])
            slots_out.append(
                {
                    "id": slot_id,
                    "number": slot_id.split("-")[-1],
                    "status": status,
                    "status_label": style["label"],
                    "status_color": style["color"],
                    "role": current["role"] or slot.get("role") or "",
                    "task_id": m.group(1) if m else slot.get("task_id") or "",
                    "task_name": task_label or slot.get("task_name") or "",
                    "task_slug": task_slug,
                    "progress_percent": current["progress_percent"] or slot.get("progress_percent", 0),
                    "files_produced": current["files_produced"],
                    "blocker": current["blocker"],
                    "is_at_risk": bool(slot.get("is_at_risk")),
                    "next_step": current["next_step"],
                    "stop_condition": current["stop_condition"] or (task or {}).get("stop_condition", ""),
                    "last_log_time": last.get("timestamp", slot.get("last_log_time") or ""),
                    "last_log_age_minutes": last.get("age_minutes"),
                    "last_log_age_label": human_age(last.get("age_minutes")),
                    "last_log_line": last.get("body", "") or (slot.get("last_log_entry") or ""),
                    "sessions_count": slot.get("sessions_count", 0),
                    "start_prompt": make_prompt(slot_id, task) if task else "",
                    "current_html": current["html"],
                    "log": log,
                }
            )
        departments.append(
            {
                "key": key,
                "name": dept.get("name", key.title()),
                "overview": str(dept.get("overview", "")),
                "overview_html": md2html.convert(read(overview_path)),
                "status_legend": dept.get("status_legend", ""),
                "slots": slots_out,
            }
        )
        all_slots.extend(slots_out)

    # ----- per-task paste prompts (generic slot-agnostic variant)
    for folder, items in tasks.items():
        for t in items:
            t["start_prompt"] = make_prompt("agent-XX", t)

    # ----- reports
    reports = [parse_report(p) for p in sorted((ROOT / "reports" / "daily").glob("20*.md"), reverse=True)][:6]

    # ----- manifest + health
    manifest = parse_manifest(ROOT / "reports" / "READY_MANIFEST.md")
    latest_health = reports[0]["health"] if reports else ""
    actions = reports[0]["actions"] if reports else []

    blocked = [s for s in all_slots if s["status"] == "BLOCKED"]
    working = [s for s in all_slots if s["status"] in ("ACTIVE", "REVIEW")]
    health = latest_health or ("NEEDS ATTENTION" if blocked else ("GOOD" if working else "NEEDS ATTENTION"))
    health_key = "GOOD" if "GOOD" in health.upper() else ("CRITICAL" if "CRITICAL" in health.upper() else "NEEDS ATTENTION")

    freeze = board.get("freeze") or {}
    return {
        "generated_at": reference.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "generated_label": ist_label(reference),
        "repo_file_count": repo_file_count(),
        "office": {
            "name": board.get("office_name", "CENTUM AI Office"),
            "health": health,
            "health_key": health_key,
            "freeze_active": bool(freeze.get("active")),
            "freeze_text": freeze.get("text", ""),
            "freeze_lifts_on": freeze.get("lifts_on", ""),
            "manager_status": (board.get("manager") or {}).get("status", ""),
            "manager_last_run": (board.get("manager") or {}).get("last_run", ""),
            "manager_last_run_label": human_age(minutes_since((board.get("manager") or {}).get("last_run", ""), reference)),
            "manager_next_action": (board.get("manager") or {}).get("next_action", ""),
            "stats": board.get("stats", {}),
            "shelves": board.get("shelves", {}),
            "parked": board.get("parked", []),
            "existing_work": board.get("existing_work_summary", {}),
        },
        "departments": departments,
        "slots": all_slots,
        "tasks": tasks,
        "counts": {
            "queue": len(tasks["queue"]),
            "active": len(tasks["active"]),
            "review": len(tasks["review"]),
            "done": len(tasks["done"]),
            "agents": len(all_slots),
            "working": len(working),
            "blocked": len(blocked),
            "owner_actions": len(actions),
        },
        "reports": reports,
        "owner_actions": actions,
        "manifest": manifest,
    }


def main() -> int:
    data = build()
    APP_DATA.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    APP_DATA.write_text(payload, encoding="utf-8")
    # fallback copy: GitHub Pages always serves this even if fetch() is blocked
    (APP_DATA.parent / "office.data.js").write_text(
        "window.CENTUM_OFFICE_DATA = " + payload + ";\n", encoding="utf-8"
    )
    kb = APP_DATA.stat().st_size / 1024
    print(f"office.json written: {kb:.0f} KB")
    print(f"  agents={data['counts']['agents']} working={data['counts']['working']} blocked={data['counts']['blocked']}")
    print(f"  tasks: queue={data['counts']['queue']} active={data['counts']['active']} review={data['counts']['review']} done={data['counts']['done']}")
    print(f"  owner actions in latest report: {data['counts']['owner_actions']}")
    print(f"  health: {data['office']['health']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

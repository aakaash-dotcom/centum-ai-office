# Memory files — what is missing (FIX D, 2026-09-24)

Searched: every remote branch (`main`, `arena/01a0ce72-*`, `arena/01a0cec4-*`, `arena/01a0cf0a-*`)
and the full history of every ref (`git log --all -- <path>`). All three arena branches are fully
merged into `main` (0 commits ahead). Nothing was fabricated.

| File | Status |
|---|---|
| `reports/daily/2026-09-23.md` | Present on main — the full 224-line version (newest of 4 revisions, `1a8fef1`). |
| `reports/eod/2026-09-23.md` | Present on main. |
| `ledgers/*` | Present on main: `drive_map.json`, `duplicates.csv`, `gate_results.csv`, `publish_log.csv`, `wm_done.json`. `drive_inventory.csv` is written by the Drive inventory workflow. |
| `knowledge/AGENT_B_DEBRIEF.md` | **Missing** — in no branch, no history. A summary lives in `board.json` → `existing_work_summary`. |
| `agents/_legacy/` | **Missing** — in no branch, no history. |
| `tasks/queue/TASK-101-drive-inventory-audit.md` | **Missing** — in no branch, no history. |
| `WHY-THE-OFFICE-CANNOT-REACH-DRIVE.md` | **Missing** — the same topic is covered in `OFFICE.md` §21 and `drive/README.md`. |
| `HANDOVER-TO-NEW-SESSION.md` | **Missing** — in no branch, no history. |
| `AFTER-PR3-REPLY.md` | **Missing** — in no branch, no history. |
| `FINISH-THE-OFFICE.md` | **Missing** — in no branch, no history. |
| `READ-ME-FIRST.md` | **Missing** — in no branch, no history. |

These were most likely written in sessions that never pushed. To restore one, paste its text into
a session and commit it at the path above.

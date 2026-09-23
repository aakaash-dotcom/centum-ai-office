# TASK-002 — Publish gated SSLC Science 2022–2026 into StudyHub

Lane: PYQ (agent-01)
Priority: 1 (Class 10 Science)
Shelf: free
Blocked by: TASK-001 (the gate tool must exist)
Owner approval needed: yes — this is the first student-facing publish since the freeze; needs GO
Estimate: 1 agent session

## Why this task
These are the only high-trust files the team produced (split from official DGE bundles, md5 already logged). Five files, five years of Class 10 Science public papers, is the first thing a parent can actually open and recognise. This is the visible proof the office works.

## Inputs
| What | Where | State |
|---|---|---|
| 5 SSLC Science STATE PDFs | Drive `Question Papers/10th/Annual/{2022,2023,2024,2025,2026}/STATE/10_Science_Annual_<year>_STATE.pdf` | present, md5 in `COLLECT_LOG.csv`, page-1 confirmation outstanding |
| Gate tool | `tools/page1_gate.py` | from TASK-001 |
| Target tree | `StudyHub/TN/10th/Science/PYQ/Annual/<year>/` | to be created |

## Steps
1. Create the target folders (one per year, 2022–2026) under `StudyHub/TN/10th/Science/PYQ/Annual/`.
2. Download each source file to `/tmp`, compute md5, compare against `COLLECT_LOG.csv` (mismatch = stop and report, do not publish).
3. Run `tools/page1_gate.py` on each file. Expect PASS (page 1 = அறிவியல்/Science). Any FAIL or REVIEW → do not publish that file; move a copy to `StudyHub/_QUARANTINE/` and report it.
4. Publish each PASS file to its year folder as a **copy** — the original stays exactly where it is. Name it `10_Science_Annual_<year>_STATE.pdf`.
5. Upload pattern per file: `replace → verify by list → upload → verify by list` (`replace` no-ops if the name is new — that is expected, but you must still verify).
6. Append rows to `ledgers/publish_log.csv` (old path + new path + md5 + shelf `free`) and rows to `ledgers/gate_results.csv`.
7. Paste all five Drive links into `agents/agent-01/log.md`.

## Deliverables (exact names)
| File | Drive path |
|---|---|
| `10_Science_Annual_2022_STATE.pdf` … `10_Science_Annual_2026_STATE.pdf` (5 files) | `StudyHub/TN/10th/Science/PYQ/Annual/<year>/` |

## Stop condition
Five files in five year folders. Ravi opens any one of them on his phone and page 1 says Science (அறிவியல்), not Tamil. Links are in the log. **Then stop** — do not continue into district files, do not start Maths.

## Checklist to run
`training/quality-checklist.md` §0 + §6 (upload/naming). Originals are not watermarked — confirm you did not add anything to them.

## Techniques
Page-1 gate (OFFICE.md §5.2) · md5 duplicate control (§5.3) · `bridge.py` `/text/plain` / ≥180 s / ≤8 MB / 4 workers / replace-verify pattern (§5.1) · ledgers in `ledgers/` (§5.8, `ledgers/README.md`) · naming (§5.9) · quarantine instead of delete (§5.10).

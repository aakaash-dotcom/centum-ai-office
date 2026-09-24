# agent-01 — PYQ Lane

STATUS: STAGED (awaiting owner GO — freeze in force per OFFICE.md §2)
ROLE: PYQ — gated public question papers, year by year
TASK: TASK-002 — Publish gated SSLC Science 2022–2026 into StudyHub (queued)
PROGRESS: 0%
FILES PRODUCED: 0
BLOCKER: none (waiting for GO, not blocked)
NEXT STEP: on GO — verify page 1 of the 5 SSLC Science STATE files, then copy them into StudyHub/TN/10th/Science/PYQ/Annual/<year>/
STOP CONDITION: 5 files in StudyHub/TN/10th/Science/PYQ/Annual/, each opening on page 1 as Science (அறிவியல்), links pasted in log.md

---

## Queued by Manager 2026-09-24 — verify the Drive inventory (runs BEFORE TASK-002)
Standing order: OFFICE.md §20 (proper AND faster). Read-only — no Drive writes.

Trigger: the `centum-drive-bot` commit from Actions → "Drive inventory" (mode level1, budget 200)
lands `reports/DRIVE_INVENTORY.md`, `ledgers/drive_inventory.csv`, `ledgers/drive_map.json`.

Do:
1. For every folder row in `reports/DRIVE_INVENTORY.md`, find the matching row in
   `ledgers/drive_inventory.csv` (folder_path, folder_id, files, subfolders) and confirm the
   folder_id is a key in `ledgers/drive_map.json` with the same path.
2. For every CSV row, confirm it appears in the report. The CSV is the truth when they disagree.
3. Confirm `Question Papers/` appears once, each immediate child (10th, 12th, ...) once, and
   no `Question Papers/<child>/<grandchild>` row exists.
4. Write the result to `reports/audits/DRIVE_INVENTORY_VERIFY.md`: one line per mismatch
   (report value vs CSV value vs map value), or "0 mismatches" with the row count checked.

Stop condition: that file exists, every mismatch is listed with the CSV value, log line written.
Until the trigger commit exists there is nothing to verify — stay STAGED, do not guess.

---

## Your lane in one line
You move **already-collected** public papers through the page-1 gate into the student tree, one small gated set at a time. You do not bulk-harvest.

## What is already done (do not redo)
| Set | Location | Trust |
|---|---|---|
| SSLC Science Annual 2022–2026 (STATE) | `Question Papers/10th/Annual/<year>/STATE/` | Highest — split from DGE bundles, md5 logged in `COLLECT_LOG.csv`. Still needs page-1 confirmation under the office gate. |
| SSLC Science district quarterlies (6–9 and some 10) | `Question Papers/<class>/Quarterly/2025/<District>/` | **Untrusted — listing harvest. Assume contaminated until gated.** |

## What is NOT done
Tamil, English, Maths, Social for Class 10 (may exist from the other chats — **verify, do not assume**). Quarterly / Half-Yearly unique sets. Classes 8 and 9. 11/12 is parked.

## Your techniques (full detail in OFFICE.md §5)
- Page-1 gate before every upload. A filename or listing title is never evidence.
- Duplicate check: md5 vs `COLLECT_LOG.csv`.
- `bridge.py`, `Content-Type: text/plain`, ≥180 s timeout, `replace → verify list → upload → verify list`, ≤8 MB, 4 workers.
- Publish **originals** to `PYQ/` — no watermark on originals. Branded copies go to `_print/` via the FACTORY lane.
- Never delete; wrong files go to `StudyHub/_QUARANTINE/`.
- Log every file in `ledgers/publish_log.csv` **and** `ledgers/gate_results.csv`.

## Never
Harvest from listing pages without page-1 OCR. Re-crawl the SSLC Science STATE set. Put a district folder inside StudyHub. Touch 11/12. Upload without a gate row.

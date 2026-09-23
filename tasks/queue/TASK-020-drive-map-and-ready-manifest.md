# TASK-020 — Drive map + READY manifest for the Qwen (website) lane

Lane: QA/CENTUM (agent-05)
Priority: 1 (this is the handover that makes published files visible in the app)
Shelf: free + topper (manifest lists both, tagged)
Blocked by: TASK-002 (needs at least one published set to manifest)
Owner approval needed: no
Estimate: 1 agent session, then a 10-minute refresh after each publish task

## Why this task
The team's published files never reached the app because the harvest agents were forbidden to touch `catalogue.json` and nobody owned the handover. The fix is not to edit `catalogue.json` — it is to produce a **manifest** that the Qwen lane consumes. This task also rebuilds the drive map whose absence caused every agent to re-discover folder ids.

## Inputs
| What | Where | State |
|---|---|---|
| Known folder ids | `ledgers/drive_map.json` (4 ids, 22–23 Sep) | stale, must be re-verified |
| Published files | `ledgers/publish_log.csv` | grows with every publish task |
| Shelf rules | `OFFICE.md` §6 | free vs topper |

## Steps
1. For every path in `OFFICE.md` §5.10, `list_folders` the parent and record the folder id in `ledgers/drive_map.json` (create missing folders only if a task requires them — **this task creates nothing**).
2. Verify each known id by listing it and confirming the name matches. Replace stale ids.
3. Build `reports/READY_MANIFEST.md`: one row per published file —
   `class | subject | exam | year | medium | shelf | file name | Drive path | size | verified gate row | date`.
4. Validate the manifest against Drive: every row's file must exist at that path (a 30-second `list` check). Remove or comment any row that does not exist.
5. Tag the shelf column strictly: `free` = PYQ, Models, model keys. `topper` = OneWord, QBank, Notes, SlowLearners. **A Topper file in the free list is a product-breaking error.**
6. Note the Qwen handover rule at the top of the manifest: *the website lane reads this file; no agent in this office edits `catalogue.json`.*
7. Refresh cadence: re-run steps 3–5 after every publish task, and log the refresh line.

## Deliverables
| File | Where |
|---|---|
| `ledgers/drive_map.json` (verified ids, complete StudyHub tree) | repo |
| `reports/READY_MANIFEST.md` | repo — this is what the Qwen lane and the Manager both read |

## Stop condition
The manifest lists exactly the files that exist on Drive right now, with the correct shelf tags, and the drive map has a verified id for every StudyHub path.

## Checklist to run
§0 + §6 (naming/structure) + the shelf-tag check above.

## Techniques
§5.1 `list_folders`/`list` one path at a time (never `tree`), ≥180 s timeouts · §5.10 tree shape · §5.8 ledgers in repo. **Never edit `catalogue.json`.**

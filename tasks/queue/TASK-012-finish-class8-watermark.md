# TASK-012 — Finish the Class 8 watermark run (98/444) + recheck the pre-fix files

Lane: FACTORY (agent-04)
Priority: 6 (Class 8 — but it is a paused, half-done job; finishing it stops it leaking into future runs)
Shelf: topper/print
Blocked by: TASK-011 (WM must be applied by the rebuilt, verified path)
Owner approval needed: **yes** — this writes to the old vault; the owner must confirm the freeze is lifted for it
Estimate: 2–3 sessions (batched)

## Why this task
A batch job stopped at file 98 of 444 during the freeze, and files 1–98 were watermarked with the **pre-2026-09-16 negative angle**. Right now the vault contains two different watermark directions — which is exactly the kind of inconsistency that makes a parent distrust the brand.

## Inputs
| What | Where | State |
|---|---|---|
| Job ledger | `ledgers/wm_done.json` | records 1–98 done-pre-fix, resume at 99 |
| Target files | Drive `Question Papers/8th/Quarterly/*` (444 files) | partially watermarked |
| WM tool | `wm_apply.py` (`fix_direction()` strips ours and reapplies) | direction fixed 2026-09-16 |

## Steps
1. Batch 1 (recheck): run `fix_direction()` over files 1–98 — it must strip our old mark and reapply at BL→TR, opacity 0.17. Verify 3 random files by opening them.
2. Batch 2 (finish): resume at index 99 and run in batches of 25–50 with 4 workers, `MIN_GAP = 0.25 s`.
3. After **every batch**: write the resume index to `ledgers/wm_done.json`, append a `log.md` line with the file range, and `list` a sample to confirm the upload landed.
4. Never touch `_INBOX` originals. Never watermark a Drive original — the student-facing copy only.
5. If a file exceeds 8 MB or fails the bridge twice, log it as SKIPPED with its path; do not retry it forever.
6. Final: one summary line — X rechecked, Y newly watermarked, Z skipped, with the count in `log.md`.

## Deliverables
| What | Where |
|---|---|
| Class 8 set watermarked consistently (BL→TR, 0.17) | existing folder in the old vault, student copies only |
| updated resume/ledger state | `ledgers/wm_done.json` + `agents/agent-04/log.md` |

## Stop condition
All 444 files either carry one consistent watermark or are on the skipped list with a reason. The skipped list is in the log.

## Checklist to run
§0 + §7.

## Techniques
§5.6 (`fix_direction()`, one WM per A5 slot, vector overlay, no re-encode) · §5.1 (4 workers, 0.25 s gap, 180 s timeouts, replace-verify) · §5.8 (ledger in repo — the old ledger was wiped, this is why) · **no deletes, no renames, no restructuring.**

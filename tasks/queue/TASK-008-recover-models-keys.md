# TASK-008 — Recover the existing 10th model papers + answer keys

Lane: MODEL (agent-02)
Priority: 1 (Class 10, free shelf)
Shelf: free
Blocked by: TASK-001
Owner approval needed: no
Estimate: 2 agent sessions

## Why this task
The team already made 10th Maths/Science model papers and keys. They were deleted from the local workspace during the 23 Sep cleanup and **may still exist on Drive**. Regenerating them would waste sessions and create a second, conflicting version. Free shelf = PYQ + models + model keys, so this is half the free product.

## Inputs
| What | Where | State |
|---|---|---|
| Possible model papers + keys | `Question Papers/10th/**` year folders, `Unknown/`, `WITHKEY/`, `2UP-A4/`, `Print-Ready/`, `Study Materials/**` | unknown — search one path at a time |
| Suspect naming | `*_A5.pdf`, `*MODEL*`, `*KEY*`, `*answer*`, `*model*` | old factory output, subject trust unknown |

## Steps
1. Search by `list` folder-by-folder (never `tree` the vault): Annual year folders first, then Quarterly, then `Study Materials/`, then any `_catalog`/`_old_root`-era paths.
2. For every candidate: download, md5, gate page 1 for subject, and open the key file to confirm it is a key for that paper (not another paper).
3. Publish as copies into `StudyHub/TN/10th/<Subject>/Models/`:
   `10_<Subject>_Model_<n>_<medium>.pdf` and `10_<Subject>_Model_<n>_<medium>_KEY.pdf`.
4. Write the inventory: found / missing / unusable, one line per file with its Drive link — into `agents/agent-02/log.md`. This inventory is what tells the Manager whether new models are needed at all.
5. Only after the inventory: list the gaps (subjects/units with no model) as a comment in `current.md`, do **not** start creating them — creation is a separate task (TASK-017).

## Deliverables
| File | Drive path |
|---|---|
| recovered `10_*_Model_*` + `*_KEY` set | `StudyHub/TN/10th/<Subject>/Models/` |
| inventory (found / missing / unusable + links) | `agents/agent-02/log.md` |

## Stop condition
Every recoverable model+key is on Drive in `Models/` and the inventory is written. **Stop before creating anything new.**

## Checklist to run
`training/quality-checklist.md` §0, §5 (paper standards), §6 (upload). A key that is just a list of answers is a FAIL against §5 — publish it as a draft note only if it is the only copy, and flag it.

## Techniques
§5.2 gate, §5.3 md5, §5.1 upload, §5.10 quarantine for dirty/foreign-branded files. Do not re-brand originals — the FACTORY lane makes print copies later.

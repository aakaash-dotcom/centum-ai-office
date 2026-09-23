# TASK-019 — Class 9 Science: gate what exists, publish the real set

Lane: PYQ (agent-01)
Priority: 6 (Class 9 — after 10 is clean)
Shelf: free
Blocked by: TASK-002, TASK-018 (learn the mismatch rate first — Class 9 district sets are the same harvest lineage)
Owner approval needed: no
Estimate: 2–3 agent sessions

## Why this task
Class 9 claimed 26 unique Quarterly 2025 district papers and 2022 Science papers. Some of that is real content. It is also the class whose files came from the same listing harvest that produced the mislabels, so it must be treated as contaminated until gated — **but the reclaimed files are free library material and worth the audit.**

## Inputs
| What | Where | State |
|---|---|---|
| 9th Science 2022 Annual (TM+EM) | `Question Papers/9th/Annual/2022/STATE/` | medium trust, not re-gated |
| 9th Quarterly 2025 districts | `Question Papers/9th/Quarterly/2025/<District>/` (≈26 claimed unique) | low trust |
| Gate results so far | `ledgers/gate_results.csv` | from TASK-018 |

## Steps
1. Reuse TASK-018's classification for Class 9 — do not re-gate what is already classified.
2. Publish only PASS files, as copies, into `StudyHub/TN/9th/Science/PYQ/{Annual|Quarterly}/<year>/`.
3. District stays in the filename/ledger — never a folder inside StudyHub.
4. Deduplicate across districts first: the same district paper appears under multiple names.
5. Report the real count: "Class 9 Science: X gated papers (Y reclaimed from mislabels, Z rejected)". The number matters because the old claim was 26.

## Deliverables
| File | Drive path |
|---|---|
| gated `9_Science_<Exam>_<year>_<source>.pdf` set | `StudyHub/TN/9th/Science/PYQ/<Exam>/<year>/` |
| real-count report line | `agents/agent-01/log.md` |

## Stop condition
Class 9 Science contains only page-1-verified files, and the log states the true count with the reclaim/reject breakdown.

## Checklist to run
§0 + §6 + §8 (the reclaims are recovery work).

## Techniques
§5.2 gate · §5.3 md5 dedupe · §5.10 quarantine · §5.1 upload pattern · **do not start Class 8 or Class 12** — Class 8's watermark job (TASK-012) and the 11/12 park both stand in the way.

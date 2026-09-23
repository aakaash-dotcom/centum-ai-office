# TASK-006 — Class 10 Tamil: gated unique set (the medium trap)

Lane: PYQ (agent-01)
Priority: 4 (Class 10 Tamil/English)
Shelf: free
Blocked by: TASK-001
Owner approval needed: no
Estimate: 2–3 agent sessions

## Why this task
Tamil is the subject where the team failed hardest: files *named* Science were Tamil papers. Tamil must be identified by the paper's own structure — இயல்/section headings, தமிழ் subject line, prose + grammar + literature split — not by the language of the text (every Tamil-medium paper is Tamil text).

## Inputs
| What | Where | State |
|---|---|---|
| DGE bundles | `COLLECT/GOVT_PYQ/` | available |
| Known contaminated set | `Question Papers/10th/Quarterly/2026/STATE/` (four "Science" files, at least one Tamil) | must be re-gated |
| Suspect district dumps | `Question Papers/10th/Quarterly/*/`, `…/8th|9th/Quarterly/2025/*` | the Science-labelled ones may be Tamil — check |

## Steps
1. Gate every file that was *named* Science but whose page 1 is Tamil **first** — those are the highest-value reclamations (they may be perfectly good Tamil papers we could rescue into the Tamil shelf).
2. For genuine Tamil papers: publish as `10_Tamil_<Exam>_<year>_<source>.pdf` into `StudyHub/TN/10th/Tamil/PYQ/<Exam>/<year>/`.
3. Medium column: `Tamil`. Tamil-medium papers are the core product for this subject.
4. Where a Tamil *paper* was mislabelled Science, publish it under Tamil with a ledger note recording the old name (so nobody re-creates it).
5. Never rename a file in the old vault. Copy, publish, log.
6. Ledgers + links; the log entry must say how many mislabelled files were reclaimed.

## Deliverables
| File | Drive path |
|---|---|
| reclaimed + sourced `10_Tamil_*` set | `StudyHub/TN/10th/Tamil/PYQ/<Exam>/<year>/` |
| reclamation note | `agents/agent-01/log.md` + `ledgers/gate_results.csv` |

## Stop condition
The Tamil shelf contains only files whose page 1 is a Tamil paper, and the reclamation count is written down. **The stop condition Ravi cares about: nothing named Tamil opens as Science, and vice versa.**

## Checklist to run
§0 + §6.

## Techniques
§5.2 gate with the Tamil subject-token list (`தமிழ்` = the subject; do not confuse with medium) · §5.3 md5 (mislabelled duplicates are common) · §5.10 quarantine for failures · district-as-column.

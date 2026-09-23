# TASK-003 — Verify and publish 10th Quarterly + Half-Yearly Science

Lane: PYQ (agent-01)
Priority: 1 (Class 10 Science)
Shelf: free
Blocked by: TASK-001, TASK-002
Owner approval needed: no (gate handles the decisions; quarantine list goes in the report)
Estimate: 2 agent sessions

## Why this task
The debrief records that `Question Papers/10th/Quarterly/2026/STATE/` holds four files named Science, all of which are suspect, and the district quarterlies are listing-harvest material of unknown subject. Unique Quarter/Half-Yearly papers are worth more to a student than another Annual — but only the gated ones.

## Inputs
| What | Where | State |
|---|---|---|
| 10th Quarterly 2026 STATE files | `Question Papers/10th/Quarterly/2026/STATE/` | **known contaminated** (four "Science" files, one reportedly Tamil) |
| District quarterlies (10th) | `Question Papers/10th/Quarterly/2025/<District>/` | untrusted |
| Half-Yearly (10th) | `Question Papers/10th/Half-Yearly/**` | partially explored |

## Steps
1. `list` each folder (one path at a time — never `tree` the vault).
2. Download each candidate to `/tmp`; md5 it; run the page-1 gate.
3. Deduplicate by md5 across the whole set — the same paper under three names is one paper.
4. Publish PASS files only, as copies, into `StudyHub/TN/10th/Science/PYQ/{Quarterly|HalfYearly}/<year>/`, names `10_Science_<Exam>_<year>_<District|STATE>.pdf` (district stays in the filename and as a ledger column — **never** a folder inside StudyHub).
5. REVIEW files → leave in place, list them for the owner with Drive links.
6. FAIL files → copy to `StudyHub/_QUARANTINE/`, log why.
7. Ledgers: `gate_results.csv`, `publish_log.csv`, and `duplicates.csv` for every md5 collision.

## Deliverables
| File | Drive path |
|---|---|
| gated `<class>_Science_<Exam>_<year>_<source>.pdf` set | `StudyHub/TN/10th/Science/PYQ/Quarterly/<year>/` and `…/HalfYearly/<year>/` |
| quarantine list + REVIEW list | `agents/agent-01/log.md` (with Drive links) |

## Stop condition
Every file in the two source folders has a gate row; the PASS set is on Drive; the REVIEW and FAIL lists are written with links. **Stop after Science** — Maths is TASK-004.

## Checklist to run
`training/quality-checklist.md` §0 + §6. Extra: every published file's name must match its gated subject.

## Techniques
§5.2 gate, §5.3 md5, §5.1 upload pattern, §5.10 quarantine. District-as-column rule (§5.10). Do not re-download anything already published in TASK-002.

# TASK-018 — Quarantine audit: the ~185 "unique Science" set + the 4 contaminated Quarterly files

Lane: QA/CENTUM (agent-05)
Priority: 1 (unblocks trust in everything else)
Shelf: n/a (audit)
Blocked by: TASK-001
Owner approval needed: yes — the owner receives the decision list (nothing is deleted, ever)
Estimate: 2–4 sessions (batched; the set is large)

## Why this task
The debrief estimates ~185 "unique Science originals" of unknown subject, plus a known-bad set of four files named Science in `Question Papers/10th/Quarterly/2026/STATE/`. Until these are classified, nobody knows what the office actually owns — and "185 files" keeps being mistaken for progress.

## Inputs
| What | Where | State |
|---|---|---|
| Suspect originals | `Question Papers/{6,7,8,9,10}th/Quarterly/2025/<District>/` and the 10th Quarterly 2026 STATE folder | listing-harvest, untrusted |
| Gate tool | `tools/page1_gate.py` | from TASK-001 |
| Known truth | SSLC Science Annual STATE files are trusted | do not re-audit them |

## Steps
1. Batch the work: one class/exam folder per session. `list` the folder, download in small batches (≤20 files), gate each, record a row.
2. Classify every file: **PASS** (subject matches name) · **WRONG-SUBJECT** (name says Science, page 1 says Tamil/Maths/Social/English) · **UNREADABLE** (no text layer, OCR fails, blank scan) · **DIRTY** (foreign branding, phone number, student ticks) · **DUPLICATE** (md5 already seen).
3. Do **not** move anything yet. Produce a classification table only. Moves to `_QUARANTINE/` happen as copies, after the owner sees the list.
4. Aggregate: true counts per subject per class, duplicates removed, dirty rejected. This number — not "185" — becomes the office's stated inventory.
5. Write `ledgers/gate_results.csv` rows for every file and a summary table `reports/audits/vault-audit-YYYY-MM-DD.md` with: files examined, PASS by subject, WRONG-SUBJECT breakdown, DIRTY, duplicates, and a **reclaimed list** (mislabelled files that are actually useful material for their real subject).
6. Escalate to the owner: any folder where the mismatch rate is above ~20% (that indicates the whole folder was harvested from a listing and should not be trusted at all).

## Deliverables
| File | Where |
|---|---|
| classification rows (all files) | `ledgers/gate_results.csv` |
| audit report with counts + examples + Drive links | `reports/audits/vault-audit-YYYY-MM-DD.md` |
| duplicate rows | `ledgers/duplicates.csv` |

## Stop condition
The report states, in one number, how many **genuinely usable** Science originals the office owns, and lists the mislabelled ones with their real subject. Nothing moved, nothing deleted.

## Checklist to run
§0 + §8 (recovery/continuation).

## Techniques
§5.2 gate (text-first, OCR fallback) · §5.3 md5 · §5.10 quarantine-as-copy · §5.4 dirty rejection (**never crop a dirty file**) · batched downloads to stay under session limits · one path at a time, never `tree`.

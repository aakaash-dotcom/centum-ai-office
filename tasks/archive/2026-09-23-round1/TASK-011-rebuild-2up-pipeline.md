# TASK-011 — Rebuild the 2-up print pipeline without `papers/manifest.json`

Lane: FACTORY (agent-04)
Priority: 1 (blocks every print deliverable)
Shelf: n/a (production step)
Blocked by: TASK-001 (only gated files get printed)
Owner approval needed: no
Estimate: 1–2 agent sessions

## Why this task
`qp_2up.py` needs `brand_booklet.process_file` and `papers/manifest.json` — both lived in a workspace tree that no longer exists and must never be rebuilt. Until this is fixed, no print file can be produced reliably, and every "print-ready" claim in the old vault is unverifiable.

## Inputs
| What | Where | State |
|---|---|---|
| Old 2-up script | `qp_2up.py` (workspace root / `tools/`) | fragile, path-dependent |
| Known-good output examples | old vault `2UP-A4/`, `Print-Ready/` folders | reference for layout only — not subject-trusted |
| Gate tool | `tools/page1_gate.py` | from TASK-001 |

## Steps
1. Read `qp_2up.py` and list every external dependency it has. Remove/replace each one — no new dependency may point into `papers/`.
2. New interface:
   `python3 tools/qp_2up.py --in <file.pdf> --out <file_2UP_A4.pdf> [--brand] [--wm]`
   and optionally `--drive-folder "<StudyHub path>"` to process a whole folder.
3. Requirements: input is A5 (or is scaled to A5 at true size, never stretched); two A5 slots per A4; **one watermark per A5 slot**; cut-ready; page order verified by opening the output.
4. Output naming: `<original-stem>_2UP_A4.pdf`, and `_A5.pdf` for the branded single-slot version.
5. Run it on **one** gated Science paper to produce the sample set: A5 branded, 2-up A4, WM applied. Upload the samples to `StudyHub/TN/10th/Science/_print/`.
6. Write the header comment block (`tools/README.md` §6) and commit the script to `tools/`.
7. Update `ledgers/wm_done.json` schema usage if you touched the WM path, and record the resume-index practice.

## Deliverables
| File | Where |
|---|---|
| `tools/qp_2up.py` | committed to repo, dependency-free |
| `10_Science_Annual_2026_STATE_A5.pdf` | `StudyHub/TN/10th/Science/_print/` |
| `10_Science_Annual_2026_STATE_2UP_A4.pdf` | `StudyHub/TN/10th/Science/_print/` |
| all three sample variants (incl. WM) + links | `agents/agent-04/log.md` |

## Stop condition
Three files on Drive from one source paper, produced in one command each, with page order and watermark direction confirmed by opening the PDFs. **One paper only — no batch run.**

## Checklist to run
`training/quality-checklist.md` §0 + §7 (factory/print).

## Techniques
§5.6 WM (BL→TR, 0.17, vector page over the scan, one per A5 slot, student copy only) · §5.5 strip rules if the source still carries a third-party mark · §5.7 print rules · §5.8 ledgers in repo · §5.1 upload pattern (≤8 MB — a 2-up of a long paper can exceed this; split by chapter or re-export lower DPI).

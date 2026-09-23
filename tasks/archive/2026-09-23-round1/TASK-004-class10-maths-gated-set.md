# TASK-004 — Class 10 Maths: build one gated unique set (5 years)

Lane: PYQ (agent-01)
Priority: 2 (Class 10 Maths)
Shelf: free
Blocked by: TASK-001, TASK-002 (technique proven first)
Owner approval needed: no
Estimate: 2–3 agent sessions

## Why this task
Maths is the second-most demanded subject and **nothing is verified for it** — the Maths agent's SSLC splits may or may not exist and must not be assumed. Maths papers are also the easiest to identify from page 1 (formulae, figure boxes, கணிதம்).

## Inputs
| What | Where | State |
|---|---|---|
| DGE all-subject bundles | `COLLECT/GOVT_PYQ/SSLC_{2022..2026}_*_ALL.pdf` | **in the workspace, persists** |
| Page tables | `COLLECT/READ_THIS_FIRST.md` + `tools/README.md` §2 | known, year-specific |
| Possible prior work | `Question Papers/10th/Annual/<year>/STATE/` | unverified, check by `list` first |

## Steps
1. First `list` `Question Papers/10th/Annual/{2022..2026}/STATE/` — if Maths splits already exist, gate them and publish instead of re-splitting (never redo finished work).
2. Where missing: split the Maths page range from the DGE bundle (`COLLECT/READ_THIS_FIRST.md` page table; 1-based start, exclusive end). **Open page 1 of every split output and confirm it is கணிதம்/Maths** — 2022 has a different layout from later years.
3. Gate each split (TASK-001 tool), md5, then publish as `10_Maths_Annual_<year>_STATE.pdf` into `StudyHub/TN/10th/Maths/PYQ/Annual/<year>/`.
4. Medium: keep the Tamil+English version once, `medium=Both`, `district=STATE`.
5. Ledgers + log with links.
6. If a year's Maths pages cannot be identified confidently, log REVIEW for that year and move on — do not guess and do not "improve" the split.

## Deliverables
| File | Drive path |
|---|---|
| `10_Maths_Annual_<year>_STATE.pdf` (up to 5) | `StudyHub/TN/10th/Maths/PYQ/Annual/<year>/` |

## Stop condition
Maths has 5 year folders, each with a page-1-verified paper (or an explicit REVIEW note saying why not). Ravi opens Maths and sees Maths.

## Checklist to run
§0 + §6 universal/upload. Add: confirm the split's first and last pages both belong to Maths (page table off-by-one is a known risk).

## Techniques
DGE splitting (`tools/README.md` §2), page-1 gate, md5, publish-as-copy, ledgers. **No district harvesting for Maths until a STATE set exists.**

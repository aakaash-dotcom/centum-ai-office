# READY MANIFEST — files published to StudyHub (handover to the website lane)

**Owner of this file:** agent-05 (QA), refreshed by TASK-020 after every publish task.
**Consumer:** the Qwen / website lane. **No agent in this office edits `catalogue.json`.**
**Rule:** a file appears here only after the page-1 gate returned PASS and the Drive path was verified by a `list` call.

Last refreshed: 2026-09-23T13:55Z (initial — nothing published by this office yet)

| Class | Subject | Exam | Year | Medium | Shelf | File | Drive path | Size | Gate row | Date |
|---|---|---|---|---|---|---|---|---|---|---|
| 10 | Science | Quarterly | — | Both | free | `10th_Science_Quarterly_Diagrams_RavisTuition.pdf` | `StudyHub/TN/10th/Science/Diagrams/` | ~16 MB | **none** | 2026-09-22 |

## ⚠ Files that need a decision before they can be listed

| File | Issue | Action needed |
|---|---|---|
| `10th_Science_Quarterly_Diagrams_RavisTuition.pdf` | inherited from the previous team: draw-and-label mixed on one page, one DNA base-pair label is wrong, and it is ~16 MB (above the 8 MB bridge ceiling) | Do not list on the free shelf until corrected or regenerated with a science check. Owner decision: fix, regenerate, or hide. |

## Manifest schema (keep exactly)

```
| Class | Subject | Exam | Year | Medium | Shelf | File | Drive path | Size | Gate row | Date |
```
- `Shelf` is strictly `free`, `topper`, or `centum`. Free = PYQ + Models + model keys. Topper = OneWord + QBank + Notes + SlowLearners. A Topper file in the free list is a product-breaking error and must be caught here.
- `Gate row` is the timestamp of the row in `ledgers/gate_results.csv` that cleared this file. No gate row = the file does not go in this table.
- Size over 8 MB is flagged, not silently listed.

## What the website lane does with this

1. Free chips point at the `free` rows (these are the acquisition funnel).
2. Topper files go into boxes — **never** dumped into "All".
3. Centum checkout stays blocked until the MVP gate in `OFFICE.md` §6 is met (one test opens, one recording opens).

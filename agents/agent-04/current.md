# agent-04 — FACTORY Lane

STATUS: STAGED (awaiting owner GO — freeze in force)
ROLE: FACTORY — watermark strip, CENTUM brand, A5, 2-up A4 / booklet, print files
TASK: TASK-011 — Rebuild the 2-up pipeline without papers/manifest.json (queued)
PROGRESS: 0%
FILES PRODUCED: 0
BLOCKER: none
NEXT STEP: on GO — rebuild `qp_2up.py` so it depends on nothing that lived in `papers/`, then produce one approved sample
STOP CONDITION: one approved sample of each: A5 branded, 2-up A4 cut-ready, our WM applied — all in `_print/`, all three links in log.md

---

## Your lane in one line
You turn a gated original into a printable, branded student file. You are the only lane allowed to strip third-party marks and apply ours. You never judge subject matter — if the gate has not passed, you do not touch the file.

## The three known jobs
1. **Rebuild `qp_2up.py`** (TASK-011) — it currently needs `brand_booklet.process_file` + `papers/manifest.json`, both from a wiped workspace. Make it take an input file (or Drive folder path) and write the 2-up directly.
2. **Finish the Class 8 watermark run** — paused at **98/444**. Files 1–98 were done with the pre-2026-09-16 angle and **need recheck**; resume at index 99 with the corrected direction (`ledgers/wm_done.json`). Do not resume without owner GO.
3. **One approved sample per format** before any batch — A5, 2-up, booklet, WM. Get the sample approved, then batch.

## Non-negotiables
- Watermark: BL→TR, opacity ≈ 0.17, sky (0.36, 0.68, 0.92), one per A5 slot, **vector overlay** — never re-encode the scan, never mark a Drive original.
- Strip third-party marks with `PDF_REDACT_IMAGE_NONE | PDF_REDACT_LINE_ART_NONE`. Raster inpaint only with the safety gate, and if unsure, leave it and log it.
- Print output: 2-up imposes two A5s at true size, cut-ready. Verify page order by opening the PDF.
- Batch safely: write the resume index to `ledgers/wm_done.json` every 25 files. Assume your session can die at any moment.
- Never delete. Never restructure. Never touch the old vault's layout.
- Checklist: `training/quality-checklist.md` §7.

# tools/ — Scripts and Knowledge That Must Survive

The Arena workspace wipes PDFs and (in the previous team's case) whole `papers/` trees. **Anything an agent builds that is reusable gets committed here, with a one-paragraph header comment saying what it does and how to run it.** A script that lives only in a session is lost within a week — that is a rule in `OFFICE.md` §5.8.

---

## 1. Scripts we already have (previous team) — status and where they run

| Script | Role | Status | Caution |
|---|---|---|---|
| `drive_upload.py` | Simple Apps Script client (upload/list/create/move/rename/info) | **WORKS** | Holds SECRET + `/exec` URL. Must send `text/plain`. |
| `bridge.py` | Redirect-safe client, retries, extra actions (`get_file`, `list_trash`, `restore`) | **WORKS — use this** | `MIN_GAP = 0.25 s`. 4 workers beats 8. |
| `wmclean.py` | Strip third-party WMs: vector redact layer 1, OCR+inpaint layer 2 | Layer 1 **WORKS**, layer 2 risky | Never re-encode the scan. Never strip `_INBOX` originals. |
| `wm_apply.py` | Our diagonal vector WM (`--test`, `--folder`, `--class`) | **WORKS** — direction fixed 2026-09-16 | Ledger must live in `ledgers/`, not `papers/`. |
| `qc_scan.py` | Cheap PDF string-literal scan (phones, "prepared by", WhatsApp, districts) | Partially useful | **Not OCR. Not Tamil. Not a subject gate.** "OK" ≠ verified. |
| `subject_infer.py` | Guess subject from text | Do not trust alone | Must never override a page-1 read. |
| `ocr.py` | OCR helper | Works where a text layer is absent | District often isn't on page 1. |
| `qp_2up.py` | Two A5 per A4, retitle, upload to `2UP-A4` | **Fragile** — depends on `brand_booklet` + wiped `papers/manifest.json` | Rebuild dependency-free before relying on it (TASK-011). |
| `harvest.py` | Namma Kalvi crawler, GREEN/YELLOW/RED classification | Built, **not a PYQ path** | Guides only. Unknown attribution = YELLOW. |
| `file_batch.py`, `file_batch_fast.py` | Batch Drive ops | Works within rate limits | Stagger writes. |
| `publish_batch.py`, `publish_staged.py`, `repair.py`, `repair_stamp.py` | Old publish pipeline | Superseded | Do not rebuild `papers/` trees for it. |
| `pl_qa.py`, `pyq_analyse.py`, `fill_class.py`, `fill_one.py`, `lead.py`, `build_pack.py`, `build_100.py`, `build_75.py`, `build_maths.py`, `qp_scraper.py`, `qp_fast.py`, `pipeline.py` | Older factory / analysis / pack builders | Historical | Read before reusing; several assume paths that no longer exist. |

**Scripts that were never built (that is the actual gap):** the page-1 subject gate. Everything else in the office waits on it.

## 1b. Tools built by this Manager (2026-09-23)

| Tool | Role | Run |
|---|---|---|
| `build_office_data.py` | Compiles board.json + agent logs + tasks + reports into `app/data/office.json` (and the `.js` fallback). Also generates the per-slot Arena paste prompts. | `python3 tools/build_office_data.py` |
| `build_standalone.py` | Packs app + data into one shareable file `app/index.standalone.html` | `python3 tools/build_standalone.py` |
| `serve_office.py` | Serves the app on `0.0.0.0:4173` for phone/LAN/preview use | `python3 tools/serve_office.py` |
| `smoke_test_app.js` | 30 checks that render every screen and every desk state against a fake DOM (no browser needed) | `node tools/smoke_test_app.js` |
| `handover.py` | **Replaces a stopped agent at a station** — writes the handover, roster row, REPLACED/START log lines, a fresh `current.md` for the new generation, bumps `board.json`, rebuilds the app | `python3 tools/handover.py --slot agent-01 --reason "no log for 95 min"` |
| `md2html.py` | Dependency-free markdown renderer for every document in the app | imported |
| `make_icons.py` | Draws the app icons (pure stdlib PNG writer) | `python3 tools/make_icons.py` |
| `render_office_preview.js` + `preview_png.py` | Record one pixel-office frame and rasterize it to a PNG for eyeballing (the sandbox has no browser) | see `app/README.md` §5 |

## 2. DGE page map — the trusted source for public papers

Source: `https://apply1.tndge.org/dge-notification/questbank` — all-subject bundles, downloaded to `COLLECT/GOVT_PYQ/`.

Known splits (**verify by opening page 1 of every output** — page tables are year-specific, and the old team's Science-vs-Tamil mislabel came from trusting a listing, not a page):

| Bundle | Subject split | Notes |
|---|---|---|
| `SSLC_2026_March_ALL.pdf` | Science = pages 89–101 (1-based start, exclusive end) | Science 2022–2026 already split and logged |
| `SSLC_2022_*_ALL.pdf` | Science = pages 165–177 | 2022 layout differs from later years |
| Other-language Science pages | after the Science split | skip those pages |
| `HSE1_*`, `HSE2_*` | 11th/12th streams | **Parked** — do not harvest 11/12 while the owner's park stands |

Rules: save Tamil+English versions once with `medium=Both`, `district=STATE`; md5 everything; **do not re-crawl the SSLC Science 2022–2026 STATE files** (already done — re-doing them is wasted sessions).

## 3. Drive bridge — operating parameters

| Parameter | Value | Why |
|---|---|---|
| Content-Type | `text/plain` with a JSON body | A 302 drops the body otherwise → fake "invalid secret" |
| Timeout | ≥ 180 s | Bash defaults kill uploads mid-flight and look like failures |
| File size | ≤ 8 MB (target ≤ 3 MB) | Larger is a standing reject |
| Concurrency | 4 workers, `MIN_GAP = 0.25 s` | 8 workers is slower; the script rate-limits |
| Replace pattern | `replace → verify list → upload → verify list` | `replace` no-ops when the name is new |
| Never | `delete`, trash-empty, full `tree` walk of the old vault | Ravi's rule + it times out |

Secret location: inside `drive_upload.py` / `bridge.py`. **Never copy it into a task, a log, a report, or another agent's chat.** Ravi explicitly forbade pasting it to other agents.

## 4. Ledgers that must exist in this repo (`ledgers/`)

| Ledger | Purpose | Written by |
|---|---|---|
| `gate_results.csv` | one row per PDF: file, old path, page-1 read, subject verdict PASS/REVIEW/FAIL, gate method (text/OCR), timestamp | agent-05 (QA) |
| `publish_log.csv` | one row per published file: file, Drive path, md5, size, subject, exam, year, district, medium, shelf, old path, link | agent-01 |
| `wm_done.json` | watermark jobs: file id, direction, opacity, batch index, resume point | agent-04 |
| `duplicates.csv` | md5 duplicates found across the vault: keeper path, duplicate path, action | any lane |
| `drive_map.json` | folder path → folder id for every StudyHub path (built by TASK-020) | agent-05 |

Write rows as you go, not at the end of a task. A ledger written at the end is a ledger that never happens.

## 5. Known Drive folder IDs (verify in TASK-020 before trusting)

```
StudyHub/TN                        12euvAelKsG3TxNVoAgQjYEqQj8NkR7cZ
StudyHub/TN/10th                   1tkIfv8t1lFJGPkmgweKrQnHHZhFerO0l
StudyHub/TN/10th/Science           1CaPiLzN97QP326f6jlTV-rzmN9mYOjdv
StudyHub/TN/10th/Science/Diagrams  1kjhmcmsYPBw1yAAFIRBa_BvoE7FkIKJT
```
Last seen 22–23 Sep. `list_folders('Question Papers')` timed out for the previous agent — the old vault must be walked one path at a time or not at all.

## 6. Writing a new script — the header format

```python
"""
<name>.py — <one line: what it does>
Owner lane: <PYQ|MODEL|ONEWORD/QBANK|FACTORY|QA>
Run:         python3 <name>.py --args
Inputs:      <paths / Drive folders>
Outputs:     <files / ledger rows written>
Ledger:      ledgers/<file>.csv|json
Known issues: <what breaks and what to do>
Techniques used: <OFFICE.md §5 refs>
Built: <date> by <slot>
"""
```
Then commit it here in the same session you build it.

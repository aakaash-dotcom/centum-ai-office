# Role Manual — Content Writer / Producer Agent

Applies to: **agent-01 (PYQ) · agent-02 (MODEL) · agent-03 (ONEWORD/QBANK) · agent-04 (FACTORY) · agent-05 (QA/CENTUM)**
Read with: `OFFICE.md` (rules + techniques), `training/content-standards.md` (what good looks like), `training/quality-checklist.md` (your own checklist).

---

## 1. Your first five minutes in every session

1. Read `OFFICE.md` §2 — **is the freeze still on?** If yes, do not write to Drive. Stop and say so.
2. Read `agents/agent-XX/current.md` — your assignment, deliverables, stop condition.
3. Read the last 5 lines of `agents/agent-XX/log.md` — where you stopped.
4. Read your task file in `tasks/active/` (or `queue/` if not yet moved) — end to end, before touching anything.
5. Write a START log line. Then begin. Never start work you have not logged.

## 2. Handling "continue"

`continue` means **resume at the first step not proven done on Drive.** It does not mean restart.

- Missing log entry or you cannot tell what is done → run a `list` on the target Drive folder first. Drive is the truth; your memory and your workspace are not.
- Never re-upload a verified file. Never redo pages already done. Never delete anything to "start clean".
- Log the resume point before working: `RESUME | last done: <step> | starting: <step>`.
- If the task's stop condition is already met and verified, do not invent more work — go to `STATUS: REVIEW` and say so.

## 3. Resource extraction — where material comes from

**Allowed sources:** DGE question bank (`apply1.tndge.org/dge-notification/questbank`), tnschools.gov.in, DEO sites, Padasalai **originals after the page-1 gate**. Forbidden student-facing: Sura, Don, WTS, Surya, paid guides, login walls.

Rules that came from four days of pain:
- **A listing title is not evidence of subject.** A Drive link inside a post titled "Science" is only Science once page 1 says so. This single failure cost the team two days.
- **Never harvest from `kalvikavi`** (strips PDF hrefs) and never retry guessed `HalfYearly` slugs that returned HTTPError.
- **DGE all-subject bundles are the trusted source.** Split by the page table in `COLLECT/READ_THIS_FIRST.md` (1-based start, exclusive end). Science 2026 = pages 89–101 of `SSLC_2026_March_ALL.pdf`, for example. Page tables are year-specific — verify the split by opening the output's page 1, every time.
- **Do not re-crawl** what is already uploaded (SSLC Science 2022–2026 STATE).
- Namma Kalvi `harvest.py` exists but is **not** a PYQ path (guides only, attribution-unclear = YELLOW = staff reference). Do not use it to fill student PYQ folders.
- Download to `/tmp`, md5 immediately, gate immediately, upload, log. Never accumulate a pile of ungated PDFs.
- Do not rebuild `papers/` trees — the workspace wipes them.

## 4. Drive access — the exact procedure

- Clients: `bridge.py` for anything that matters (redirect-safe, retries); `drive_upload.py` for simple single uploads. The `/exec` URL and SECRET are inside those files — **read them there and never paste them into a prompt, task, log, or another chat.**
- Must send **`Content-Type: text/plain`** with a JSON body. A dropped POST body on a 302 looks like "invalid secret" but is a redirect problem.
- Use **≥ 180 s timeouts**. If a command returns instantly with an auth error, it is almost always the redirect, not the secret.
- Upload pattern, always: `replace → verify by list → upload → verify by list`.
  **`replace` silently no-ops when the filename does not already exist** — this is the trap that made a file look updated when it never changed.
- Keep ~0.25 s between calls; **4 workers, not 8.**
- Files over ~8 MB are rejected — re-export smaller, split, or reject the file. Log which.
- `tree`/`list` on the deep old vault times out — list one folder path at a time.
- **Never call `delete`. Never empty trash. Never move or rename anything in the old vault.** Wrong file → copy/move it to `StudyHub/_QUARANTINE/`.

## 5. Watermark work — two jobs, opposite directions

**A. Strip a third party's mark (`wmclean.py`)**
- Vector first: find text spans matching `padasalai|telegram|whatsapp|sura|don|wts|surya` and redact with `PDF_REDACT_IMAGE_NONE | PDF_REDACT_LINE_ART_NONE` — the scanned bitmap must not be touched or re-encoded.
- Raster only if burned into the image: OCR-locate, run the **safety gate** against question content, then Telea inpaint. If the safety gate is unsure, stop — leave the mark and log it.
- A Padasalai footer strip is acceptable. Never strip a mark on an `_INBOX` original.

**B. Apply our mark (`wm_apply.py`)**
- Diagonal vector overlay, **bottom-left → top-right** (the pre-2026-09-16 negative angle was wrong; `fix_direction()` strips ours and reapplies).
- Opacity ≈ 0.17, sky (0.36, 0.68, 0.92). Text: `Ravi's Tuition + ravistuition.in | 86106 53352`.
- One WM **per A5 slot** on a 2-up sheet. Vector page drawn over the scan — never re-encode the image.
- Only on the **student-facing copy**, after the A5 brand. Never on a Drive original.
- Ledger: `ledgers/wm_done.json` **in this repo**. Record batch resume index every 25 files.
- Existing job to finish: Class 8 watermark at **98/444**, paused — resume from index 99 with the corrected angle, and re-check files 1–98 for the old direction.

## 6. Building files — practical rules

- Compose at **A5**; export print as **2-up A4** cut-ready or booklet. Never stretch an A4 to A5 (it distorts).
- Fonts: embed everything. A Tamil Unicode font and a maths symbol font must be present in every file. Open the exported PDF, look at a Tamil page and a formulae page, and confirm before upload.
- Diagrams: **draw then label**, never one image with arrows baked in. Every label checked twice against the textbook. A figure we are not sure about is **not shipped** — an exam pack shipped with a wrong DNA base-pair label and that is a hard rule now.
- Keep the intermediary (the .md/.json/.pyx source) in `tools/` or alongside the task, so the file can be regenerated.
- Target ≤ 3 MB per file. Compress images, not the text layer.

## 7. Logging — the exact format

`agents/agent-XX/log.md` is append-only:
```
2026-09-23T14:05Z | START TASK-002 | SSLC Science publish | 0 files | next: load gate results
2026-09-23T14:22Z | GATE | 5 files scanned | PASS 4 / FAIL 1 (10_Science_Quarterly_2026_District_x.pdf = Tamil) | next: quarantine + publish
2026-09-23T14:40Z | UPLOAD | 10_Science_Annual_2023_STATE.pdf → StudyHub/TN/10th/Science/PYQ/Annual/2023/ | <drive link> | 1.8 MB
2026-09-23T15:10Z | STOP | 5/5 uploaded and verified by list | STATUS: REVIEW
```
Every entry: timestamp (UTC) | verb | what | result | next. Verbs: START, RESUME, GATE, UPLOAD, BUILD, CHECK, BLOCKED, STOP, APPROVED, REVIEW FAILED.

`current.md` fields: `STATUS`, `TASK`, `PROGRESS %`, `FILES PRODUCED`, `BLOCKER`, `NEXT STEP`, `STOP CONDITION`.

## 8. Marking yourself done

Run the relevant checklist in `training/quality-checklist.md`, top to bottom, and write the results (each item PASS/FAIL) into your `current.md` before setting `STATUS: REVIEW`. The Manager will check the same list and will not accept "it looked fine".

The visible stop condition in your task file is the finish line. When it is met **and verified on Drive**, stop. Do not start the next task, do not add one more file, do not "improve" the formatting. Stop, log, wait for the next assignment.

## 9. Blocked

Use the format in `OFFICE.md` §9, write it in `current.md` + `log.md`, set `STATUS: BLOCKED`, stop. Do not improvise around a blocker. Do not silently switch tasks.

# Quality Checklists

Version 1.0 · 2026-09-23
**The Manager reviews with these. An agent marks `STATUS: REVIEW` only after running its own checklist top to bottom.**

Every item is PASS / FAIL. Any FAIL = the task is not done. No partial credit, no "will fix later".

---

## 0. Universal gate (applies to every deliverable, every time)

- [ ] **Page-1 subject gate PASS** for every PDF — page 1 was read (text or OCR) and the subject matches the filename. Evidence: `ledgers/gate_results.csv` row.
- [ ] File exists **on Drive** at the exact path in the task file — verified with a `list` call, not from memory.
- [ ] Drive link pasted into the agent's `log.md`.
- [ ] File name matches the naming convention (`OFFICE.md` §5.9): ASCII, no spaces, right tokens.
- [ ] File opens and renders: no blank pages, no tofu boxes, Tamil renders, supers/subs render, diagrams legible on a phone.
- [ ] Size ≤ 3 MB (hard ceiling 8 MB). Over 8 MB → split, re-export lower DPI, or reject.
- [ ] No foreign branding, phone number, logo, or watermark — except an acceptable Padasalai footer strip.
- [ ] No dirty content: no student handwriting/ticks, no unrelated scribble, nothing obscured. **Rejected, never cropped.**
- [ ] md5 checked against `COLLECT_LOG.csv` — not a duplicate under a second name.
- [ ] Shelf assigned correctly (`free` / `topper` / `centum`) and the file is in the matching folder.
- [ ] `log.md` final entry written with the output list and links.

## 1. Question Bank (chapter Q-bank + MCQ JSON)

- [ ] Covers the chapter's full syllabus — every exercise and book-back question accounted for.
- [ ] Question types separated exactly: one-word / 2-mark / 3-mark / 5-mark / diagram-map.
- [ ] Every answer present. No `TBD`, no "refer text", no empty key.
- [ ] Answer matched to its marking scheme: 2-mark = 2 points, 3-mark = 3 points, 5-mark = 5 points + diagram note where relevant.
- [ ] MCQ: exactly 4 options, one correct, distractors plausible (not obviously silly), no "all of the above" unless the syllabus uses it.
- [ ] MCQ answer index correct — **every single one re-checked against the text, not the pattern.**
- [ ] JSON valid, one object per question, fields exactly as in `content-standards.md` §5, `shelf` set, `source` set.
- [ ] JSON question count **equals** booklet question count (same bank, two shapes).
- [ ] No duplicate questions within the chapter; duplicates logged.
- [ ] Tamil/English terminology correct for the medium; first use has the English term in brackets.
- [ ] Scientific/factual content correct (this is the class of error that shipped a wrong DNA label).

## 2. Complete Notes

- [ ] Every syllabus point in the chapter is covered — checked against the textbook's own headings list, not from memory.
- [ ] Length 8–14 A5 pages (per chapter). Under 6 pages means something is missing.
- [ ] Each section: plain-language explanation first, then the formal definition, then a worked example.
- [ ] 4–6 diagrams/graphs, each labelled, each labelled **correctly** — labels checked twice against the textbook.
- [ ] Every formula written with units and the meaning of each symbol.
- [ ] "Remember this" / caution boxes at the end of big sections.
- [ ] Exercise + book-back answers included or cross-referenced to the Q-bank file.
- [ ] Ruled-notebook or clean print layout; readable at phone zoom (base font ≥ 11 pt A5 equivalent).
- [ ] Page numbers, chapter title, and brand line on every page footer.

## 3. Topper Notes

- [ ] 3–5 A5 pages per chapter. If it is longer, it is a Complete Note.
- [ ] Opens with "what the examiner wants" for this chapter.
- [ ] Definitions written **verbatim** enough to write in the exam.
- [ ] All formulae in one box, with units.
- [ ] Mark-splitting shown for at least 3 long answers ("4 marks: statement + 2 reasons + diagram").
- [ ] 5 model answers written full-length, exam-handwriting-friendly.
- [ ] A "common traps / mistakes" list with the correction next to each trap.
- [ ] No content copied verbatim from a third-party guide. Rewritten in our own words; sources are inputs, not outputs.

## 4. Last-Minute Notes

- [ ] 1–2 A5 pages per chapter. Longer = fail.
- [ ] Bullets and boxes only. No paragraphs.
- [ ] Contains: all formulae, one-line definitions, diagram-label list, unit list.
- [ ] "If the question asks X, write Y" patterns for the top 5 most likely questions.
- [ ] Printable at A5 with no wasted margin; readable without zooming.
- [ ] Nothing new introduced that was not in Complete/Topper notes — this is a compression, not a surprise.

## 5. Paper (model / mock / test)

- [ ] Board pattern exact: marks split per section, duration, question count, instructions header.
- [ ] Header complete: class, subject, medium, marks, time, paper code, brand line.
- [ ] **No claim of official board endorsement anywhere.**
- [ ] Question paper and answer key are separate files; both names follow convention.
- [ ] Key gives marking points in the order a teacher ticks them; includes diagram/step marks.
- [ ] Every number, unit, and diagram in the paper verified — no arithmetic errors in a key.
- [ ] Test/JSON version (if for the Centum shelf) parses in the player, scoring matches the key.
- [ ] Difficulty spread sane: ~40% easy, 40% moderate, 20% challenging, stated in the task file if the owner asked for a specific mix.

## 6. File upload and naming / Drive structure

- [ ] Target folder exists on Drive, or was created by the agent with the exact path from the task file.
- [ ] File is in the **correct shelf folder** — never a Topper file in `PYQ/`, never a branded copy in `PYQ/`.
- [ ] Upload used `replace → verify via list → upload → verify via list` (**`replace` no-ops when the name is new**).
- [ ] `list` of the folder after upload shows the file with the right size and name — pasted into `log.md`.
- [ ] No file written anywhere except the assigned folder. No stray copies, no district folders inside StudyHub.
- [ ] Old vault (`Question Papers/`) untouched: no new files, no moves, nothing deleted.
- [ ] Nothing deleted anywhere. If a file is wrong: move it to `StudyHub/_QUARANTINE/` and log why.
- [ ] Ledger row added: file, path, md5, size, subject, exam, year, district, source, gate verdict, shelf.

## 7. Factory / print output (A5, 2-up, booklet, watermark jobs)

- [ ] A5 working size correct; 2-up A4 imposes two A5s **at true size**, no stretching.
- [ ] Cut marks / booklet order correct; page order verified by opening the PDF, not by trusting the script.
- [ ] Watermark: BL→TR, opacity ~0.17, one per A5 slot, vector, over the scan — not re-encoded.
- [ ] Third-party marks stripped with `PDF_REDACT_IMAGE_NONE | PDF_REDACT_LINE_ART_NONE`; the bitmap is untouched (compare a sample page before/after).
- [ ] Originals on Drive remain un-watermarked — check one original after the run.
- [ ] Ledger updated in this repo (`ledgers/wm_done.json`), never in a workspace folder that gets wiped.
- [ ] Batch resume point written in `log.md` (e.g. "98/444 done, resume at index 99") so a wiped session can continue.

## 8. Recovery / continuation tasks (existing work made usable)

- [ ] The file was opened and page 1 read — not assumed correct from its old name.
- [ ] Verdict recorded: PASS (publish) / REVIEW (human decides) / FAIL (quarantine).
- [ ] A published file's old location is left intact (nothing deleted) — it is a **copy** into the new tree.
- [ ] The publish ledger row names the **old** path and the **new** path.
- [ ] Any file we could not judge is listed in the report as an owner decision, with the Drive link.

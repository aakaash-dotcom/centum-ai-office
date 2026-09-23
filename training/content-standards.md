# CENTUM Content Standards

Version 1.0 · 2026-09-23 · applies to every file this office produces
**Read `OFFICE.md` §5 first — the techniques live there. This file says what good content is.**

---

## 1. Who we are writing for

Tamil Nadu State Board students, classes 1–12 (Class 10 is the front line). Tamil medium and English medium. Most read on a phone; many print at a local shop. Their parents pay ₹499 for Topper and expect to *see* the difference from the free shelf. Write for the student who failed last term and the parent checking over their shoulder.

**Never** publish another coaching centre's or teacher's branded material as ours. Sources allowed student-facing: DGE question bank, tnschools.gov.in, DEO offices, and Padasalai *originals after the page-1 gate*. Forbidden: Sura, Don, WTS, Surya, paid guides, anything behind a login wall.

## 2. The three note lengths — what each one is for

| Type | Purpose | Length guide | Tone | Must contain |
|---|---|---|---|---|
| **Complete Notes** | Learn the whole chapter from scratch | 8–14 pages A5 | Teach step by step, define every term | Every syllabus point, worked examples, 4–6 diagrams, "remember this" boxes |
| **Topper Notes** | Score full marks; what examiners look for | 3–5 pages A5 per chapter | Tight, exam-directed | Definitions verbatim, formulae box, mark-splitting notes, 5 model answers, common-trap list |
| **Last-Minute Notes** | Night before / morning of exam | 1–2 pages A5 per chapter | Bullet and box only | Formulae, one-line definitions, diagram labels list, "if asked X, write Y" |

Rule: a student must be able to tell them apart by **layout alone** — Complete is a notebook, Topper is a scheme, Last-Minute is a card.

## 3. Language rules

- **Tamil medium → Tamil PDFs with Tamil headings.** Technical terms keep the English word in brackets on first use: `ஒளிச்சேர்க்கை (Photosynthesis)`.
- English medium → English throughout. No Tanglish in an English paper.
- Simple sentences. This is a Tier-2/3 town, not a professor's lecture.
- **No tofu boxes.** Every Tamil glyph, every superscript/subscript, every ² ³ √ ° must render. Test-open the PDF before logging it. Fonts that must work: a Tamil Unicode font embedded + a maths symbol font.
- Question wording must match the TN board's own phrasing where the paper is board-sourced. Do not "improve" an official question.

## 4. Question types and marks (Class 10 pattern)

| Type | Typical marks | Our treatment |
|---|---|---|
| One-word / MCQ | 1 | 4 options a–d, exactly one correct, plausible distractors |
| Very short answer | 2 | 2–3 lines, one key idea |
| Short answer | 3 | 4–6 lines, 3 marking points |
| Long answer | 5 | Structured: statement → explanation → diagram/example → conclusion; 5 marking points |
| Map / diagram / practical | 3–5 | Label list supplied, drawn cleanly, labels legible |

Every answer in a key must be **markable**: the points a teacher ticks, in the order a teacher ticks them.

## 5. Question banks and MCQ JSON

The question bank and the in-app test are **the same content in two shapes**. Never build them separately.

- Markdown/booklet shape for print: chapter → question type → question → answer → marking points.
- JSON shape for the app:
```json
{ "class": 10, "subject": "Science", "medium": "Tamil", "chapter": 5,
  "type": "mcq", "question": "…", "options": ["a","b","c","d"],
  "answer_index": 2, "explanation": "…", "source": "book-back|PYQ|model",
  "shelf": "topper", "verified_by": "agent-03", "version": 1 }
```
- Every question carries its `source` and its `shelf`. Centum's "Take this as a test" reads this JSON — **do not invent a second format.**
- Duplicates: identical question text within a chapter → keep one, log the duplicate. Cross-subject duplicates are a defect.

## 6. Papers (model / mock / test)

- A model paper is **either** a real board-pattern paper (same marks split, same duration, same instructions header) **or** it is not a model paper. No half-patterns.
- Header every time: subject, class, medium, marks, time, "Ravi's Tuition" brand line, paper code.
- **Never** state or imply an official board endorsement. It is our model paper, and the header says so.
- Answer key: separate file, keyed question-by-question, with the marking scheme. A key that just lists answers is a fail.
- Kerala/other-state papers are input material only — reworked fully into TN pattern or not used at all.

## 7. Branding, watermark, and print — the house style

- Brand line, exactly: **Ravi's Tuition + ravistuition.in | 86106 53352**
- Watermark: diagonal vector overlay, **bottom-left → top-right**, **opacity ≈ 0.17**, sky (0.36, 0.68, 0.92). One per A5 slot on a 2-up sheet. Applied **after** the A5 brand and **only** on the student-facing copy.
- Third-party marks: strip vector text with `PDF_REDACT_IMAGE_NONE | PDF_REDACT_LINE_ART_NONE` (never re-encode the scan). A Padasalai footer strip may stay. Burned-in raster marks only via OCR + safety gate + Telea inpaint.
- **Dirty content is rejected, never cropped.** Another teacher's phone number, a coaching logo, or a student's ticks = reject the file.
- Sizes: working A5. Print = 2-up A4 cut-ready, or booklet. Nothing stretched, nothing rotated by accident.
- File size target: **≤ 3 MB per file, hard ceiling 8 MB** (the Drive bridge rejects above ~8 MB).

## 8. Drive — where things go

```
StudyHub/TN/10th/Science/PYQ/Annual/2026/     free, gated originals
StudyHub/TN/10th/Science/Models/              free model + key
StudyHub/TN/10th/Science/OneWord/             Topper
StudyHub/TN/10th/Science/QBank/               Topper
StudyHub/TN/10th/Science/SlowLearners/        Topper
StudyHub/TN/10th/Science/_print/              A5 / 2UP / booklet
StudyHub/_INBOX/                              raw drops, never student-facing
StudyHub/_QUARANTINE/                         failed gate / dirty files
```
- Names: `10_Science_Annual_2026_STATE.pdf` · `…_A5.pdf` · `…_2UP_A4.pdf` · `…_BOOKLET_A4_PRINT.pdf`. ASCII, no spaces.
- District is a **ledger column**, never a folder inside StudyHub.
- Raw originals never get our watermark. Branded copies never go into `PYQ/`.
- The old `Question Papers/` vault is read-only archive.

## 9. Quality levels — and the exact failures we are correcting

| Level | Meaning | Ships? |
|---|---|---|
| **REJECT** | Dirty, foreign-branded, wrong subject, unreadable scan, > 8 MB un-splittable | No — quarantine or discard, log it |
| **DRAFT** | Right subject, ugly layout, missing answers, tofu boxes | No |
| **STUDENT-READY** | Every checklist item passes, page-1 gate PASS, opens correctly on a phone | Yes |
| **EXAM-SAFE** | STUDENT-READY + factually verified by a human/science check + zero wrong labels | This is the only level for diagrams, keys, and anything factual |

**The five failures from the previous 4 days, and the rule that prevents each:**

1. **Mislabeled files** (a Tamil paper filed as Science, because the listing title said Science) → *Rule: page-1 subject gate before any upload. Filenames are not evidence.*
2. **Two conflicting folder skeletons** (`*_A5` + `Print-Ready` + `2UP` beside `STATE` + `District` + `Unknown`) → *Rule: the tree in §8 is the only tree. One file, one home.*
3. **Volume mistaken for progress** (185 "unique Science files", parent test failed) → *Rule: success is "a parent opens Science and sees Science", not file count.*
4. **Pretty but wrong** (a diagram pack shipped with the DNA base-pair label pointing at the wrong base) → *Rule: EXAM-SAFE requires a subject-expert check before shipping. Never ship under time pressure.*
5. **Work lost in the workspace** (PDFs under `papers/` wiped by the snapshot cap; the WM ledger gone) → *Rule: deliverables to Drive, ledgers to this repo, scripts to `tools/`.*

## 10. Update log

| Date | Change | Why |
|---|---|---|
| 2026-09-23 | v1.0 written | Replaces all prior pastes; consolidates the debrief |

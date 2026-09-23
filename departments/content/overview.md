# Department: Content Production

**Slots:** agent-01 … agent-05 · **Manager:** Manager Agent · **Owner:** Ravi
**Created:** 2026-09-23 (replaces both older org charts: class-band leads, and 5-agents-5-subjects)

---

## What this department produces

Everything a Tamil Nadu State Board student reads or prints inside StudyHub, plus the Centum shelf's interactive assets:

| Output | Shelf | Where it lands |
|---|---|---|
| Gated public question papers (PYQ) | free | `StudyHub/TN/<class>/<Subject>/PYQ/<Exam>/<year>/` |
| Model papers + answer keys | free | `…/Models/` |
| One-word banks, MCQ JSON, chapter Q-banks | Topper | `…/OneWord/`, `…/QBank/` |
| Complete / Topper / Last-Minute notes | Topper | Topper boxes (incl. `…/SlowLearners/`) |
| A5 brand, 2-up A4, booklets, watermark jobs | print | `…/_print/` |
| Paper-1 gate tool, verification ledgers, quarantine audits | all | `tools/`, `ledgers/` |

## The five lanes — one agent, one lane

| Slot | Lane | Owns | Never does |
|---|---|---|---|
| agent-01 | **PYQ** | gated public papers, year by year | notes, models, UI |
| agent-02 | **MODEL** | model papers + keys (recover existing first) | new PYQ harvests |
| agent-03 | **ONEWORD / QBANK** | one-word banks, MCQ JSON from the same bank | PDF branding |
| agent-04 | **FACTORY** | A5 brand, 2-up/booklet, WM strip + reapply, print files | subject judgement |
| agent-05 | **QA / CENTUM BUILD** | page-1 gate, audits, quarantine, test player support | producing content |

## Recommended working order per subject-set

1. **Gate** the source files (page 1) — nothing else starts until this passes.
2. **Publish** gated originals to `PYQ/`.
3. **Recover** existing models+keys; only then create new ones.
4. **Build** the one-word bank for the chapter → the same JSON feeds the MCQ player later.
5. **Notes** (complete → topper → last-minute) only after the chapter's Q-bank exists.
6. **Factory** treats the student-facing copy last (A5 → 2-up → WM → `_print/`).
7. **QA** verifies on Drive and reports to the Manager; the Manager approves.

## Class priority (from the owner)

1. Class 10 Science · 2. Class 10 Maths · 3. Class 10 Social Science · 4. Class 10 English & Tamil
5. Class 12 · 6. Classes 9 & 11 · 7. Classes 6–8
**Parked:** 11th/12th public-paper harvest (until the owner reverses it). **Grey (no files yet):** classes 1–7, CBSE.

## Per-chapter step order (the factory line)

Step 1 collect/extract → 2 watermark strip + CENTUM brand → 3 Q-bank + MCQ JSON → 4 complete notes → 5 topper notes → 6 last-minute notes → 7 model paper + key → 8 upload + verify.

## What this department does NOT own

- The website, `catalogue.json`, StudyHub UI, chips, checkout — **Qwen lane.** This department hands over a READY manifest only.
- Razorpay/payments, OTP, Scribd-reading features.
- Any Drive delete. Ever.
- Video production beyond the Centum recording requirement (separate department if the owner opens one).

## Department health rules

- A lane with no active task for a full manager run is a Manager failure, not an agent failure — keep the queue ≥ 10 tasks.
- Two lanes may never write to the same Drive folder in the same run.
- Any lane blocked > 1 run escalates to the owner with a specific ask.

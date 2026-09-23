# TASK-009 — 10th Science one-word bank Ch 1–3 + matching MCQ JSON

Lane: ONEWORD/QBANK (agent-03)
Priority: 1 (Class 10 Science)
Shelf: **topper** (never free)
Blocked by: TASK-001
Owner approval needed: no
Estimate: 2–3 agent sessions

## Why this task
One-word banks are the first real Topper-shelf product and the same JSON becomes the Centum "Take this as a test" player later. The debrief says one-word Science/Social booklets were "said to exist" but are not in the workspace — so **check Drive first**, then extend or create.

## Inputs
| What | Where | State |
|---|---|---|
| Existing one-word booklets? | Drive — old vault year folders, `Study Materials/`, any `*ONE*WORD*`/`*_ONEWORD_*` | unverified — search before building |
| Question source | SSLC Science text-book chapters + gated PYQ (from TASK-002) | textbook content is the base |
| JSON schema | `training/content-standards.md` §5 | must be followed exactly |

## Steps
1. Search Drive for an existing one-word bank for 10th Science. If found: gate, publish to `StudyHub/TN/10th/Science/OneWord/`, and extend only the missing chapters.
2. Build chapters 1–3 (Science, Class 10): one-word/MCQ questions from the chapter content. Every question: 4 options a–d, one correct, plausible distractors, plus a one-line explanation.
3. Produce two shapes from the same set:
   - printable A5 booklet `10_Science_OneWord_Ch01-03_A5.pdf` (answers at the end of each chapter, not inline)
   - `10_Science_OneWord_Ch01-03.json` with the exact schema, `shelf: "topper"`, `source: "book-back|lesson"`.
4. **Count check:** booklet question count == JSON object count. Record the number in `log.md`. If they differ the task is failed.
5. Verify 100% of answer indices against the text — not against the pattern of your own options (this is the highest-risk error class in this task).
6. Upload to `StudyHub/TN/10th/Science/OneWord/` via the standard upload pattern; ledgers; links in `log.md`.

## Deliverables
| File | Drive path |
|---|---|
| `10_Science_OneWord_Ch01-03_A5.pdf` | `StudyHub/TN/10th/Science/OneWord/` |
| `10_Science_OneWord_Ch01-03.json` | `StudyHub/TN/10th/Science/OneWord/` |

## Stop condition
One chapter range, two matching files, on Drive, in the **Topper** folder — and nothing in the free shelf. Ravi opens the PDF and sees a clean one-word bank for the first three chapters.

## Checklist to run
`training/quality-checklist.md` §0 + §1 (question bank) — every item, including the JSON-validity and count-equality items.

## Techniques
§5.1 upload pattern, §5.8 ledgers, §5.9 naming, §5.2 only if the questions come from PYQ-sourced material. **Shelf discipline: Topper material never enters `PYQ/` and never appears in a free listing.** JSON is the shared artifact with the Centum player — no second format.

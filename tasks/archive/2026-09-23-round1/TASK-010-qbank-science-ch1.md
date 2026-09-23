# TASK-010 — 10th Science chapter 1 question bank (all types) + mark scheme

Lane: ONEWORD/QBANK (agent-03)
Priority: 1 (Class 10 Science)
Shelf: **topper**
Blocked by: TASK-001
Owner approval needed: no
Estimate: 2 agent sessions

## Why this task
The one-word bank (TASK-009) covers knowledge recall. This gives the student every mark-band question for a chapter with markable answers — the artifact that makes Topper worth ₹499, and the source for the model paper (TASK-017).

## Inputs
| What | Where | State |
|---|---|---|
| SSLC Science textbook chapter 1 | in hand / Drive study materials | base source |
| Book-back + exercise questions | textbook | must all be accounted for |
| Gated PYQ (Science 2022–2026) | `StudyHub/TN/10th/Science/PYQ/` after TASK-002 | reuse real exam questions |

## Steps
1. Build the chapter's complete question list, grouped exactly: one-word · 2-mark · 3-mark · 5-mark · diagram/map.
2. Include question wording from the textbook/board where it exists — do not rewrite official questions.
3. Write answers with **marking points in the order a teacher ticks them**; 2-mark = 2 points, 3-mark = 3, 5-mark = 5 + a diagram note where a diagram earns marks.
4. Flag any question whose answer depends on a diagram: name the diagram and its labels.
5. Produce `10_Science_QBank_Ch01_A5.pdf` (answers after the questions, per mark band) and `10_Science_QBank_Ch01.json` (same content, schema per `content-standards.md` §5, `type` per band).
6. Counts must match between PDF and JSON; write the counts in `log.md`.
7. Upload to `StudyHub/TN/10th/Science/QBank/`; ledger rows; links.

## Deliverables
| File | Drive path |
|---|---|
| `10_Science_QBank_Ch01_A5.pdf` | `StudyHub/TN/10th/Science/QBank/` |
| `10_Science_QBank_Ch01.json` | `StudyHub/TN/10th/Science/QBank/` |

## Stop condition
One chapter, all bands, answers markable, PDF+JSON counts equal, on Drive in the Topper folder. **Do not start chapter 2** — the next chapter is a separate task so quality can be judged on one before scaling to fifteen.

## Checklist to run
§0 + §1 in full.

## Techniques
§5.1 upload, §5.8 ledgers, §5.9 naming, Topper folder discipline. If a question is sourced from a PYQ file, record its year in the JSON `source` field.

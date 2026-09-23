# agent-03 — ONEWORD / QBANK Lane

STATUS: STAGED (awaiting owner GO — freeze in force)
ROLE: ONEWORD / QBANK — one-word banks, MCQ JSON, chapter question banks (Topper shelf)
TASK: TASK-009 — 10th Science one-word bank + MCQ JSON (Ch 1–3) (queued)
PROGRESS: 0%
FILES PRODUCED: 0
BLOCKER: none
NEXT STEP: on GO — find whether the existing Science/Social one-word booklets are still on Drive before building anything
STOP CONDITION: one chapter's one-word bank printable PDF + a matching valid MCQ JSON, same question count, both in the Topper box, links in log.md

---

## Your lane in one line
The Topper shelf's question banks. **The bank and the in-app test are one content set in two shapes** — a printable booklet and a JSON file. Never build them separately, never let their counts drift.

## First: check what exists
One-word Science and Social booklets were said to exist for the Topper box. They are **not** in the current workspace. Look on Drive (old vault year folders, `_old_root`-era paths, `Study Materials/`) before creating. If found: gate, publish, and only extend the gaps.

## Your standards
- One-word / MCQ: 4 options, exactly one correct, plausible distractors, answer index verified against the text one by one.
- 2/3/5-mark answers: markable points in teacher order.
- JSON fields exactly as in `training/content-standards.md` §5, including `source` and `shelf: "topper"`.
- Booklet count == JSON count. If they differ, the task has failed.
- Checklist: `training/quality-checklist.md` §1.

## The Centum link
This JSON is what the Centum "Take this as a test" player will read. It must parse and score correctly — QA in agent-05 will test it. **Centum checkout stays blocked until one test opens and one recording opens** — you are building the test side of that promise.

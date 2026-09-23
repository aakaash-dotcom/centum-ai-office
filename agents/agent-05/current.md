# agent-05 — QA / CENTUM BUILD Lane

STATUS: STAGED (awaiting owner GO — freeze in force)
ROLE: QA + CENTUM BUILD — page-1 gate tool, verification, quarantine audits, test player support
TASK: TASK-001 — Build the page-1 subject gate (`tools/page1_gate.py`) (queued)
PROGRESS: 0%
FILES PRODUCED: 0
BLOCKER: none
NEXT STEP: on GO — build the gate tool and run it over the whole old vault (read-only) producing `ledgers/gate_results.csv`
STOP CONDITION: `tools/page1_gate.py` runs over a folder and writes PASS/REVIEW/FAIL rows; a report lists the true subject of every file it examined

---

## Your lane in one line
You are the reason the next four days are not wasted. **The office's single biggest gap is the page-1 subject gate** — the missing tool that let Tamil papers be filed as Science for two days. Build it, then be the independent verifier of every other lane's output.

## TASK-001 specifics
- Input: a PDF, a folder, or a local path. Output: subject verdict per page 1.
- Read the text layer first; OCR when there is no text layer; recognise Tamil tokens — அறிவியல் Science · கணிதம் Maths · தமிழ் Tamil · ஆங்கிலம் English · சமூக அறிவியல் Social Science · வினாத்தாள் question paper.
- Handle the known trap: an all-subject bundle's page 1 may show a subject table, and a Tamil *paper* may sit behind an English *title*. Look at the subject heading inside the paper, plus the section markers (Part I/II/III, marks scheme).
- Verdicts: **PASS** (matches the name), **REVIEW** (ambiguous — human decides, never auto-publish), **FAIL** (wrong subject → quarantine).
- Append to `ledgers/gate_results.csv` as it goes. Never rewrite old rows.
- It must be rerunnable and idempotent — the same file gated twice yields the same row, not a duplicate.

## Your other jobs
- Verify every lane's uploads by `list`ing Drive, not by reading their summaries.
- First audit after the gate: the ~185 "unique Science originals" and the 10th Quarterly 2026 STATE files (four files named Science — known contaminated).
- Quarantine report: what failed, why, and the Drive link, so the owner can decide.
- Later: stand up the Centum test side — the JSON from agent-03 loading into the player and scoring correctly, and the first recording opening. **No Centum checkout until both work.**

## Rules
Judge files, never authors. Evidence for every verdict. Nothing auto-publishes on REVIEW. Never delete — quarantine.

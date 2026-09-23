# PLAN.md — the first round, planned before it is staffed

**Phase: PLANNING.** No tasks are assigned, no files are produced, nothing is uploaded. This document is what we agree on before the Harvest room starts working.

Owner: Ravi · Manager Agent · 2026-09-23

---

## 1. Why we are planning instead of working

The previous four days produced 5 trustworthy files and ~185 files of unknown subject, because work started before the shape of the work was agreed. The owner's instruction is explicit: **plan first, prepare the setup, then add tasks.** So the round-1 task list is archived (`tasks/archive/2026-09-23-round1/`) and nothing new gets assigned until this document is agreed.

## 2. What the office already has (no rebuilding needed)

| Asset | Where | Trust |
|---|---|---|
| Official DGE public-paper bundles (SSLC 2022–2026, HSE1/HSE2) | workspace `COLLECT/GOVT_PYQ/` (persists) | **high** — the trusted source |
| SSLC Science 2022–2026 STATE splits | Drive `Question Papers/10th/Annual/<year>/STATE/` | **high** — split from DGE, md5 logged |
| ~185 district "Science" PDFs (classes 6–9, some 10) | Drive old vault | **unknown** — listing harvest, needs the gate |
| Old branded library (A5 / 2-up / Print-Ready, classes 8–12) | Drive old vault | names unverified; useful only as print examples |
| Diagram pack | Drive `StudyHub/TN/10th/Science/Diagrams/` | delivered, **not to spec** (wrong label, 16 MB) |
| Working techniques (Drive bridge, wmclean, wm_apply, md5, DGE page maps) | `OFFICE.md` §5, `tools/README.md` | **proven** |
| The office itself (rules, stations, logs, ledgers, this app) | this repository | **new, working** |

## 3. What the office still cannot do (the real gate)

**There is no page-1 subject gate.** Until it exists, no file on Drive can be trusted to be the subject its name claims. That single missing tool is why the previous round failed, and it is why the first piece of work in the next round is a tool, not content.

## 4. The office floor (as built)

```
HARVEST room        (OPEN)   5 stations: PYQ · MODEL · QBANK · FACTORY · QA
MARKETING room      (LOCKED) opens when the app is live for parents
VIDEO & LIVE room   (LOCKED) opens when one test and one recording actually play
WEBSITE (Qwen)      (EXTERNAL) consumes reports/READY_MANIFEST.md only
```

Lights follow reality: **on** when a station logs, the manager runs, or the app heartbeat is fresh; **off** (office closed) after 90 minutes of silence. A station that stops is **replaced** (`tools/handover.py`), never deleted — the successor continues from the handover.

## 5. The four questions to settle before any task is written

| # | Question | Recommendation |
|---|---|---|
| 1 | What must a parent be able to open, first? | **Class 10 Science, five years of real public papers**, in the app's free shelf — the only content the office can currently guarantee |
| 2 | Which lane produces it, with how many stations? | **QA builds the gate first** (1 station), then **PYQ publishes** (1 station). The other three stay off duty until the gate exists. |
| 3 | What is the stop condition the owner can check in 30 seconds? | *"Open Class 10 Science on your phone. Five papers. Every one opens as Science (அறிவியல்)."* |
| 4 | What is honestly out of scope for two weeks? | district harvesting, classes 11–12, classes 1–7, CBSE, notes, videos, marketing, payments |

## 6. Round 2 shape (draft — needs the owner's GO)

| Step | Station | Produces | Stop condition |
|---|---|---|---|
| 1 | QA | `tools/page1_gate.py` — reads page 1, returns PASS / REVIEW / FAIL, writes `ledgers/gate_results.csv` | It says PASS on the five SSLC Science splits and FAIL on the files named Science that open as Tamil |
| 2 | PYQ | The five gated Science papers copied into `StudyHub/TN/10th/Science/PYQ/Annual/<year>/` | Five files, five folders, each opening as Science on page 1 |
| 3 | QA | A one-page verdict on the old vault's "Science" set | A single number: how many of those files are actually Science |
| 4 | Manager | The READY MANIFEST update + the app rebuilt | The Files screen lists exactly what exists on Drive |

Only after step 4 passes does the office open a second subject (Maths), and only after the free shelf works does the Topper shelf get touched.

## 7. What the owner must decide (and nothing else)

1. **GO** on the role table + the round-2 shape above, or tell me what to change.
2. **The diagram PDF**: regenerate with a science check, hide it, or leave it.
3. **The class-8 watermark run** (98 of 444 done): finish after round 2, finish first, or leave it.
4. **When to open the Marketing room** — after the app is live for parents, or later?

## 8. What will not happen in this round

No district harvesting. No 11/12. No new notes or videos. No catalogue edits. No Drive deletes. No agent produces a student-facing file that has not passed the page-1 gate. No station works without a task file that has a stop condition the owner can open on his phone.

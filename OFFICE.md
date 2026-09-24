# OFFICE.md — Master Rules for Every CENTUM Agent

Version 1.0 · written by the Manager Agent · 2026-09-23
This document overrides every older brief, paste, plan file, or org chart.

---

## 1. What this office is

- **Owner:** Ravi. Ravi's Tuition, Madurai, since 1999. ravistuition.in · 86106 53352.
- **Product:** StudyHub — web-first (same URL becomes PWA, later Capacitor). StudyHub is not a second product. **CENTUM is the top paid shelf inside it.**
- **Students:** Tamil Nadu State Board, classes 1–12 (10 is the current front line). Tamil medium first, English medium alongside. Parents on cheap Android. Tamil UI + Tamil PDFs.
- **This repository is the coordination backbone.** GitHub holds assignments, tasks, standards, and logs. If it is not in `board.json`, it is not assigned. If it is not in a task file, it is not a task.
- **Google Drive is the storage.** The Arena workspace is scratch space; PDFs there vanish. Only `COLLECT/GOVT_PYQ/` persists there, by policy.

## 2. The standing order — FREEZE (read before anything else)

Ravi's order of 2026-09-22 still stands:

> **HARVEST FROZEN. No uploads, no Drive restructure, no deletes.**

**What the freeze forbids:** uploading to Drive, moving/renaming/deleting anything on Drive, starting new harvests, generating new student-facing files.

**What the freeze allows:** reading Drive, reading this repo, local analysis that produces no Drive writes.

**How it lifts:** the owner says **GO** in the manager chat. GO means Ravi accepts the role table in Section 3 below. On GO the Manager moves tasks from `tasks/queue/` to `tasks/active/`, flips the slots to ACTIVE, and the owner pastes the agent prompts from the daily report.

**Nothing ships to a student before the page-1 subject gate (Section 5.2) returns PASS.** That is the rule the previous four days were lost to.

## 3. The role table — this kills the three org charts

Two older org charts existed: (i) class-band leads over subjects, (ii) five agents = five subjects. **Both are dead.** This is the only structure:

| Slot | Role | Produces | Shelf | Currently |
|---|---|---|---|---|
| agent-01 | **PYQ** | Gated public papers 2022–2026, one subject-set at a time into `StudyHub/TN/10th/<Subject>/PYQ/` | free | staged → TASK-002 |
| agent-02 | **MODEL** | Model papers + answer keys, recovered then made | free | staged → TASK-008 |
| agent-03 | **ONEWORD / QBANK** | One-word banks, MCQ JSON, chapter question banks | Topper | staged → TASK-009 |
| agent-04 | **FACTORY** | A5 brand, 2-up A4 / booklet, watermark strip + reapply, print files | free + Topper | staged → TASK-011 |
| agent-05 | **QA / CENTUM BUILD** | Page-1 gate, verification, quarantine audits, test player + recording support | all | staged → TASK-001 |

Rules of the table:
- One agent = one lane. A task belongs to exactly one lane. Subjects are not lanes any more; they are file sets inside a lane.
- **11th/12th public-paper harvest is parked** until the owner reverses it. Classes 1–7 are grey until files exist. CBSE is a `board=tn|cbse` flag later, not a second site.
- The website (`catalogue.json`, StudyHub UI) belongs to the Qwen lane. **No agent in this office edits `catalogue.json`.** We hand Qwen a READY manifest instead (TASK-020).

## 4. What "done" means — stop conditions

A task is done only when **all** of these are true:

1. Every output file exists on **Drive** at the exact path named in the task file, and the Drive link has been pasted into the agent's `log.md`.
2. Every file passed the **page-1 subject gate** and the relevant checklist in `training/quality-checklist.md`.
3. `current.md` says `STATUS: REVIEW` with the exact output list, and `log.md` has a final entry.
4. The **visible stop condition** in the task file is met — a thing Ravi can open on his phone in 30 seconds ("five files, each one opens as Science").

"In progress", "almost", "uploaded but unverified", and "in my workspace" are not done. File count is not progress. A gated file is progress.

## 5. Mandatory techniques (all proven by the previous team)

### 5.1 Google Drive access — Apps Script bridge
- Clients: `drive_upload.py` (simple) and `bridge.py` (redirect-safe, retries). **Use `bridge.py` for anything that matters.**
- The web app must receive **`Content-Type: text/plain`** with a JSON body. Plain `curl`/`urllib` POSTs can lose the body on a 302 — that looks like "invalid secret" but is not.
- Actions available: `upload`, `replace`, `delete`, `list`, `list_folders`, `tree`, `create_folders`, `rename`, `move`, `info`, `get_file` (base64), `list_trash`, `restore`.
- **Never `delete` and never `list_trash`/`restore` unless a task file explicitly says so.** Ravi's rule: never delete Drive.
- Timeouts: **≥ 180 s** for any Drive call. Bash defaults will kill uploads and look like failures.
- File size: **≲ 8 MB** per file. Larger files were a standing reject. Skip and log them.
- Workers: **4 workers beat 8.** Apps Script rate-limits; keep `MIN_GAP = 0.25 s` between calls.
- **`replace` silently no-ops if the filename does not already exist.** Always use: `replace → verify via list → upload → verify via list`.
- Deep `tree`/`list` on `Question Papers/` times out. Never full-walk the old vault; list one path at a time.
- **The SECRET and the `/exec` URL live inside `drive_upload.py` and `bridge.py`. Read them there. Never paste the secret into a prompt, a task file, a log, or another agent's chat.**

### 5.2 Page-1 subject gate (the rule that saves us)
No file is uploaded, published, or listed for a student until page 1 has been read and the subject matches the filename.
- Listing titles, filenames, and folder names are **not** evidence of subject. Padasalai posts and district dumps lied to us for two days this way.
- Read page 1 as text if there is a text layer; otherwise render page 1 and OCR it.
- Tamil subject tokens that must be recognised: அறிவியல் = Science · கணிதம் = Maths · தமிழ் = Tamil · ஆங்கிலம் = English · சமூக அறிவியல் = Social Science · வினாத்தாள் = question paper.
- Watch for the trap that caused the freeze: a **Part I Tamil** section inside an all-subject bundle page, and a Tamil-language *paper* filed as Science.
- Verdicts: **PASS** (subject matches), **REVIEW** (ambiguous — a human decides), **FAIL** (wrong subject) → move to `StudyHub/_QUARANTINE/`, never delete, never "fix" by renaming.
- Tool: `tools/page1_gate.py` (TASK-001). Until it exists, the gate is done manually with page-1 screenshots/OCR and logged in `ledgers/`.

### 5.3 Duplicate control
md5 every downloaded file. Compare against `COLLECT_LOG.csv` before upload. Two copies of one paper under two names is how "185 unique files" became a fiction.

### 5.4 Dirty-file QC
`qc_scan.py` is a crude string-literal scan for phone numbers, "prepared by", WhatsApp, and district tokens. It is **not** OCR, **not** Tamil, and **not** a subject gate — treat a clean "OK" as silence, not approval.
- Reject a file if it carries another teacher's/coaching centre's branding, phone number, or student handwriting/ticks.
- **Never crop dirty marks out of a page.** Cropping destroys the question layout. Reject the file.

### 5.5 Stripping third-party watermarks (`wmclean.py`)
- Layer 1 (the win): find text spans matching `padasalai|telegram|whatsapp|sura|don|wts|surya` and redact them with `PDF_REDACT_IMAGE_NONE | PDF_REDACT_LINE_ART_NONE` so the scanned bitmap is untouched.
- Layer 2 (risky): OCR-locate the mark, safety-gate it against question content, then Telea inpaint. Use only when the mark is burned into the JPEG and only with the safety gate.
- A Padasalai *footer strip* is acceptable on an otherwise clean paper. Padasalai is not a subject oracle.
- **Never** strip or watermark `_INBOX` originals. Only the student-facing copy gets treatment.

### 5.6 Our branding and watermark (`wm_apply.py`)
- Brand line, always: **Ravi's Tuition + ravistuition.in | 86106 53352**
- Diagonal vector overlay: **bottom-left → top-right**, **opacity ≈ 0.17**, sky colour (0.36, 0.68, 0.92). The negative angle used before 2026-09-16 was wrong; `fix_direction()` strips ours and reapplies.
- The overlay is a vector *page* drawn over the scan (`show_pdf_page`) — it must not re-encode or blur the original.
- On a 2-up sheet, **one WM per A5 slot**, not one per A4 page.
- Apply **after** the A5 brand, **on the student-facing copy only**. Never on the Drive original.
- Ledger: `ledgers/wm_done.json` **in this repo** (the old ledger lived in `papers/` and was wiped — never again).

### 5.7 Print pipeline
Working size is **A5**. Print output is **2-up A4, cut-ready** (and booklet where a task says so). A4 originals are re-imposed, never stretched. Answers a/b/c/d. Times and super/subscripts must survive — no tofu boxes.

### 5.8 Storage rules (learned the hard way)
- Deliverables go to **Drive**. Not to the workspace.
- Workspace keeps only: source bundles under `COLLECT/GOVT_PYQ/`, scripts, small JSON/markdown.
- Snapshot cap is ~128 MB and PDFs under `papers/` vanish. **Do not rebuild `papers/` trees.**
- Every script a worker builds gets committed to `tools/` in this repo, and every run's ledger to `ledgers/`. Scripts that live only in an Arena session are lost in a week.

### 5.9 Naming conventions (exact)
- Originals: `<class>_<Subject>_<Exam>_<year>_<STATE|District>.pdf` → `10_Science_Annual_2026_STATE.pdf`
- Exam tokens: `Annual`, `Quarterly`, `HalfYearly`, `MidTerm`, `Public`, `Model`, `OneWord`, `Notes`, `QBank`
- Branded library copy: `<...>_A5.pdf`
- Print: `<...>_2UP_A4.pdf`, `<...>_BOOKLET_A4_PRINT.pdf`
- No spaces in file names. ASCII only in file names. Tamil belongs inside the PDF, not in the name.

### 5.10 Drive tree — the only allowed shape
```
StudyHub/TN/<class>/<Subject>/PYQ/<Exam>/<year>/     free papers, gated
StudyHub/TN/<class>/<Subject>/Models/                 free model papers + keys
StudyHub/TN/<class>/<Subject>/OneWord/                Topper
StudyHub/TN/<class>/<Subject>/QBank/                  Topper
StudyHub/TN/<class>/<Subject>/Notes/                  Topper (complete / topper / last-minute)
StudyHub/TN/<class>/<Subject>/SlowLearners/           Topper
StudyHub/TN/<class>/<Subject>/_print/                 A5 / 2-up / booklet
StudyHub/_INBOX/                                      raw drops, untrusted
StudyHub/_QUARANTINE/                                 failed or failed-gate files
```
- **No district folders inside StudyHub.** District is a column in the ledger. Old vault keeps its district folders as an archive.
- Old `Question Papers/` tree = **read-only archive**. Nothing new goes in. Nothing comes out without gating.
- Known folder IDs (verify in TASK-020 before trusting): `StudyHub/TN` `12euvAelKsG3TxNVoAgQjYEqQj8NkR7cZ` · `StudyHub/TN/10th` `1tkIfv8t1lFJGPkmgweKrQnHHZhFerO0l` · `…/Science` `1CaPiLzN97QP326f6jlTV-rzmN9mYOjdv` · `…/Science/Diagrams` `1kjhmcmsYPBw1yAAFIRBa_BvoE7FkIKJT`

## 6. Shelves — what is free and what is paid

| Shelf | Contains | UI rule |
|---|---|---|
| **free** | Public PYQ (gated), model papers, answer keys for those models | visible to everyone |
| **Topper / Pro ₹499** | One-word banks, private-label question bank, complete/topper/last-minute notes, slow-learner material | **boxes, never dumped into All** |
| **Centum** | "Take this as a test" MCQ player, live class, recordings, NotebookLM videos | **no money until one test opens and one recording opens** |

Never free: private-label material, one-word banks, slow-learner material. Centum is not "more PDFs" — it is tests + live + recordings.

## 7. How agents log (non-negotiable)

`agents/agent-XX/log.md` — append-only. One line per event:
```
2026-09-23T14:05Z | START TASK-002 | SSLC Science publish | 0 files | next: load gate results
2026-09-23T14:40Z | UPLOAD | 10_Science_Annual_2023_STATE.pdf → StudyHub/TN/10th/Science/PYQ/Annual/2023/ | link | next: 2024
2026-09-23T15:10Z | STOP | 5/5 uploaded, verified by list | status REVIEW
```
Minimum entries: one at start, one per upload/batch, one before stopping. **Never end a session without a log entry.** A silent agent is a stopped agent.

`agents/agent-XX/current.md` — live state, overwritten as needed:
`STATUS` (STAGED/ACTIVE/BLOCKED/REVIEW/DONE) · task id + name · progress % · files produced · blocker (exact) · next step.

## 8. Handling "continue"

When the owner types **continue**, or when you are re-opened after a break:
1. Read `OFFICE.md` Section 2 — is the freeze still on?
2. Read your `current.md` — what status were you in?
3. Read the **last 5 entries** of your `log.md` — what was the last finished step?
4. Read your task file, go to the first step that is **not** proven done on Drive.
5. Resume there. **Do not restart finished work. Do not re-upload verified files.** When in doubt, `list` the Drive folder before doing anything.

## 9. Blocked? Use this format, then stop

```
BLOCKER: <one sentence>
WHAT I TRIED: <2-3 bullets>
WHAT I NEED: <exact file / permission / decision>
CAN I CONTINUE ON SOMETHING ELSE: yes/no
```
Write it in `current.md` and `log.md`, set `STATUS: BLOCKED`, and stop. Do not improvise around a blocker — that is how the diagram pack shipped with a wrong DNA label.

## 10. Escalation

Agent → Manager → Owner. The Manager resolves anything answerable from this repo, `training/*`, or the debrief. The Owner is asked only for: money, Drive deletes, scope changes (new class band, CBSE), publishing a new student-facing shelf, or anything with legal/brand risk. The Owner is busy — one question, with options, not a paragraph.

## 11. Ravi's standing rules (violating any of these is a failed task)

1. Unique TN originals. Reject Sura / Don / WTS / Surya / paid guides / login walls as student-facing material.
2. Dirty file → reject. Never crop.
3. No agent in this office edits `catalogue.json`. Qwen owns the website.
4. Drive writes only through `drive_upload.py` / `bridge.py`. **Never delete Drive.**
5. Free shelf = PYQ + models + model keys. Never free: private-label, one-word, slow-learners.
6. Topper = boxes in the UI. Centum = tests + live + recordings, not PDFs.
7. Web 2–3 months, then Capacitor. No Bolt rebuild. PWA is fine.
8. Tamil medium = Tamil UI + Tamil PDFs. Classes 1–7 and CBSE stay grey until files exist.
9. Home picker: Board TN|CBSE, classes 1–12 reverse pyramid. No wizard.
10. Brand line exactly: `Ravi's Tuition + ravistuition.in | 86106 53352`. WM: BL→TR, opacity ~0.17, vector.
11. Ask Ravi for a decision **once**, with options. Never ask him to touch GitHub or re-explain his own rules.
12. One job at a time per agent, one stop condition Ravi can open on his phone.

## 12. Departments

| Department | Slots | Card |
|---|---|---|
| Content Production | agent-01 … agent-05 | `departments/content/overview.md` |

To add a department (e.g. Video, Website liaison, Sales), the Manager follows `MANAGER-GUIDE.md` §"New department" — it creates the board section, slots, role training, and the first 10 tasks before telling the owner the paste prompts.


## 13. The Virtual Office app (`app/`) — the owner's window

The owner is on a phone. He does not read GitHub. The app in `app/` is how he sees the office: agents, tasks, reports, and the actions waiting on him, each with a **Copy prompt** button.

Rules for the app:
- **Read-only.** It renders `app/data/office.json` and can never upload, move, or delete anything. All Drive work stays in agent sessions behind the page-1 gate.
- **No secrets, ever.** `app/` is published on the public internet via GitHub Pages. No Apps Script URL or SECRET, no tokens, no credentials — not in data, not in code, not in comments.
- **`app/data/*` and `app/index.standalone.html` are generated.** Never hand-edit them; fix the source (`board.json`, a log, a task, a report) and rebuild.
- **The Manager rebuilds it every run** as part of Phase 4:
  ```
  python3 tools/build_office_data.py     # compiles the office into app/data/office.json
  python3 tools/build_standalone.py      # packs the one-file version
  node tools/smoke_test_app.js           # renders every screen; must pass before reporting
  ```
- A manager run is not finished until those three commands pass and the app shows the new report.
- Worker agents do not touch `app/` except to add a screen when the Manager assigns it as a task. If you change `app/app.js`, the smoke test must pass in the same session.

## 14. What to do when the owner says "continue"

That is a **manager** instruction, not a worker instruction: the Manager runs Phases 0–5, rebuilds the app data, and reports. A worker agent that hears "continue" resumes its own task from the first step not proven done on Drive (`OFFICE.md` §8) — it does not restart, and it does not rebuild the app.

## 15. Stations, occupants, and replacements

The five agents are **stations**, not people. A station never dies; the agent sitting at it can be replaced, and the successor continues the same lane from the predecessor's notes. That is the owner's rule: *"if any agent stops working then we have to remove that agent and add a new agent who will continue from where the old agent left off."*

**Terminology**
- **Station** = `agent-01 … agent-05` (the desk in the office). Fixed, permanent, keeps the history.
- **Occupant** = the actual agent session: `agent-01` is generation 1, `agent-01-g2` is generation 2, and so on.
- **Roster** = `agents/<station>/roster.md` (append-only table of every generation).
- **Handover** = `agents/<station>/handover.md` (append-only; the last thing a leaving occupant writes).

**When a replacement is required**
1. `STATUS: ACTIVE` with no log entry for **over 60 minutes** → the Manager sets the station to IDLE and replaces the occupant.
2. Repeated review failures on the same task (twice) with no progress → replace, and note it in the report.
3. The owner asks for a replacement from the app (tap the desk → *Replace agent*).

**How a replacement is done (Manager, one command)**
```
python3 tools/handover.py --slot agent-01 --reason "no log entry for 95 minutes"
```
That writes, in this order: the handover block (with the log tail, progress, next step, stop condition and warnings), the roster row, the REPLACED/START log lines, a fresh `current.md` for the new generation, and a bumped `occupant` in `board.json` — then rebuilds the app so the new agent appears at the desk.

**What the successor must do**
1. Read `agents/<station>/handover.md`, newest block first.
2. Read the predecessor's `log.md` tail.
3. `list` the target Drive folder and confirm what is already done.
4. Resume at the first step that is **not** proven done on Drive. Never restart, never re-upload, never delete.
5. Log a START line immediately.

**Never** delete a roster row, a handover block, or a predecessor's log lines. The history is how the next replacement is judged.

## 16. The planning phase (current)

The owner asked for a fresh start: **plan first, prepare the setup, then add tasks.** While `board.json` has `"phase": "PLANNING"`:

- No new assignments. The queue is empty on purpose.
- The office app shows the planning banner and the archived round-1 tasks.
- Round-1 tasks live in `tasks/archive/2026-09-23-round1/` — parked, not cancelled. When the plan is agreed, the Manager writes **new** task files with new ids and cites the archived one as the source.
- Stations may still be started for **read-only or tooling work** the owner explicitly approves (the page-1 gate is the standing example).
- The plan document is `PLAN.md` at the repo root. It is the only file that decides what gets built next.

## 17. Opening a new department (rooms)

Departments are rooms in the office app, defined in `departments/registry.json`. Harvest is open; Marketing and Video are locked; the website lane is external (Qwen) and is never staffed from here.

To open a locked room the Manager must, in order:
1. Get the owner's explicit decision (a new department is scope, and scope needs the owner).
2. Ask the four questions from `MANAGER-GUIDE.md §"New department"`: what does it produce, how many agents, what tools, what is the first batch of tasks.
3. Write the department's plan (`departments/<id>/PLAN.md`), flip `status` to OPEN in the registry, and give each new station a desk, a role, a training file (`training/roles/<role>.md`), a roster, and a self-contained first task.
4. Add the stations to `board.json` and rebuild the app so the new room lights up.

A locked room never consumes a station in the Harvest room, and no department opens because "there was time".

## 18. The flat office (v2 floor plan)

The office is **one open floor** — no departments, no rooms, no locked corridor.

- Two long tables (A and B) seat five agents each. An 11th agent adds a third table (C); a 16th adds a fourth (D); and so on.
- The **manager room sits at the bottom** of the floor with the manager desk, a "what the manager is doing" sign, the power panel, and the door.
- Adding an agent is one block in `office.config.json` (`id`, `lane`, `role`). The build creates `agents/<id>/`, the agent takes the next free seat, asleep, with a start prompt.
- **Honest lights**: a desk says "working" only with **work evidence** (a log line about the task / a file produced / concrete progress). Heartbeats and "I'm here" pings show "at the desk" (QUIET), not working.
- Light thresholds are recomputed **in the browser** from raw timestamps (LIVE ≤ 20 min, QUIET ≤ 90 min, CLOSED beyond). A quiet desk dims without a rebuild — no redeploy needed.

## 19. End-of-day reports

At the end of every working day the Manager writes `reports/eod/YYYY-MM-DD.md` — six short sections, evidence only:

1. **What shipped today** — files that reached Drive (links) and passed the gate.
2. **What was blocked** — each blocker with what's needed.
3. **What was verified** — AUDIT verdicts.
4. **Files produced vs files promised** — one count each.
5. **Queue status** — how many tasks in queue/active/review/done.
6. **Tomorrow's first action** — one concrete next step.

EOD reports are **evidence-only** — no narrative padding, no predictions. If nothing shipped, section 1 says "nothing shipped" and that is the report. Agent-10 (AUDIT) reads each EOD and verifies every claim against Drive + the ledgers before the next shift starts.

## 20. Standing order for every agent — proper AND faster (baked into every start prompt)

Every agent, every task, every run follows this:

1. **Read the standing brief first** — `OFFICE.md`, your `current.md`, the last 5 lines of your `log.md`, your task file. Start nothing until you know where the last occupant stopped.
2. **Resume, do not restart.** The first action on any "continue" is to `list` the target Drive folder and confirm what is already there. Re-uploading a verified file is a failure.
3. **One job at a time.** One stop condition Ravi can open on his phone in 30 seconds.
4. **Evidence for every claim.** "Done" means file on Drive + gate PASS + link in log.md + stop condition met. "In my workspace" is not done.
5. **Log every action.** START, each upload/batch, and STOP. A silent agent is a stopped agent.
6. **Block cleanly.** Use the BLOCKER format in §9 and stop. Do not improvise around blockers — that is how wrong-diagram PDFs ship.
7. **Never delete anything on Drive.** Never. Quarantine, don't delete.
8. **Freeze-respect.** While the freeze is on, no uploads, no Drive restructure, no renames. Reading and local tooling are fine.
9. **Ship the smallest useful thing.** One gated file delivered today beats ten planned for tomorrow.
10. **Stop when the stop condition is met.** Do not add scope. Report, hand over, end.

Proper AND faster means cutting wasted motion (re-reading files, restarting, speculative work) without cutting corners on evidence or the page-1 gate.

## 21. Platform limits — what this environment cannot do

These are hard limits of the Arena sandbox. Do not waste time trying:

- **No session internet.** Outbound TLS from an agent session is cut (every host, every port). `bridge.py`/`drive_upload.py` cannot run inside a session — they run on GitHub Actions runners (see `.github/workflows/drive-*.yml`).
- **No `.py` / `.zip` chat uploads.** Files pasted into chat are text-only. Binary payloads will not arrive. Deliver scripts via this repo, not chat.
- **No browser in the session.** There is no Chrome/Firefox to drive. The office app is built with `build_office_data.py` and checked with `tools/smoke_test_app.js` — that smoke test is the browser.
- **Sessions only run while they run.** When the session ends, all in-memory state and anything outside the repo root is gone. Commit every script to `tools/` and every ledger to `ledgers/`.
- **A static page cannot know the time.** The app uses timestamps from the built JSON plus `Date.now()` in the browser to recompute desk lights on load. Stale caches are busted with `?v=` in `index.html`.

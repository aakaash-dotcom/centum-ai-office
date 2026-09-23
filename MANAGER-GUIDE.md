# MANAGER-GUIDE.md — The Manager Agent's Runbook

You coordinate. **You never produce student content.** You never harvest, never watermark, never generate a diagram. You assign, review, decide, and report.

Every activation, run Phase 0 → Phase 5 in order. Always read fresh from the repository. Never trust memory over the files.

---

## PHASE 0 — READ THE CURRENT STATE

1. Read `board.json`.
2. Read the newest file in `reports/daily/` (if any).
3. Read `agents/agent-XX/log.md` for every slot whose status is ACTIVE, IDLE, or BLOCKED. Read `current.md` for every slot.
4. Read `tasks/queue/`, `tasks/active/`, `tasks/review/` file lists.
5. Check `OFFICE.md` Section 2 first: **is the freeze still on?**

Say to the owner: **"Manager online. Reading office state…"** then describe what you found in **3 lines maximum** (state, blockers, decision needed).

## PHASE 1 — AUDIT ALL AGENTS

For each slot in `board.json`:

**status ACTIVE** — read `log.md`, find the last entry timestamp *in the log* (you cannot read clocks inside other sessions; you judge by wall-clock time of this run vs the last logged stamp):
- last entry < 30 min ago → working, no action
- 30–60 min ago → set `is_at_risk: true`
- > 60 min ago → set `status: IDLE`, `is_at_risk: true`
- Write into their `current.md`:
  ```
  MANAGER CHECK [timestamp]: No log entry for [X] minutes.
  If working: write a log entry now.
  If stopped: the owner will tell you to continue.
  If blocked: set STATUS: BLOCKED and write your exact blocker (format in OFFICE.md §9).
  ```
- **Caveat, state it in the report:** a paused Arena session logs nothing while it waits for owner input. If an agent was waiting on an owner paste, do not call it idle — call it WAITING-ON-OWNER and list it as an owner action.

**status BLOCKED** — read the blocker.
- Resolvable from this repo (`training/*`, debrief knowledge, a technique in `OFFICE.md`)? → write the answer into their `current.md`, set `ACTIVE`, note it in `log.md`.
- Not resolvable? → leave BLOCKED, put it in the report's OWNER ACTIONS with the exact missing thing.

**status REVIEW** — this is the real job:
1. Read the task file from `tasks/active/`.
2. Read the agent's `log.md` — collect the Drive links and file list.
3. **Open the checklist** for that content type in `training/quality-checklist.md`. Do not invent criteria.
4. **Verify on Drive, not in the workspace.** Use `list` on the exact target folder. A file that is only in the agent's workspace does not exist.
5. Check the page-1 gate result for every PDF (`ledgers/gate_results.csv`).
6. **ALL pass** →
   - `status: DONE`, `task_id: null`
   - `mv tasks/active/<file> tasks/done/`
   - `tasks_done_today` +1, `tasks_done_total` +1, `files_produced_total` += files produced, `files_produced` on the slot += same
   - `current.md`: `APPROVED [timestamp]. Ready for next assignment.`
   - `log.md`: `[timestamp] APPROVED | all quality checks passed | task complete`
   - Add the Drive links to the READY MANIFEST section of the daily report for Qwen.
7. **ANY fails** →
   - `status: ACTIVE` (never DONE, never delete the work)
   - `current.md` gets **specific, surgical** feedback. Show your work: list each checklist item as PASS/FAIL with the reason.
   - Banned feedback: "fix the answers", "improve quality", "check again".
   - Required feedback shape: *"Q7 answer is 1 sentence; minimum 4. Add: [the missing points]. Q12 option B is wrong — correct is C because [reason]. File `10_Science_QBank_Ch05.pdf` is 11 MB; split it or re-export at lower DPI to get under 8 MB."*
   - `log.md`: `[timestamp] REVIEW FAILED | items: [list] | returned to agent`
   - Log the rejection reason in the daily report so patterns get caught.

**status EMPTY / STAGED** → candidate for assignment in Phase 2.

## PHASE 2 — ASSIGN NEW TASKS

For every EMPTY or newly-DONE slot, in this order of preference:
1. A continuation/repair task (existing work made usable) before any new-creation task.
2. Then by task priority number, then by task id.
3. **Dependency check:** a task whose `Blocked by` field names an unfinished task id cannot start. Skip it and take the next.
4. Respect the freeze: if the freeze is on, do **not** activate slots. Keep them STAGED. The only allowed pre-GO work is listed in the daily report's owner actions.

Assignment procedure:
- Read the task file end-to-end.
- Write the full assignment into `agents/agent-XX/current.md`:
  task id + name · exact deliverables with exact filenames · inputs and Drive paths · techniques to use (quote `OFFICE.md` §5) · **stop condition** · which checklist · Drive upload path · the exact paste prompt for the owner.
- `mv tasks/queue/<file> tasks/active/<file>`
- `board.json`: `status: ACTIVE`, `role`, `task_id`, `task_name`, `started`, `progress_percent: 0`, `blocker: null`, `is_at_risk: false`
- `log.md`: `[timestamp] ASSIGNED TASK-0XX by Manager | stop condition: [x] | awaiting owner paste`

## PHASE 3 — KEEP THE QUEUE FULL

If `tasks/queue/` has **fewer than 10** files: create the next batch (10 tasks) following the priority order in `tasks/README.md`, the per-chapter step order, and the debrief techniques.

Before creating anything: `ls tasks/done/ tasks/active/` — **never duplicate a task that is done, active, or already queued.** Task ids are sequential and never reused.

## PHASE 4 — WRITE THE DAILY REPORT

Write/update `reports/daily/YYYY-MM-DD.md` using the exact template in `reports/daily/README.md`. Sections: office health · what happened this run · current office state table · queue status · blockers · techniques status · **OWNER ACTIONS (numbered, copy-paste ready)** · what happens next.

Rules for the report:
- Readable in 30 seconds. Tables and numbered lists, not paragraphs.
- Every owner action is **copy-paste ready** — full prompt text, no "ask your agent about…".
- Every review the owner might want to check has a **GitHub link**.
- No secrets. No Apps Script SECRET, ever.

## PHASE 5 — DELIVER THE SUMMARY

Post exactly this shape to the owner:

```
Manager Run Complete — <timestamp>

Office Health: GOOD / NEEDS ATTENTION / CRITICAL

Quick Status:
Working: <n> — <names>
Idle or at risk: <n> — <names>
Blocked: <n> — <names>
In review: <n> — <names>
Done today: <n> tasks

<n> things need your attention:
1. …
2. …

Full report written to reports/daily/<date>.md
```

Health rules: **GOOD** = no blockers, ≥1 task moved forward, no failed reviews. **NEEDS ATTENTION** = one blocker, or one failed review, or an agent idle > 60 min with work waiting. **CRITICAL** = freeze/technique broken, a Drive write failed, or nothing has moved in a full run.

---

## Review discipline

- **Show your work.** Every review lists each checklist item with PASS/FAIL and one line of evidence (page count, file size, a quoted answer, a Drive list line).
- **Judge the file, not the report.** If the agent says it uploaded 5 files and Drive lists 3, it uploaded 3.
- **Never approve on a promise.** "Will verify tomorrow" is a fail.
- **Never let a reviewed task go back more than twice without a training fix.** Third return = the task or the checklist is wrong; fix the document and say so in the report.

## Pattern watch (the previous team's actual failure modes — check for these every run)

1. Harvesting volume instead of gating a small set. (Symptom: file counts growing, zero gated files.)
2. Trusting filenames/listing titles as subject evidence.
3. Writing a plan instead of shipping a file.
4. Generating exam diagrams/figures without a subject-expert check.
5. Storing work in the workspace where it gets wiped.
6. Same task assigned to two slots, or two slots in one Drive folder.
7. Missing the Drive link in the chat when the owner cannot see the workspace.
8. Editing `catalogue.json` from inside this office.
9. Re-doing work that is already done (check `tasks/done/` and the Drive tree first).
10. Silent sessions — no log entry for hours.

## Special situations

**Owner types "continue"** → run the full workflow from Phase 0. Treat as fresh activation.

**Owner asks about a specific agent** → read that agent's `log.md` and `current.md` first, answer from what you read, then run the relevant audit phase. Never answer from memory.

**An agent reports a new working technique** → immediately add it to `OFFICE.md` §5 (or `training/content-standards.md`) with who/when/what, and note it in the report. Techniques that live only in a session are lost.

**The same quality failure appears twice** → update `training/quality-checklist.md` and `content-standards.md` to close it, add a line to the report: *what changed and why*. Keep an "Updated" note at the top of the changed document.

**A technique from the debrief stops working** → document the failure in the daily report (what it was supposed to do, exact error), create a debugging task with full context + the fallback to use meanwhile, and assign it to the QA lane (agent-05) unless it is a Drive bridge issue, which goes to the FACTORY lane (agent-04).

**Owner wants a new department** → ask exactly four things: (1) what does this team produce? (2) how many agents? (3) what tools/access do they have? (4) what is the first batch of tasks? Then create: the department block in `board.json`, `agents/agent-XX/current.md` + `log.md` for each new slot, `training/roles/<role>.md`, 10 self-contained tasks in `tasks/queue/`, and an updated `OFFICE.md` §12. Finish by giving the owner the exact paste prompt per new agent.

**Owner wants to reverse the freeze or change scope (11/12, CBSE, classes 1–7, paid shelf)** → do it in writing: update `OFFICE.md` §2/§3, `board.json`, and say plainly in the report what changed, what it unlocks, and what it risks. Never flip scope silently.

## Manager's own log

Keep `agents/manager/log.md`… **not needed yet** — the Manager's history lives in `reports/daily/` and in the commit history of this repo. Every run: update `board.json` → `manager.last_run`, `manager.next_action`.

## Standing constraints the Manager must never break

- Never paste the Drive SECRET anywhere.
- Never delete Drive content or ask an agent to.
- Never let a file reach a student-facing folder without the page-1 gate.
- Never approve a 11/12 harvest while it is parked.
- Never ask the owner to edit the repo by hand.
- Always give the owner one question with options, never a paragraph of choices.

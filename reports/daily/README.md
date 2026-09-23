# Daily Reports

One report per manager run, named `YYYY-MM-DD.md`. If the Manager runs twice in a day, it **updates** the same file and appends to "WHAT HAPPENED THIS RUN".

The newest report is the truth. Older reports are history — keep them, never delete.

---

## Template (use exactly)

```markdown
# CENTUM AI Office — Daily Report
Date: YYYY-MM-DD
Manager run: YYYY-MM-DDTHH:MMZ

## OFFICE HEALTH: GOOD / NEEDS ATTENTION / CRITICAL

## WHAT HAPPENED THIS RUN
### Agents Reviewed
| Slot | Status found | What was done |
|---|---|---|
### Tasks Approved
### Tasks Assigned
### Tasks Rejected with Rework

## CURRENT OFFICE STATE
| Slot | Status | Task | Progress | Last Activity |
|---|---|---|---|---|

## QUEUE STATUS
Waiting: N tasks
Next up: (top 5 by priority)

## BLOCKERS
(none, or: what / who / what is needed)

## TECHNIQUES STATUS
(Drive bridge, page-1 gate, wmclean, wm_apply, 2-up, upload limits — anything that broke)

## READY MANIFEST (for the Qwen lane)
| File | Drive path | Shelf | Verified |
|---|---|---|---|

## ══════════════════════════════════════
## OWNER ACTIONS REQUIRED
## ══════════════════════════════════════
1. …
   ```
   <copy-paste prompt>
   ```

## WHAT HAPPENS NEXT
(3–5 lines)
```

## Rules

- 30-second read. Tables, numbered lists, no paragraphs.
- Every owner action is copy-paste ready and numbered.
- Include GitHub links for anything the owner might want to eyeball.
- Never include the Apps Script SECRET, Drive credentials, or any token.
- If nothing needs the owner, say **"None — no action needed"** in that section.

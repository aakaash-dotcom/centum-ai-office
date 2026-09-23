# Tasks — how this folder works

| Folder | Meaning |
|---|---|
| `queue/` | written, not yet assigned. Manager keeps ≥ 10 here. |
| `active/` | assigned to a slot; the slot's `current.md` points at it. |
| `review/` | agent says done; waiting for Manager review (usually mirrors `current.md` STATUS: REVIEW). |
| `done/` | approved and verified on Drive. **Never delete, never renumber.** |

Flow: `queue → active → (review) → done`, or `active → active` with review feedback.

## Task file schema (use exactly)

```markdown
# TASK-0XX — <name>

Lane: PYQ | MODEL | ONEWORD/QBANK | FACTORY | QA/CENTUM
Priority: <1-7 per class/subject order>
Shelf: free | topper | centum
Blocked by: <task ids or "none">
Owner approval needed: yes/no — <why>
Estimate: ~<n> agent sessions

## Why this task
<one short paragraph: what it unlocks for a student or a parent>

## Inputs
| What | Where | State |
|---|---|---|

## Steps
1. …

## Deliverables (exact names)
| File | Drive path |
|---|---|

## Stop condition
<the visible thing that ends this task>

## Checklist to run
training/quality-checklist.md §<n> (+ §0 universal always)

## Techniques
<the OFFICE.md §5 items that apply, quoted enough to be actionable>

## Log format reminder
OFFICE.md §7.
```

## Task numbering

- TASK-001+ sequential, never reused, never renumbered once assigned.
- The id in the file name **is** the id in `board.json`. No aliases.
- A task that is superseded gets `SUPERSEDED BY TASK-0YY` at the top and stays in `queue/` (or is moved to `done/` with that banner) — it is never deleted, so the history stays readable.

## What all 20 current tasks have in common

Every one of them ends with a thing Ravi can open on a phone in 30 seconds, lands on Drive at an explicit path, and carries the page-1-gate requirement. No task says "collect as much as possible", "harvest all", or "and then continue with the rest".

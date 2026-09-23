# ledgers/ — the office's memory

These files are the difference between "we think it worked" and "we can prove it worked". They live in the repo so they survive workspace wipes (the previous team's watermark ledger lived in `papers/wm_done.json` and was destroyed — that is why this folder exists).

## Files and their exact columns

**`gate_results.csv`** — the page-1 subject gate record. One row per PDF examined.
```
timestamp,file,old_path,page1_read_as,gate_method,subject_verdict,gate_verdict,checked_by,notes
2026-09-23T15:02Z,10_Science_Annual_2026_STATE.pdf,COLLECT/GOVT_PYQ split,"பகுதி – அறிவியல்",text,Science,PASS,agent-05,page 1 header clear
```
`gate_verdict`: PASS | REVIEW | FAIL · `gate_method`: text | ocr | human

**`publish_log.csv`** — everything published into `StudyHub/`.
```
timestamp,file,drive_path,drive_link,md5,size_mb,class,subject,medium,exam,year,district,source,old_path,shelf,published_by
```

**`wm_done.json`** — watermark job state, so a wiped session can resume.
```json
{ "job": "class8-quarterly", "direction": "BL->TR", "opacity": 0.17, "angle_fixed_on": "2026-09-16",
  "batches": [ { "range": "1-98", "status": "done-pre-fix", "needs_recheck": true },
               { "range": "99-444", "status": "not_started", "resume_index": 99 } ] }
```

**`duplicates.csv`** — `md5,keeper_path,duplicate_path,size_mb,action_taken,decided_by`

**`drive_map.json`** — folder path → id, built by TASK-020, refreshed whenever a folder is created.

## Rules

- Append as you work. Never reconstruct from memory later.
- Never delete a row. A wrong row gets a corrected row under it.
- The Manager reads these during review — a missing row is a failed checklist item.
- Never put the Drive SECRET, tokens, or credentials in a ledger. Links only.

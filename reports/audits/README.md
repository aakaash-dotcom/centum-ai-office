# Audit Reports

Written by the QA lane (agent-05). One file per audit, named `<what>-audit-YYYY-MM-DD.md`.

An audit report answers one question with a number: **how many files do we actually own, and what subject is each one?** Not how many were downloaded.

Every report must contain:
| Section | Content |
|---|---|
| Scope | exactly which Drive folders were examined, one path per line |
| Method | gate tool version, text-layer vs OCR, batch size |
| Results table | files examined · PASS by subject · WRONG-SUBJECT breakdown · UNREADABLE · DIRTY · DUPLICATE |
| Reclaimed list | mislabelled files that are genuinely useful material for their real subject (file + Drive link) |
| Escalations | any folder with a mismatch rate above ~20% — that folder came from a listing harvest and must not be trusted |
| Nothing-moved statement | confirm that no file was moved, renamed, or deleted; moves happen only after the owner sees the list |

First audit scheduled: TASK-018 (the ~185 "unique Science" set + the 4 contaminated Quarterly 2026 STATE files).

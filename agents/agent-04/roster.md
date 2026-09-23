# Station agent-04 — roster

One station, many possible occupants. When an occupant stops working, it is **replaced** (never deleted): the successor continues the same lane from the predecessor's notes. Rules: `OFFICE.md` §15. Tool: `python3 tools/handover.py --slot agent-04 --reason "..."`.

**Lane:** FACTORY — branding, watermark, A5, 2-up, print files

| Gen | Occupant | Started | Ended | Reason for leaving | Handover |
|---|---|---|---|---|---|
| 1 | `agent-04` | 2026-09-23 | — | current occupant | — |

Roster is append-only. A new generation gets a new row; old rows are never edited or removed.

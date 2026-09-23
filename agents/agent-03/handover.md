# Station agent-03 — handovers (append-only)

Every replacement writes a block here **before** the new occupant starts, so nothing is lost when a session dies. The new occupant reads the newest block first, then the predecessor's `current.md` and the tail of `log.md`, and continues from the first step that is **not proven done on Drive**.

Format written by `tools/handover.py`:

```
## Handover — gen N -> gen N+1 · <timestamp>
Reason: <why the previous occupant stopped>
Last status: <STATUS>, progress <x>%, files <n>
Last log lines: <tail of log.md>
Next step (what the successor does first): <next_step from current.md>
Stop condition: <unchanged, from the task file>
Warnings: <anything the successor must not redo>
```

_No handovers yet — generation 1 is the current occupant._

# Drive tooling — read-only, runs on GitHub Actions

Agent sessions in this environment **have no outbound internet** (TLS to every host
is cut; see `OFFICE.md` §21). The Apps Script bridge is the only way to read Drive,
and it has to run where the internet exists: a GitHub Actions runner.

## Secrets (owner sets these once)

GitHub → repo → **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `APPS_SCRIPT_URL` | the Apps Script `/exec` URL from the Drive client |
| `APPS_SCRIPT_SECRET` | the shared secret from the same client |

**Never paste either value into this repo.** It is public. `.gitignore` blocks
the client filenames and the smoke check fails the build if a `/macros/s/<id>`
URL or deployment id lands in any file.

## Workflows

- **Drive inventory** (`drive-inventory.yml`) — TASK-101. Walks the Drive root,
  then one level down, depth-2 inside `StudyHub/`, lists `Question Papers/` once
  (never recurses — it times out), re-verifies every known id from the ledger.
  Writes `reports/DRIVE_INVENTORY.md`, `ledgers/drive_inventory.csv`,
  `ledgers/drive_map.json` and commits them back.
- **Drive call** (`drive-call.yml`) — one ad-hoc read-only call. Result lands in
  `drive/results/<request-id>.json`.

## Scripts

- `tools/drive_call.py` — single read-only call. Reads secrets from env, posts
  JSON as `text/plain`, manually follows the 302 (Apps Script hides the real
  body behind it), 180 s timeout, 0.25 s throttle, 3 retries, action allow-list.
- `tools/drive_inventory.py` — the walker.
- `tools/drive_inventory_selftest.py` — offline self-test using a fake Drive
  backend. Must print `ALL CHECKS PASSED`.

## Allowed actions

`info · list · list_files · list_folders · search · ping`

Nothing in this directory can modify, rename, move or delete Drive content.
That is enforced two ways: the Apps Script client rejects write actions when
the secret header is missing, and the Python tool refuses to send any action
outside the allow-list.

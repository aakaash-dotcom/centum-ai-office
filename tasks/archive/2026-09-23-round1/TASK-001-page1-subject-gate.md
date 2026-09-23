# TASK-001 — Build the page-1 subject gate (`tools/page1_gate.py`)

Lane: QA/CENTUM (agent-05)
Priority: 0 — everything else waits on this
Shelf: n/a (tooling)
Blocked by: none — **this can be built during the freeze** (no Drive writes required for the tool itself)
Owner approval needed: no
Estimate: 1–2 agent sessions

## Why this task
Four days were lost to one failure: a Science listing produced Tamil papers, and nothing in the pipeline could tell. `qc_scan.py` cannot do it (it only greps strings and understands no Tamil and no subjects). This tool is the gate every other task's files must pass. Build it first.

## Inputs
| What | Where | State |
|---|---|---|
| Existing PDFs to test against | `COLLECT/GOVT_PYQ/*.pdf` (bundle + already-split files), any local PDFs | available in workspace |
| Tamil subject tokens | listed below | known |
| Old scripts for reference | `qc_scan.py`, `ocr.py`, `subject_infer.py` | in the workspace root / `tools/` |

## Steps
1. Write `tools/page1_gate.py` with this interface:
   `python3 tools/page1_gate.py --pdf <file> [--pages 1] [--out ledgers/gate_results.csv]`
   `python3 tools/page1_gate.py --folder <path> [--recursive] [--out ...]`
2. Logic: try the page-1 text layer (PyMuPDF `page.get_text()`), else render page 1 at ~200 dpi and OCR it. Search for subject tokens and section markers.
3. Tamil/English tokens to detect:
   அறிவியல் = Science · கணிதம் = Maths · தமிழ் = Tamil · ஆங்கிலம் = English · சமூக அறிவியல் / சமூகம் = Social Science · வினாத்தாள் = question paper · மொழி = language
   English tokens: Science / Mathematics / Maths / Social Science / English / Tamil + "Part I/II/III".
4. **Handle the two known traps explicitly:** (a) an all-subject bundle page that lists subjects — that is a *contents* page, not a subject; detect it and return REVIEW; (b) a paper whose *heading* is English but whose *body* is Tamil medium — the subject is what the questions are about, the medium goes in its own column.
5. Verdict rules: exactly one subject matched → `PASS`; matched subject different from the filename token → `FAIL`; zero or ≥2 candidates, or contents-page detected → `REVIEW`.
6. Append rows to `ledgers/gate_results.csv` (schema in `ledgers/README.md`). Idempotent: re-running on the same file does not create a second row for the same md5.
7. Test it on real files: the split SSLC Science STATE PDFs (expect PASS), the known bad ones (expect FAIL: the four "Science" 10th Quarterly 2026 STATE files that open as Tamil).
8. Write a short results summary — `tools/PAGE1_GATE_RESULTS.md`: how many PASS / REVIEW / FAIL, with the filenames in each bucket.

## Deliverables (exact names)
| File | Where |
|---|---|
| `tools/page1_gate.py` | committed to this repo (not just the session) |
| `ledgers/gate_results.csv` | updated rows (append only, never rewrite existing rows) |
| `tools/PAGE1_GATE_RESULTS.md` | summary table |

## Stop condition
The tool runs over a folder in one command and produces a verdict per file; run against the split Science files it says PASS, and against the known Tamil-as-Science files it says FAIL. **Stop there** — do not start gating the whole vault (that is TASK-018).

## Checklist to run
`training/quality-checklist.md` §0 (universal). For this task the "file opens/renders" item means the tool runs clean on a fresh shell.

## Techniques
PyMuPDF for text/redaction (`OFFICE.md` §5.5 for the redaction flags if you reuse them), OCR fallback per §5.0. Ledgers in-repo per §5.8. No Drive writes needed.

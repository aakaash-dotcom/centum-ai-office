"""
drive_inventory_selftest.py — offline proof the walker does what §5 requires.

Runs drive_inventory.walk() against a fake Drive backend (no internet),
monkey-patching drive_call.call(). Asserts:

    - root is listed first
    - one level down is walked for every top-level folder
    - no blind depth beyond the known-id pass: folders outside the
      DEEP_EXCEPTIONS set are NOT opened to depth 2
    - Question Papers/ is listed exactly once AND each immediate child
      (10th, 12th) exactly once; grandchildren are NEVER opened
    - suspicion flags fire when they should
    - CSV columns are exactly what §5 specifies
    - report has all required sections
    - budget is respected (stops when it hits zero, names what it skipped)
    - legacy drive-map metadata/nulls are ignored while real path → id pairs are verified
    - failed listings create no rows/report; partial failures write successes and exit 4
    - empty Apps Script bodies report the HTTP status and deployment checks

Run:     python3 tools/drive_inventory_selftest.py
Output:  prints ALL CHECKS PASSED and exits 0, or raises AssertionError.
"""
from __future__ import annotations

import contextlib
import csv
import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))

import drive_call  # noqa: E402
import drive_inventory  # noqa: E402


# --------------------------------------------------------------------------- fake Drive tree
#
# Shape:
#   /
#     StudyHub/                 -> depth 2 allowed
#       TN/
#         10th/
#           Science/
#     Question Papers/         -> listed once
#       10th/                  -> listed once (immediate child)
#         Annual/              -> grandchild: NEVER opened
#       12th/                  -> listed once (immediate child)
#     Other/                   -> level1 only, NO depth 2
#       inside-should-not-walk/
#     marketing-plan.pdf       -> flagged foreign-brand? no, clean name
#     sura-guide-2024.pdf      -> foreign-brand flag

FAKE: dict[str, dict] = {
    "ROOT": {
        "files": [
            {"id": "f-clean", "name": "marketing-plan.pdf", "size": "12000"},
            {"id": "f-sura",  "name": "sura-guide-2024.pdf", "size": "54000"},
        ],
        "folders": [
            {"id": "d-study", "name": "StudyHub"},
            {"id": "d-qp",    "name": "Question Papers"},
            {"id": "d-other", "name": "Other"},
        ],
    },
    "d-study": {
        "files": [],
        "folders": [{"id": "d-tn", "name": "TN"}],
    },
    "d-tn": {
        "files": [
            {"id": "f-note", "name": "readme.txt", "size": "200"},
        ],
        "folders": [{"id": "d-10th", "name": "10th"}],
    },
    "d-tn": {
        "files": [
            {"id": "f-note", "name": "readme.txt", "size": "200"},
            {"id": "f-sci-1", "name": "10_Science_Annual_2025_STATE.pdf", "size": "430000"},
            {"id": "f-sci-2", "name": "10_Science_Annual_2025_STATE.pdf", "size": "430010"},  # duplicate name
        ],
        "folders": [{"id": "d-10th", "name": "10th"}],
    },
    "d-10th": {
        "files": [],
        "folders": [],
    },
    "d-qp": {
        "files": [{"id": "f-qp-note", "name": "README.txt", "size": "40"}],
        "folders": [{"id": "d-qp-10", "name": "10th"}, {"id": "d-qp-12", "name": "12th"}],
        # if the walker ever descends here it violates the list-once rule
    },
    "d-qp-10": {"files": [{"id": "f-qp10", "name": "10_index.pdf", "size": "1"}],
                "folders": [{"id": "d-qp-10-annual", "name": "Annual"}]},
    # grandchild of Question Papers/: opening it violates the no-tree rule
    "d-qp-10-annual": {"files": [{"id": "f-leak", "name": "leak.pdf", "size": "1"}], "folders": []},
    "d-qp-12": {"files": [], "folders": []},
    "d-other": {
        "files": [],
        "folders": [{"id": "d-inside", "name": "inside-should-not-walk"}],
    },
    "d-inside": {"files": [{"id": "f-forbidden", "name": "forbidden.pdf", "size": "1"}], "folders": []},
    # info by id for verification pass
    "f-clean": {"files": [], "folders": [], "id": "f-clean", "name": "marketing-plan.pdf"},
    "f-sura":  {"files": [], "folders": [], "id": "f-sura",  "name": "sura-guide-2024.pdf"},
}


LIST_CALLS: list = []


def _fake_call(action: str, path: str, extra=None):
    LIST_CALLS.append((action, path))
    if action == "info":
        key = path
        rec = FAKE.get(key, {"id": key, "name": key})
        return {"ok": True, "id": key, "name": rec.get("name", key)}
    if action == "list":
        # path is either a friendly name or an id
        key = path
        if key == "" or key == "/":
            key = "ROOT"
        if key not in FAKE:
            # try matching by folder name at root
            for k, v in FAKE.items():
                if v.get("name") == path and "folders" in v:
                    key = k
                    break
        rec = FAKE.get(key, {"files": [], "folders": []})
        return {
            "ok": True,
            "folder_id": key if key != "ROOT" else "ROOT",
            "files": [dict(f) for f in rec.get("files", [])],
            "folders": [dict(f) for f in rec.get("folders", [])],
        }
    return {"ok": False, "error": "bad action"}


class InventorySelfTests(unittest.TestCase):
    def setUp(self):
        # redirect deliverables to a tmp dir
        self.tmp = tempfile.TemporaryDirectory()
        t = Path(self.tmp.name)
        self.reports = t / "reports"
        self.ledgers = t / "ledgers"
        self.reports.mkdir(); self.ledgers.mkdir()
        self._patches = [
            mock.patch.object(drive_inventory, "REPORT_MD", self.reports / "DRIVE_INVENTORY.md"),
            mock.patch.object(drive_inventory, "INVENTORY_CSV", self.ledgers / "drive_inventory.csv"),
            mock.patch.object(drive_inventory, "DRIVE_MAP", self.ledgers / "drive_map.json"),
            mock.patch.object(drive_call, "call", side_effect=_fake_call),
            mock.patch.dict(os.environ, {"APPS_SCRIPT_URL": "https://script.google.com/macros/s/FAKE/exec",
                                         "APPS_SCRIPT_SECRET": "FAKESECRET"}),
        ]
        for p in self._patches:
            p.start()

    def tearDown(self):
        for p in self._patches:
            p.stop()
        self.tmp.cleanup()

    def _walk(self, mode="level1", budget=200):
        w = drive_inventory.walk(mode=mode, budget=budget)
        drive_inventory.write_csv(w)
        drive_inventory.write_map(w)
        drive_inventory.write_report(w)
        return w

    # ------- assertions

    def test_root_listed_first(self):
        w = self._walk(mode="level1", budget=200)
        self.assertEqual(w.folders[0]["path"], "<root>", "root must be the first folder listed")

    def test_one_level_down_is_walked(self):
        w = self._walk(mode="level1", budget=200)
        paths = {f["path"] for f in w.folders}
        for top in ("StudyHub", "Question Papers", "Other"):
            self.assertIn(top, paths, f"top-level folder {top} was not listed")

    def test_question_papers_listed_once_with_children_once(self):
        LIST_CALLS.clear()
        w = self._walk(mode="level1", budget=200)
        paths = [f["path"] for f in w.folders]
        self.assertEqual(paths.count("Question Papers"), 1, "Question Papers/ must be listed exactly once")
        self.assertEqual(paths.count("Question Papers/10th"), 1, "Question Papers/10th must be listed exactly once")
        self.assertEqual(paths.count("Question Papers/12th"), 1, "Question Papers/12th must be listed exactly once")
        lists = [p for a, p in LIST_CALLS if a == "list"]
        for fid in ("d-qp-10", "d-qp-12"):
            self.assertEqual(lists.count(fid), 1, f"{fid} must be listed by id exactly once, got {lists.count(fid)}")

    def test_question_papers_no_grandchildren(self):
        LIST_CALLS.clear()
        w = self._walk(mode="level1", budget=200)
        deep = [f["path"] for f in w.folders
                if f["path"].startswith("Question Papers/") and f["path"].count("/") >= 2]
        self.assertEqual(deep, [], f"grandchildren of Question Papers must never be opened: {deep}")
        self.assertNotIn("d-qp-10-annual", [p for a, p in LIST_CALLS if a == "list"],
                         "Question Papers/10th/Annual was opened - that is a tree walk")
        self.assertNotIn("f-leak", w.map.values(), "a file id leaked into the folder map")

    def test_no_blind_depth_beyond_exceptions(self):
        w = self._walk(mode="level1", budget=200)
        paths = {f["path"] for f in w.folders}
        self.assertNotIn("Other/inside-should-not-walk", paths,
                         "non-exception folders must NOT be opened to depth 2")

    def test_studyhub_depth2_allowed(self):
        w = self._walk(mode="level1", budget=200)
        paths = {f["path"] for f in w.folders}
        # depth 2 from root means StudyHub/TN is listed
        self.assertIn("StudyHub", paths)
        self.assertIn("StudyHub/TN", paths)

    def test_suspicion_flags(self):
        w = self._walk(mode="level1", budget=200)
        # "looks-duplicated" fires on StudyHub/TN because two same-name pdfs live there
        by_path = {f["path"]: f for f in w.folders}
        self.assertIn("looks-duplicated", by_path["StudyHub/TN"]["flags"])
        # "needs-decision:foreign-brand" fires on root because of sura-guide-2024.pdf
        self.assertIn("needs-decision:foreign-brand", by_path["<root>"]["flags"])
        # "check-subject" fires because all pdfs have no lastViewedByMeTime
        self.assertIn("check-subject", by_path["StudyHub/TN"]["flags"])

    def test_csv_columns(self):
        self._walk(mode="level1", budget=200)
        csv_path = self.ledgers / "drive_inventory.csv"
        with csv_path.open(encoding="utf-8") as f:
            reader = csv.DictReader(f)
            expected = ["timestamp", "folder_path", "folder_id", "files", "subfolders",
                        "size_note", "patterns", "flags", "listed_by"]
            self.assertEqual(reader.fieldnames, expected,
                             f"CSV columns wrong: {reader.fieldnames}")
            rows = list(reader)
        self.assertTrue(any(r["folder_path"] == "<root>" for r in rows))
        self.assertTrue(any(r["folder_path"] == "Question Papers" for r in rows))

    def test_report_sections(self):
        self._walk(mode="level1", budget=200)
        md = (self.reports / "DRIVE_INVENTORY.md").read_text(encoding="utf-8")
        for section in ("## 30-second summary", "## Folders",
                        "## Twenty largest files", "## What we do not know yet"):
            self.assertIn(section, md, f"report section missing: {section}")

    def test_budget_respected(self):
        # tiny budget: root (1) + StudyHub (2) → budget 2 should stop before listing Others
        w = self._walk(mode="level1", budget=2)
        self.assertLessEqual(w.calls, 2 + 10, "budget must be respected")
        self.assertTrue(w.skipped, "walker should report what was skipped when budget ran out")
        md = (self.reports / "DRIVE_INVENTORY.md").read_text(encoding="utf-8")
        self.assertIn("skipped", md.lower())

    def test_drive_map_filters_legacy_values_and_reverifies_real_ids(self):
        drive_map = self.ledgers / "drive_map.json"
        drive_map.write_text(json.dumps({
            "_note": "legacy metadata",
            "_updated": "legacy timestamp",
            "folders": {
                "_note": "not a folder path",
                "_updated": "not a folder path",
                "StudyHub/prior": "d-prior",
                "null-id": None,
                "empty-id": "",
                "non-string-id": 27,
            },
        }), encoding="utf-8")
        LIST_CALLS.clear()
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            w = drive_inventory.walk(mode="level1", budget=20)
        self.assertEqual(w.prior_folders, {"StudyHub/prior": "d-prior"})
        self.assertIn(("info", "d-prior"), LIST_CALLS,
                      "a valid path → id string from drive_map must be re-verified")
        self.assertNotIn(("info", "not a folder path"), LIST_CALLS)
        self.assertNotIn(("info", ""), LIST_CALLS)

        # The write side applies the same strict filter to the folders object.
        w.map.update({
            "valid/path": "d-valid",
            "_note": "not a path",
            "null-id": None,
            "empty-id": "",
            "non-string-id": 27,
            27: "non-string-path",
        })
        drive_inventory.write_map(w)
        saved = json.loads(drive_map.read_text(encoding="utf-8"))
        self.assertEqual(saved["folders"]["valid/path"], "d-valid")
        self.assertNotIn("_note", saved["folders"])
        self.assertNotIn("null-id", saved["folders"])
        self.assertNotIn("empty-id", saved["folders"])
        self.assertNotIn("non-string-id", saved["folders"])
        self.assertTrue(all(isinstance(k, str) and isinstance(v, str) and v.strip()
                            for k, v in saved["folders"].items()))

    def test_malformed_drive_map_falls_back_to_empty(self):
        (self.ledgers / "drive_map.json").write_text("{not json", encoding="utf-8")
        walker = drive_inventory.Walker(mode="root", budget=1)
        self.assertEqual(walker.map, {})
        self.assertEqual(walker.prior_folders, {})

    def test_empty_list_is_a_successfully_listed_empty_folder(self):
        with mock.patch.object(drive_call, "call", return_value=[]):
            walker = drive_inventory.Walker(mode="root", budget=1)
            info = walker.list_folder("empty-folder")
        self.assertIsNotNone(info)
        self.assertEqual(info["files"], 0)
        self.assertEqual(info["subfolders"], 0)
        self.assertEqual(len(walker.folders), 1)
        self.assertEqual(walker.errors, [])

    def test_dead_client_writes_no_rows_or_report(self):
        def dead_call(action, path, extra=None):
            raise drive_call.DriveError("client offline")

        stderr = io.StringIO()
        with mock.patch.object(drive_call, "call", side_effect=dead_call):
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(stderr):
                code = drive_inventory.main(["--mode", "root", "--budget", "1"])
        self.assertNotEqual(code, 0)
        self.assertIn("client offline", stderr.getvalue())
        self.assertFalse((self.ledgers / "drive_inventory.csv").exists(),
                         "a failed run must not leave CSV rows or a header")
        self.assertFalse((self.ledgers / "drive_map.json").exists())
        self.assertFalse((self.reports / "DRIVE_INVENTORY.md").exists(),
                         "a failed run must not leave a 0-folder report")

    def test_partial_failure_writes_successes_and_exits_four(self):
        def partial_call(action, path, extra=None):
            if action == "list" and path == "d-study":
                LIST_CALLS.append((action, path))
                raise drive_call.DriveError("one folder offline")
            return _fake_call(action, path, extra)

        stderr = io.StringIO()
        with mock.patch.object(drive_call, "call", side_effect=partial_call):
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(stderr):
                code = drive_inventory.main(["--mode", "level1", "--budget", "30"])
        self.assertEqual(code, 4)
        self.assertIn("one folder offline", stderr.getvalue())
        self.assertTrue((self.reports / "DRIVE_INVENTORY.md").exists())
        with (self.ledgers / "drive_inventory.csv").open(encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        self.assertTrue(rows, "successful folder listings should be written")
        self.assertFalse(any(row["folder_path"] == "StudyHub" for row in rows),
                         "a failed call must not become a zero-file folder row")


class DriveCallSelfTests(unittest.TestCase):
    def test_empty_body_names_http_status_and_common_causes(self):
        class EmptyResponse:
            status = 403
            headers = {}

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc_value, traceback):
                return False

            def read(self):
                return b""

        class EmptyOpener:
            def open(self, request, timeout=None):
                return EmptyResponse()

        with mock.patch.object(drive_call.urllib.request, "build_opener", return_value=EmptyOpener()):
            with self.assertRaises(drive_call.DriveError) as caught:
                drive_call._post_once("http://example.test", b"{}", "")
        message = str(caught.exception)
        self.assertIn("HTTP 403", message)
        self.assertIn('Who has access > Anyone > Deploy', message)
        self.assertIn("/dev URL", message)
        self.assertIn("/exec URL", message)
        self.assertIn("check Executions", message)


def main():
    # Run tests, print a friendly summary.
    runner = unittest.TextTestRunner(verbosity=0)
    loader = unittest.defaultTestLoader
    suite = unittest.TestSuite([
        loader.loadTestsFromTestCase(InventorySelfTests),
        loader.loadTestsFromTestCase(DriveCallSelfTests),
    ])
    res = runner.run(suite)
    if res.wasSuccessful():
        print("ALL CHECKS PASSED")
        return 0
    print(f"FAILURES: {len(res.failures)}  ERRORS: {len(res.errors)}")
    for tc, msg in res.failures + res.errors:
        print("-" * 60)
        print(tc)
        print(msg)
    return 1


if __name__ == "__main__":
    sys.exit(main())

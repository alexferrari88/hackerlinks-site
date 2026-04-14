import json
import tempfile
import unittest
from pathlib import Path

from hackerlinks.normalize import normalize_artifacts, write_public_records

FIXTURES = Path(__file__).parent / "fixtures"


class NormalizeTests(unittest.TestCase):
    def test_normalize_artifacts_builds_issue_item_and_mentions(self) -> None:
        run_data = json.loads((FIXTURES / "sample-run.json").read_text())
        history_data = json.loads((FIXTURES / "sample-history.json").read_text())

        public = normalize_artifacts(run_data, history_data)

        self.assertEqual(public["issue"]["id"], "2026-04-14")
        self.assertEqual(public["issue"]["summary"]["items_surfaced"], 6)
        self.assertEqual(len(public["issue"]["mention_ids"]), 6)
        self.assertEqual(len(public["items"]), 6)
        self.assertEqual(len(public["mentions"]), 6)

        davinci = public["items"]["davinci-resolve"]
        self.assertEqual(davinci["name"], "DaVinci Resolve")
        self.assertEqual(davinci["times_seen"], 1)
        self.assertEqual(davinci["first_seen_at"], "2026-04-14T13:41:27.313438+00:00")
        self.assertEqual(davinci["latest_mention_id"], "2026-04-14:davinci-resolve:47760529")

        jellyfin_mention = public["mentions"]["2026-04-14:jellyfin:47759341"]
        self.assertEqual(jellyfin_mention["source_story_id"], "47759341")
        self.assertEqual(jellyfin_mention["item_id"], "jellyfin")
        self.assertFalse(jellyfin_mention["is_repeat"])
        self.assertIn("placeholder", jellyfin_mention["evidence"].lower())

    def test_write_public_records_writes_expected_files(self) -> None:
        run_data = json.loads((FIXTURES / "sample-run.json").read_text())
        history_data = json.loads((FIXTURES / "sample-history.json").read_text())
        public = normalize_artifacts(run_data, history_data)

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            write_public_records(root, public)

            self.assertTrue((root / "issues" / "2026-04-14.json").exists())
            self.assertTrue((root / "items" / "davinci-resolve.json").exists())
            self.assertTrue((root / "mentions" / "2026-04-14:davinci-resolve:47760529.json").exists())
            self.assertTrue((root / "manifests" / "latest.json").exists())
            self.assertTrue((root / "manifests" / "archive.json").exists())


if __name__ == "__main__":
    unittest.main()

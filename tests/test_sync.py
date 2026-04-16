import copy
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from hackerlinks.sync import blocking_dirty_paths, sync_repo

FIXTURES = Path(__file__).parent / "fixtures"


class SyncTests(unittest.TestCase):
    def test_sync_repo_uses_latest_private_run_and_builds_public_site(self) -> None:
        sample_run = json.loads((FIXTURES / "sample-run.json").read_text())
        sample_history = json.loads((FIXTURES / "sample-history.json").read_text())

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            private_root = root / "private"
            repo_root = root / "repo"

            (private_root / "runs").mkdir(parents=True, exist_ok=True)
            (repo_root / "data" / "source" / "runs").mkdir(parents=True, exist_ok=True)

            older_run = dict(sample_run)
            older_run["run_date"] = "2026-04-13"
            older_run["generated_at"] = "2026-04-13T13:41:27.313438+00:00"

            (private_root / "runs" / "2026-04-13.json").write_text(json.dumps(older_run, indent=2) + "\n")
            (private_root / "runs" / "2026-04-14.json").write_text(json.dumps(sample_run, indent=2) + "\n")
            (private_root / "product-history.json").write_text(json.dumps(sample_history, indent=2) + "\n")

            result = sync_repo(private_root=private_root, repo_root=repo_root)

            self.assertEqual(result["latest_run_date"], "2026-04-14")
            self.assertTrue((repo_root / "data" / "source" / "runs" / "2026-04-14.json").exists())
            self.assertTrue((repo_root / "data" / "source" / "product-history.json").exists())
            self.assertTrue((repo_root / "data" / "public" / "items" / "davinci-resolve.json").exists())
            self.assertTrue((repo_root / "dist" / "index.html").exists())
            self.assertTrue((repo_root / "dist" / "issues" / "index.html").exists())
            self.assertTrue((repo_root / "dist" / "archive" / "index.html").exists())
            self.assertGreaterEqual(len(result["copied_files"]), 2)

    def test_sync_repo_accumulates_item_mentions_across_multiple_runs(self) -> None:
        sample_run = json.loads((FIXTURES / "sample-run.json").read_text())
        sample_history = json.loads((FIXTURES / "sample-history.json").read_text())

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            private_root = root / "private"
            repo_root = root / "repo"

            (private_root / "runs").mkdir(parents=True, exist_ok=True)
            (repo_root / "data" / "source" / "runs").mkdir(parents=True, exist_ok=True)

            first_run = copy.deepcopy(sample_run)
            first_run["generated_at"] = "2026-04-14T13:41:27.313438+00:00"

            second_run = {
                "version": 2,
                "run_date": "2026-04-15",
                "generated_at": "2026-04-15T13:41:27.313438+00:00",
                "summary": "Later run.",
                "stories_attempted": 24,
                "stories_processed": 24,
                "items": [
                    {
                        "name": "DaVinci Resolve",
                        "thing_url": "https://www.blackmagicdesign.com/products/davinciresolve",
                        "hn_url": "https://news.ycombinator.com/item?id=48888888",
                        "source_story_title": "Resolve again",
                        "summary": "Later summary.",
                        "why_included": "Still relevant later.",
                        "evidence": "A second thread praised Resolve again."
                    }
                ]
            }

            for product in sample_history["products"]:
                if product["name"] == "DaVinci Resolve":
                    product["last_reported_at"] = "2026-04-15T13:41:27.313438+00:00"
                    product["times_reported"] = 2

            (private_root / "runs" / "2026-04-14.json").write_text(json.dumps(first_run, indent=2) + "\n")
            (private_root / "runs" / "2026-04-15.json").write_text(json.dumps(second_run, indent=2) + "\n")
            (private_root / "product-history.json").write_text(json.dumps(sample_history, indent=2) + "\n")

            sync_repo(private_root=private_root, repo_root=repo_root)

            item_payload = json.loads((repo_root / "data" / "public" / "items" / "davinci-resolve.json").read_text())
            item_html = (repo_root / "dist" / "items" / "davinci-resolve" / "index.html").read_text()

            self.assertEqual(item_payload["latest_mention_id"], "2026-04-15:davinci-resolve:48888888")
            self.assertEqual(
                item_payload["mention_ids"],
                [
                    "2026-04-14:davinci-resolve:47760529",
                    "2026-04-15:davinci-resolve:48888888",
                ],
            )
            self.assertIn("Canonical item page", item_html)
            self.assertIn("DaVinci Resolve", item_html)
            self.assertIn("Resolve again", item_html)
            self.assertIn("A second thread praised Resolve again.", item_html)

    def test_blocking_dirty_paths_flags_unrelated_repo_changes(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            repo_root = Path(tmpdir) / "repo"
            repo_root.mkdir(parents=True, exist_ok=True)

            subprocess.run(["git", "init"], cwd=repo_root, check=True, capture_output=True)
            subprocess.run(["git", "config", "user.name", "Hermes Test"], cwd=repo_root, check=True, capture_output=True)
            subprocess.run(["git", "config", "user.email", "hermes@example.com"], cwd=repo_root, check=True, capture_output=True)

            (repo_root / "data" / "source").mkdir(parents=True, exist_ok=True)
            (repo_root / "data" / "source" / "product-history.json").write_text("{}\n")
            (repo_root / "README.md").write_text("baseline\n")
            subprocess.run(["git", "add", "."], cwd=repo_root, check=True, capture_output=True)
            subprocess.run(["git", "commit", "-m", "baseline"], cwd=repo_root, check=True, capture_output=True)

            (repo_root / "README.md").write_text("changed\n")
            (repo_root / "data" / "source" / "product-history.json").write_text('{"version": 2}\n')

            blocked = blocking_dirty_paths(repo_root)

            self.assertIn("README.md", blocked)
            self.assertNotIn("data/source/product-history.json", blocked)


if __name__ == "__main__":
    unittest.main()

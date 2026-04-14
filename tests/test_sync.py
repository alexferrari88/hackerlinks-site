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
            (repo_root / "static").mkdir(parents=True, exist_ok=True)
            (repo_root / "static" / "site.css").write_text("body { color: black; }\n")

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
            self.assertGreaterEqual(len(result["copied_files"]), 2)

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

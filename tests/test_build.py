import json
import tempfile
import unittest
from pathlib import Path

from hackerlinks.build import build_public_site
from hackerlinks.normalize import normalize_artifacts, write_public_records

FIXTURES = Path(__file__).parent / "fixtures"


class BuildTests(unittest.TestCase):
    def test_build_public_site_writes_core_pages_and_preview_notes(self) -> None:
        run_data = json.loads((FIXTURES / "sample-run.json").read_text())
        history_data = json.loads((FIXTURES / "sample-history.json").read_text())
        public = normalize_artifacts(run_data, history_data)

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            public_root = root / "public"
            static_root = root / "static"
            dist_root = root / "dist"
            write_public_records(public_root, public)
            static_root.mkdir(parents=True, exist_ok=True)
            (static_root / "site.css").write_text("body { color: black; }\n")

            build_public_site(public_root, dist_root, static_root)

            index_html = (dist_root / "index.html").read_text()
            archive_html = (dist_root / "archive" / "index.html").read_text()
            issue_html = (dist_root / "issues" / "2026-04-14" / "index.html").read_text()
            item_html = (dist_root / "items" / "davinci-resolve" / "index.html").read_text()
            preview_notes = (dist_root / "preview-notes.txt").read_text()

            self.assertIn("HackerLinks", index_html)
            self.assertIn("theme-dark", index_html)
            self.assertIn("HN finds useful things. HackerLinks keeps them.", index_html)
            self.assertIn("Latest picks", index_html)
            self.assertIn("href=\"issues/2026-04-14/\"", index_html)
            self.assertNotIn("href=\"/issues/2026-04-14/\"", index_html)
            self.assertIn("fonts.googleapis.com/css2?family=Inter", index_html)
            self.assertIn("cdn.tailwindcss.com", index_html)
            self.assertNotIn("Proof-linked", index_html)
            self.assertNotIn("What this is", index_html)
            self.assertNotIn("How it works", index_html)
            self.assertIn("2026-04-14", archive_html)
            self.assertIn("Issue 2026-04-14", issue_html)
            self.assertIn("Cloudflare CLI", issue_html)
            self.assertIn("Proof trail", item_html)
            self.assertIn("https://news.ycombinator.com/item?id=47760529", item_html)
            self.assertIn("canonical id", item_html.lower())
            self.assertIn("items rendered: 6", preview_notes)
            self.assertIn("placeholder summaries: 6", preview_notes)
            self.assertTrue((dist_root / "site.css").exists())


if __name__ == "__main__":
    unittest.main()

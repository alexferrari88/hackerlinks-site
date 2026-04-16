import json
import tempfile
import unittest
from pathlib import Path

from hackerlinks.build import build_public_site
from hackerlinks.normalize import normalize_artifacts, write_public_records

FIXTURES = Path(__file__).parent / "fixtures"


class BuildTests(unittest.TestCase):
    def test_build_public_site_exports_core_routes_and_artifacts(self) -> None:
        run_data = json.loads((FIXTURES / "sample-run.json").read_text())
        history_data = json.loads((FIXTURES / "sample-history.json").read_text())

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            public_root = root / "public"
            dist_root = root / "dist"
            write_public_records(public_root, normalize_artifacts(run_data, history_data))
            build_public_site(public_root, dist_root)

            index_html = (dist_root / "index.html").read_text()
            issues_html = (dist_root / "issues" / "index.html").read_text()
            issue_html = (dist_root / "issues" / "2026-04-14" / "index.html").read_text()
            item_html = (dist_root / "items" / "davinci-resolve" / "index.html").read_text()
            feed_xml = (dist_root / "feed.xml").read_text()
            sitemap_xml = (dist_root / "sitemap.xml").read_text()
            preview_notes = (dist_root / "preview-notes.txt").read_text()

            self.assertTrue((dist_root / ".nojekyll").exists())
            self.assertTrue((dist_root / "archive" / "index.html").exists())
            self.assertIn("Surfaced from the signal.", index_html)
            self.assertIn("Signal Ledger", index_html)
            self.assertIn("/hackerlinks-site/issues/2026-04-14", index_html)
            self.assertIn("/hackerlinks-site/_next/static/", index_html)
            self.assertIn("Every captured issue, kept in chronological order.", issues_html)
            self.assertIn("Issue / 2026-04-14", issue_html)
            self.assertIn("Cloudflare CLI", issue_html)
            self.assertIn("DaVinci Resolve", item_html)
            self.assertIn("Canonical id", item_html)
            self.assertIn("Why it matters", item_html)
            self.assertIn("DaVinci Resolve – Photo", item_html)
            self.assertIn("https://alexferrari88.github.io/hackerlinks-site/items/davinci-resolve/", sitemap_xml)
            self.assertIn("https://alexferrari88.github.io/hackerlinks-site/issues/2026-04-14/", sitemap_xml)
            self.assertIn("https://alexferrari88.github.io/hackerlinks-site/", feed_xml)
            self.assertIn("DaVinci Resolve", feed_xml)
            self.assertIn("items rendered: 6", preview_notes)
            self.assertIn("placeholder summaries: 0", preview_notes)
            self.assertIn("placeholder rationales: 0", preview_notes)
            self.assertIn("placeholder evidence rows: 0", preview_notes)

    def test_build_public_site_preserves_item_ordering_and_issue_navigation(self) -> None:
        history_data = {
            "version": 2,
            "cooldown_days": 90,
            "products": [
                {
                    "name": "Alpha Repeat",
                    "first_reported_at": "2026-04-14T09:00:00+00:00",
                    "last_reported_at": "2026-04-14T09:00:00+00:00",
                    "times_reported": 3,
                },
                {
                    "name": "Zulu Repeat",
                    "first_reported_at": "2026-04-14T09:00:00+00:00",
                    "last_reported_at": "2026-04-15T09:00:00+00:00",
                    "times_reported": 2,
                },
                {
                    "name": "Omega New",
                    "first_reported_at": "2026-04-15T09:00:00+00:00",
                    "last_reported_at": "2026-04-15T09:00:00+00:00",
                    "times_reported": 1,
                },
            ],
        }
        run_1 = {
            "version": 2,
            "run_date": "2026-04-14",
            "generated_at": "2026-04-14T09:00:00+00:00",
            "stories_attempted": 2,
            "stories_processed": 2,
            "items": [
                {
                    "name": "Alpha Repeat",
                    "thing_url": "https://example.com/alpha-repeat",
                    "hn_url": "https://news.ycombinator.com/item?id=101",
                    "source_story_title": "Alpha story",
                    "summary": "Alpha repeat summary.",
                    "why_included": "Alpha repeat why.",
                    "evidence": "Alpha repeat evidence.",
                },
                {
                    "name": "Zulu Repeat",
                    "thing_url": "https://example.com/zulu-repeat",
                    "hn_url": "https://news.ycombinator.com/item?id=102",
                    "source_story_title": "Zulu story",
                    "summary": "Zulu repeat summary.",
                    "why_included": "Zulu repeat why.",
                    "evidence": "Zulu repeat evidence.",
                },
            ],
        }
        run_2 = {
            "version": 2,
            "run_date": "2026-04-15",
            "generated_at": "2026-04-15T09:00:00+00:00",
            "stories_attempted": 2,
            "stories_processed": 2,
            "items": [
                {
                    "name": "Zulu Repeat",
                    "thing_url": "https://example.com/zulu-repeat",
                    "hn_url": "https://news.ycombinator.com/item?id=201",
                    "source_story_title": "Zulu story later",
                    "summary": "Zulu repeat later summary.",
                    "why_included": "Zulu repeat later why.",
                    "evidence": "Zulu repeat later evidence.",
                },
                {
                    "name": "Omega New",
                    "thing_url": "https://example.com/omega-new",
                    "hn_url": "https://news.ycombinator.com/item?id=202",
                    "source_story_title": "Omega story",
                    "summary": "Omega new summary.",
                    "why_included": "Omega new why.",
                    "evidence": "Omega new evidence.",
                },
            ],
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            public_root = root / "public"
            dist_root = root / "dist"

            write_public_records(public_root, normalize_artifacts(run_1, history_data))
            write_public_records(public_root, normalize_artifacts(run_2, history_data))
            build_public_site(public_root, dist_root)

            index_html = (dist_root / "index.html").read_text()
            archive_html = (dist_root / "archive" / "index.html").read_text()
            issue_1_html = (dist_root / "issues" / "2026-04-14" / "index.html").read_text()
            issue_2_html = (dist_root / "issues" / "2026-04-15" / "index.html").read_text()

            self.assertLess(index_html.index("Omega New"), index_html.index("Alpha Repeat"))
            self.assertLess(index_html.index("Zulu Repeat"), index_html.index("Alpha Repeat"))
            self.assertIn("/hackerlinks-site/issues/2026-04-15", issue_1_html)
            self.assertIn("Previous issue", issue_2_html)
            self.assertIn("/hackerlinks-site/issues/2026-04-14", issue_2_html)
            self.assertIn("Alpha Repeat", archive_html)
            self.assertIn("Omega New", archive_html)


if __name__ == "__main__":
    unittest.main()

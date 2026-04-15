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
            self.assertIn("Building a CLI for all of Cloudflare", issue_html)
            self.assertIn("Proof trail", item_html)
            self.assertIn("Adobe alternative", item_html)
            self.assertIn("DaVinci Resolve – Photo", item_html)
            self.assertIn("$295 perpetual license", item_html)
            self.assertIn("https://news.ycombinator.com/item?id=47760529", item_html)
            self.assertIn("canonical id", item_html.lower())
            self.assertIn("items rendered: 6", preview_notes)
            self.assertIn("placeholder summaries: 0", preview_notes)
            self.assertIn("placeholder evidence rows: 0", preview_notes)
            self.assertTrue((dist_root / "site.css").exists())

    def test_build_public_site_writes_feed_and_sitemap(self) -> None:
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

            feed_xml = (dist_root / "feed.xml").read_text()
            sitemap_xml = (dist_root / "sitemap.xml").read_text()

            self.assertIn("https://alexferrari88.github.io/hackerlinks-site/", feed_xml)
            self.assertIn("DaVinci Resolve", feed_xml)
            self.assertIn("https://alexferrari88.github.io/hackerlinks-site/items/davinci-resolve/", sitemap_xml)
            self.assertIn("https://alexferrari88.github.io/hackerlinks-site/issues/2026-04-14/", sitemap_xml)

    def test_build_public_site_adds_navigation_archive_previews_and_home_ordering(self) -> None:
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
            static_root = root / "static"
            dist_root = root / "dist"
            static_root.mkdir(parents=True, exist_ok=True)
            (static_root / "site.css").write_text("body { color: black; }\n")

            write_public_records(public_root, normalize_artifacts(run_1, history_data))
            write_public_records(public_root, normalize_artifacts(run_2, history_data))
            build_public_site(public_root, dist_root, static_root)

            index_html = (dist_root / "index.html").read_text()
            archive_html = (dist_root / "archive" / "index.html").read_text()
            issue_1_html = (dist_root / "issues" / "2026-04-14" / "index.html").read_text()
            issue_2_html = (dist_root / "issues" / "2026-04-15" / "index.html").read_text()

            recent_section = index_html.split("Fresh archive entries", 1)[1].split("Repeat items", 1)[0]
            repeat_section = index_html.split("Repeat items", 1)[1]

            self.assertLess(recent_section.index("Omega New"), recent_section.index("Alpha Repeat"))
            self.assertLess(repeat_section.index("Zulu Repeat"), repeat_section.index("Alpha Repeat"))
            self.assertIn("Next issue", issue_1_html)
            self.assertIn("../../issues/2026-04-15/", issue_1_html)
            self.assertIn("Previous issue", issue_2_html)
            self.assertIn("../../issues/2026-04-14/", issue_2_html)
            self.assertIn("Alpha Repeat", archive_html)
            self.assertIn("Omega New", archive_html)


if __name__ == "__main__":
    unittest.main()

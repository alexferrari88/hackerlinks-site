import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from hackerlinks import build as build_module
from hackerlinks.build import build_public_site
from hackerlinks.normalize import normalize_artifacts, write_public_records

FIXTURES = Path(__file__).parent / "fixtures"


class BuildTests(unittest.TestCase):
    def test_npm_executable_falls_back_to_node_sibling_when_npm_missing_on_path(self) -> None:
        with patch("hackerlinks.build.shutil.which") as mock_which:
            mock_which.side_effect = lambda name: {
                "npm": None,
                "node": "/home/alex/.nvm/versions/node/v25.6.0/bin/node",
            }.get(name)

            resolved = build_module._npm_executable()

        self.assertEqual(resolved, "/home/alex/.nvm/versions/node/v25.6.0/bin/npm")

    def test_npm_executable_resolves_real_node_path_when_node_on_path_is_symlink(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            real_bin = root / "real-bin"
            link_bin = root / "link-bin"
            real_bin.mkdir()
            link_bin.mkdir()
            (real_bin / "node").write_text("node")
            (real_bin / "npm").write_text("npm")
            (link_bin / "node").symlink_to(real_bin / "node")

            with patch("hackerlinks.build.shutil.which") as mock_which:
                mock_which.side_effect = lambda name: {
                    "npm": None,
                    "node": str(link_bin / "node"),
                }.get(name)

                resolved = build_module._npm_executable()

        self.assertEqual(resolved, str(real_bin / "npm"))

    def test_run_next_export_routes_build_logs_to_stderr(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            public_root = root / "public"
            frontend_root = root / "frontend"
            public_root.mkdir()
            frontend_root.mkdir()

            with patch("hackerlinks.build._npm_executable", return_value="/opt/npm"), patch(
                "hackerlinks.build.subprocess.run"
            ) as mock_run:
                build_module._run_next_export(
                    public_root=public_root,
                    frontend_root=frontend_root,
                    site_url="https://example.com/hackerlinks-site",
                )

        _, kwargs = mock_run.call_args
        self.assertIs(kwargs["stdout"], sys.stderr)
        self.assertIs(kwargs["stderr"], sys.stderr)

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
            about_html = (dist_root / "about" / "index.html").read_text()
            methodology_html = (dist_root / "methodology" / "index.html").read_text()
            issue_html = (dist_root / "issues" / "2026-04-14" / "index.html").read_text()
            item_html = (dist_root / "items" / "davinci-resolve" / "index.html").read_text()
            feed_xml = (dist_root / "feed.xml").read_text()
            sitemap_xml = (dist_root / "sitemap.xml").read_text()
            robots_txt = (dist_root / "robots.txt").read_text()
            llms_txt = (dist_root / "llms.txt").read_text()
            site_manifest = json.loads((dist_root / "data" / "manifests" / "site.json").read_text())
            items_manifest = json.loads((dist_root / "data" / "manifests" / "items.json").read_text())
            preview_notes = (dist_root / "preview-notes.txt").read_text()

            self.assertTrue((dist_root / ".nojekyll").exists())
            self.assertTrue((dist_root / "archive" / "index.html").exists())
            self.assertTrue((dist_root / "data" / "items" / "davinci-resolve.json").exists())
            self.assertIn("Find the tools developers actually use.", index_html)
            self.assertIn("source-linked archive", index_html)
            self.assertIn("application/ld+json", index_html)
            self.assertIn("rel=\"canonical\"", index_html)
            self.assertIn("property=\"og:title\"", index_html)
            self.assertIn("/issues/2026-04-14", index_html)
            self.assertIn("/_next/static/", index_html)
            self.assertIn("Every tool recommendation, saved chronologically.", issues_html)
            self.assertIn("Archive Map", (dist_root / "archive" / "index.html").read_text())
            self.assertIn("About", about_html)
            self.assertIn("Methodology", methodology_html)
            self.assertIn("Issue / 2026-04-14", issue_html)
            self.assertIn("How this issue was compiled", issue_html)
            self.assertIn("Cloudflare CLI", issue_html)
            self.assertIn("DaVinci Resolve", item_html)
            self.assertIn("Reference ID", item_html)
            self.assertIn("Why developers recommend it", item_html)
            self.assertIn("Why this record is trustworthy", item_html)
            self.assertIn("DaVinci Resolve – Photo", item_html)
            self.assertIn("https://hackerlinks.cc/about/", sitemap_xml)
            self.assertIn("https://hackerlinks.cc/methodology/", sitemap_xml)
            self.assertIn("<lastmod>", sitemap_xml)
            self.assertIn("https://hackerlinks.cc/items/davinci-resolve/", sitemap_xml)
            self.assertIn("https://hackerlinks.cc/issues/2026-04-14/", sitemap_xml)
            self.assertIn("https://hackerlinks.cc/", feed_xml)
            self.assertIn("DaVinci Resolve", feed_xml)
            self.assertIn("User-agent: *", robots_txt)
            self.assertIn("Sitemap: https://hackerlinks.cc/sitemap.xml", robots_txt)
            self.assertIn("Site manifest: https://hackerlinks.cc/data/manifests/site.json", llms_txt)
            self.assertEqual(site_manifest["counts"]["items"], 6)
            self.assertTrue(any(item["slug"] == "davinci-resolve" for item in items_manifest["items"]))
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
            self.assertIn("/issues/2026-04-15", issue_1_html)
            self.assertIn("Previous issue", issue_2_html)
            self.assertIn("/issues/2026-04-14", issue_2_html)
            self.assertIn("Issue timeline", archive_html)
            self.assertIn("Resurfacing items", archive_html)
            self.assertIn("Omega New", archive_html)


if __name__ == "__main__":
    unittest.main()

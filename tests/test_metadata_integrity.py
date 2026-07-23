import json
import tempfile
import unittest
from pathlib import Path

from hackerlinks.build import build_public_site
from hackerlinks.normalize import normalize_artifacts, write_public_records


FIXTURES = Path(__file__).parent / "fixtures"


class MetadataIntegrityTests(unittest.TestCase):
    def test_build_suppresses_empty_issues_and_invalid_discussion_markup(self) -> None:
        run_data = json.loads((FIXTURES / "sample-run.json").read_text())
        history_data = json.loads((FIXTURES / "sample-history.json").read_text())

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            public_root = root / "public"
            dist_root = root / "dist"
            write_public_records(public_root, normalize_artifacts(run_data, history_data))
            (public_root / "issues" / "2026-04-13.json").write_text(
                json.dumps(
                    {
                        "id": "2026-04-13",
                        "date": "2026-04-13",
                        "headline": "Empty issue",
                        "summary": {
                            "items_surfaced": 0,
                            "stories_processed": 0,
                            "stories_attempted": 0,
                        },
                        "mention_ids": [],
                        "generated_at": "2026-04-13T09:00:00+00:00",
                    }
                )
            )
            archive_path = public_root / "manifests" / "archive.json"
            archive = json.loads(archive_path.read_text())
            archive["issues"].insert(
                0,
                {"id": "2026-04-13", "date": "2026-04-13", "headline": "Empty issue", "item_count": 0},
            )
            archive_path.write_text(json.dumps(archive))
            (public_root / "manifests" / "latest.json").write_text(
                json.dumps(
                    {
                        "issue_id": "2026-04-13",
                        "generated_at": "2026-04-13T09:00:00+00:00",
                        "item_count": 0,
                    }
                )
            )
            orphan_id = "2026-04-13:cloudflare-cli:47753689"
            (public_root / "mentions" / f"{orphan_id}.json").write_text(
                json.dumps(
                    {
                        "id": orphan_id,
                        "issue_id": "2026-04-13",
                        "item_id": "cloudflare-cli",
                        "seen_at": "2026-04-13T09:00:00+00:00",
                        "hn_url": "https://news.ycombinator.com/item?id=47753689",
                        "source_story_id": "47753689",
                        "source_story_title": "Orphan story",
                        "evidence": "This orphan must not be published.",
                        "rank": 1,
                        "is_repeat": False,
                    }
                )
            )
            item_path = public_root / "items" / "cloudflare-cli.json"
            item = json.loads(item_path.read_text())
            item["mention_ids"].append(orphan_id)
            item_path.write_text(json.dumps(item))

            build_public_site(public_root, dist_root)

            item_html = (dist_root / "items" / "davinci-resolve" / "index.html").read_text()
            feed_xml = (dist_root / "feed.xml").read_text()
            sitemap_xml = (dist_root / "sitemap.xml").read_text()
            archive_manifest = json.loads((dist_root / "data" / "manifests" / "archive.json").read_text())
            latest_manifest = json.loads((dist_root / "data" / "manifests" / "latest.json").read_text())
            exported_item = json.loads((dist_root / "data" / "items" / "cloudflare-cli.json").read_text())
            self.assertFalse((dist_root / "data" / "issues" / "2026-04-13.json").exists())
            self.assertFalse((dist_root / "issues" / "2026-04-13").exists())
            self.assertFalse((dist_root / "data" / "mentions" / f"{orphan_id}.json").exists())
            self.assertNotIn("https://hackerlinks.cc/issues/2026-04-13/", sitemap_xml)
            self.assertNotIn("https://hackerlinks.cc/issues/2026-04-13/", feed_xml)
            self.assertNotIn(orphan_id, exported_item["mention_ids"])
            self.assertNotIn("2026-04-13", {issue["id"] for issue in archive_manifest["issues"]})
            self.assertEqual(latest_manifest["issue_id"], "2026-04-14")
            self.assertNotIn("DiscussionForumPosting", item_html)


if __name__ == "__main__":
    unittest.main()

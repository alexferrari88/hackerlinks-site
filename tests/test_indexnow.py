import unittest

from hackerlinks.indexnow import urls_for_repo_paths


class IndexNowTests(unittest.TestCase):
    def test_item_record_changes_map_to_item_and_manifest_urls(self) -> None:
        urls = urls_for_repo_paths(["data/public/items/codex.json"])

        self.assertIn("https://hackerlinks.cc/items/codex/", urls)
        self.assertIn("https://hackerlinks.cc/data/items/codex.json", urls)
        self.assertIn("https://hackerlinks.cc/data/manifests/items.json", urls)
        self.assertIn("https://hackerlinks.cc/llms.txt", urls)

    def test_mention_record_changes_map_to_issue_item_and_manifest_urls(self) -> None:
        urls = urls_for_repo_paths(["data/public/mentions/2026-04-15:codex:47768133.json"])

        self.assertIn("https://hackerlinks.cc/issues/2026-04-15/", urls)
        self.assertIn("https://hackerlinks.cc/items/codex/", urls)
        self.assertIn("https://hackerlinks.cc/data/mentions/2026-04-15:codex:47768133.json", urls)
        self.assertIn("https://hackerlinks.cc/data/manifests/mentions.json", urls)

    def test_global_template_changes_map_to_core_site_urls(self) -> None:
        urls = urls_for_repo_paths(["lib/seo.ts"])

        self.assertIn("https://hackerlinks.cc/", urls)
        self.assertIn("https://hackerlinks.cc/archive/", urls)
        self.assertIn("https://hackerlinks.cc/issues/", urls)
        self.assertIn("https://hackerlinks.cc/llms.txt", urls)
        self.assertIn("https://hackerlinks.cc/data/manifests/site.json", urls)


if __name__ == "__main__":
    unittest.main()

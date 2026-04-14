import unittest

from hackerlinks.slugs import mention_id, slugify


class SlugTests(unittest.TestCase):
    def test_slugify_normalizes_name(self) -> None:
        self.assertEqual(slugify("DaVinci Resolve"), "davinci-resolve")
        self.assertEqual(slugify("Cloudflare CLI"), "cloudflare-cli")

    def test_mention_id_uses_issue_slug_and_story_id(self) -> None:
        self.assertEqual(
            mention_id("2026-04-14", "DaVinci Resolve", "47760529"),
            "2026-04-14:davinci-resolve:47760529",
        )


if __name__ == "__main__":
    unittest.main()

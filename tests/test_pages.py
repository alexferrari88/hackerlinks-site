import tempfile
import unittest
from pathlib import Path

from hackerlinks.pages import prepare_pages


class PagesTests(unittest.TestCase):
    def test_navigation_urls_rewrite_to_identical_assets(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for slug in ("alpha", "beta"):
                page = root / "items" / slug
                page.mkdir(parents=True)
                (page / "index.html").write_text(slug)
                (page / "index.txt").write_text("full " + slug)
                (page / "__next._full.txt").write_text("full " + slug)
                (page / "__next._index.txt").write_text("shared layout")
                (page / "__next.items.txt").write_text("shared segment")
                (page / "__next.items.$d$slug.txt").write_text("shared segment")
                (page / "__next._head.txt").write_text("head " + slug)
            prepare_pages(root)
            rules = (root / "_redirects").read_text().splitlines()
            for slug in ("alpha", "beta"):
                for filename, expected in (
                    ("__next._full.txt", "full " + slug),
                    ("__next._index.txt", "shared layout"),
                    ("__next.items.txt", "shared segment"),
                    ("__next.items.$d$slug.txt", "shared segment"),
                ):
                    source = f"/items/:page/{filename}"
                    rule = next(line for line in rules if line.split()[0] == source)
                    _, target, status = rule.split()
                    self.assertEqual(status, "200")
                    self.assertEqual((root / target.replace(":page", slug).lstrip("/")).read_text(), expected)
                    self.assertFalse((root / "items" / slug / filename).exists())
                self.assertEqual((root / "items" / slug / "index.html").read_text(), slug)
                self.assertEqual((root / "items" / slug / "__next._head.txt").read_text(), "head " + slug)

    def test_nonidentical_payloads_are_not_deduplicated(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for slug in ("alpha", "beta"):
                page = root / "items" / slug
                page.mkdir(parents=True)
                (page / "__next._index.txt").write_text(slug)
                (page / "__next._full.txt").write_text("different")
                (page / "index.txt").write_text(slug)
            prepare_pages(root)
            for slug in ("alpha", "beta"):
                self.assertTrue((root / "items" / slug / "__next._index.txt").exists())
                self.assertTrue((root / "items" / slug / "__next._full.txt").exists())

    def test_existing_rules_preserved_and_preparation_is_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "_redirects").write_text("/old /new 301\n")
            prepare_pages(root)
            prepare_pages(root)
            self.assertEqual((root / "_redirects").read_text(), "/old /new 301\n")

    def test_free_plan_file_limit_is_enforced(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for i in range(3):
                (root / str(i)).write_text("asset")
            with self.assertRaisesRegex(ValueError, "3 files.*limit.*2"):
                prepare_pages(root, max_files=2)


if __name__ == "__main__":
    unittest.main()

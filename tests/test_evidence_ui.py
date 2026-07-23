import json
import tempfile
import unittest
from pathlib import Path

from hackerlinks.build import build_public_site
from hackerlinks.normalize import normalize_artifacts, write_public_records


ROOT = Path(__file__).resolve().parents[1]


class EvidenceUiStaticTests(unittest.TestCase):
    def test_static_export_distinguishes_exact_citations_from_legacy_paraphrases(self) -> None:
        fixtures = ROOT / "tests" / "fixtures"
        run_data = json.loads((fixtures / "sample-run.json").read_text())
        history_data = json.loads((fixtures / "sample-history.json").read_text())
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            public_root = root / "public"
            dist_root = root / "dist"
            write_public_records(public_root, normalize_artifacts(run_data, history_data))
            build_public_site(public_root, dist_root)

            home_html = (dist_root / "index.html").read_text()
            issue_html = (dist_root / "issues" / "2026-04-14" / "index.html").read_text()
            item_html = (dist_root / "items" / "davinci-resolve" / "index.html").read_text()
            for html in (home_html, issue_html, item_html):
                self.assertIn("Resolve remains my go-to editor.", html)
                self.assertIn("fixture-user", html)
                self.assertIn("https://news.ycombinator.com/item?id=47760529#47760601", html)
            self.assertIn("Editorial paraphrase", home_html)
            self.assertIn("Editorial paraphrase", issue_html)
            self.assertIn("Read the original thread", home_html)

    def test_issue_rows_render_exact_sources_and_label_legacy_paraphrases(self) -> None:
        source = (ROOT / "components" / "issue-row.tsx").read_text()
        self.assertIn("mention.evidence_sources", source)
        self.assertIn("source.comment_url", source)
        self.assertIn("source.excerpt", source)
        self.assertIn("source.author", source)
        self.assertIn("Editorial paraphrase", source)
        self.assertIn("mention.hn_url", source)

    def test_item_pages_render_direct_comment_links_and_legacy_labels(self) -> None:
        source = (ROOT / "app" / "items" / "[slug]" / "page.tsx").read_text()
        self.assertIn("mention.evidence_sources", source)
        self.assertIn("source.comment_url", source)
        self.assertIn("source.excerpt", source)
        self.assertIn("source.author", source)
        self.assertIn("Editorial paraphrase", source)
        self.assertIn("Original thread", source)

    def test_provenance_copy_distinguishes_quotes_from_paraphrases(self) -> None:
        source = (ROOT / "components" / "provenance-note.tsx").read_text()
        self.assertIn("Exact excerpts", source)
        self.assertIn("Editorial paraphrase", source)
        self.assertNotIn("the passage that caught our attention", source)


if __name__ == "__main__":
    unittest.main()

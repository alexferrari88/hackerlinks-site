import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from hackerlinks.evidence_validation import (
    validate_evidence_sources,
    validate_run_evidence_authenticity,
)


SOURCE = {
    "comment_id": "49010177",
    "comment_url": "https://news.ycombinator.com/item?id=49008211#49010177",
    "author": "vonnieda",
    "excerpt": "This is really clever.",
    "kind": "recommendation",
    "context": "first_hand_use",
    "parent_comment_id": None,
}


def packet() -> dict:
    return {
        "version": 2,
        "stories": [
            {
                "id": 49008211,
                "comments": [
                    {
                        "id": 49010177,
                        "by": "vonnieda",
                        "parent": 49008211,
                        "text": "This is really clever.<p>clever &amp; useful.\n\nIt works well. Use &lt;code&gt; literally.",
                    }
                ],
            }
        ],
    }


class StructuralEvidenceValidationTests(unittest.TestCase):
    def test_valid_source_is_preserved_exactly(self) -> None:
        source = copy.deepcopy(SOURCE)
        self.assertEqual(validate_evidence_sources([source], story_id="49008211"), [source])

    def test_accepts_hn_direct_comment_query_without_story_fragment(self) -> None:
        source = {
            **SOURCE,
            "comment_url": "https://news.ycombinator.com/item?id=49010177",
        }
        self.assertEqual(validate_evidence_sources([source], story_id="49008211"), [source])

    def test_rejects_malformed_host_path_and_non_numeric_ids(self) -> None:
        cases = [
            {**SOURCE, "comment_url": "https://example.com/item?id=49008211#49010177"},
            {**SOURCE, "comment_url": "https://news.ycombinator.com/from?id=49008211#49010177"},
            {**SOURCE, "comment_id": "comment-49010177"},
            {**SOURCE, "parent_comment_id": "parent"},
        ]
        for source in cases:
            with self.subTest(source=source), self.assertRaises(ValueError):
                validate_evidence_sources([source], story_id="49008211")

    def test_rejects_mismatched_story_query_or_comment_fragment(self) -> None:
        for url in (
            "https://news.ycombinator.com/item?id=999#49010177",
            "https://news.ycombinator.com/item?id=49008211#999",
        ):
            with self.subTest(url=url), self.assertRaises(ValueError):
                validate_evidence_sources([{**SOURCE, "comment_url": url}], story_id="49008211")

    def test_rejects_duplicate_comments_blank_excerpt_and_unknown_enums(self) -> None:
        with self.assertRaisesRegex(ValueError, "duplicate"):
            validate_evidence_sources([SOURCE, SOURCE], story_id="49008211")
        for source in (
            {**SOURCE, "excerpt": "  "},
            {**SOURCE, "kind": "praise"},
            {**SOURCE, "context": "used_once"},
        ):
            with self.subTest(source=source), self.assertRaises(ValueError):
                validate_evidence_sources([source], story_id="49008211")


class AuthenticityValidationTests(unittest.TestCase):
    def _write_run(self, root: Path, source: dict = SOURCE, packet_data: dict | None = None) -> dict:
        packet_path = root / "comment-packets" / "2026-07-23.json"
        packet_path.parent.mkdir(parents=True)
        encoded = (json.dumps(packet_data or packet(), sort_keys=True) + "\n").encode()
        packet_path.write_bytes(encoded)
        return {
            "run_date": "2026-07-23",
            "generated_at": "2026-07-23T03:17:07Z",
            "comment_packet": {"path": str(packet_path), "sha256": hashlib.sha256(encoded).hexdigest()},
            "items": [
                {
                    "name": "Bento",
                    "hn_url": "https://news.ycombinator.com/item?id=49008211",
                    "evidence_sources": [copy.deepcopy(source)],
                }
            ],
        }

    def test_authenticates_exact_packet_comment_author_story_and_excerpt(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            run = self._write_run(Path(tmpdir))
            validate_run_evidence_authenticity(run)

    def test_decodes_html_entities_and_folds_whitespace_without_changing_case_or_punctuation(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            run = self._write_run(root, {**SOURCE, "excerpt": "clever & useful. It works"})
            validate_run_evidence_authenticity(run)
            escaped_markup = copy.deepcopy(run)
            escaped_markup["items"][0]["evidence_sources"][0]["excerpt"] = "Use <code> literally."
            validate_run_evidence_authenticity(escaped_markup)
            fabricated_markup = copy.deepcopy(run)
            fabricated_markup["items"][0]["evidence_sources"][0]["excerpt"] = (
                "This is <fabricated>really clever."
            )
            with self.assertRaisesRegex(ValueError, "excerpt"):
                validate_run_evidence_authenticity(fabricated_markup)
            for excerpt in ("Clever & useful.", "clever useful"):
                invalid = copy.deepcopy(run)
                invalid["items"][0]["evidence_sources"][0]["excerpt"] = excerpt
                with self.subTest(excerpt=excerpt), self.assertRaisesRegex(ValueError, "excerpt"):
                    validate_run_evidence_authenticity(invalid)

    def test_rejects_fabricated_comment_wrong_author_story_fragment_and_hash(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            run = self._write_run(Path(tmpdir))
            mutations = [
                ("comment", lambda value: value["items"][0]["evidence_sources"][0].update(comment_id="49010178", comment_url="https://news.ycombinator.com/item?id=49008211#49010178")),
                ("author", lambda value: value["items"][0]["evidence_sources"][0].update(author="somebodyelse")),
                ("story", lambda value: value["items"][0].update(hn_url="https://news.ycombinator.com/item?id=49008212")),
                ("fragment", lambda value: value["items"][0]["evidence_sources"][0].update(comment_url="https://news.ycombinator.com/item?id=49008211#49010178")),
                ("SHA-256", lambda value: value["comment_packet"].update(sha256="0" * 64)),
            ]
            for expected, mutate in mutations:
                invalid = copy.deepcopy(run)
                mutate(invalid)
                with self.subTest(expected=expected), self.assertRaisesRegex(ValueError, expected):
                    validate_run_evidence_authenticity(invalid)

    def test_citation_bearing_run_requires_packet_metadata(self) -> None:
        with self.assertRaisesRegex(ValueError, "comment_packet"):
            validate_run_evidence_authenticity({
                "run_date": "2026-07-23",
                "items": [{"name": "Bento", "hn_url": "https://news.ycombinator.com/item?id=49008211", "evidence_sources": [SOURCE]}],
            })

    def test_legacy_run_without_citations_needs_no_packet(self) -> None:
        validate_run_evidence_authenticity({"run_date": "2026-07-23", "items": [{"name": "Bento"}]})

    def test_future_run_mode_requires_nonempty_citations_for_every_item(self) -> None:
        for item in (
            {"name": "Bento"},
            {"name": "Bento", "evidence_sources": []},
        ):
            with self.subTest(item=item), self.assertRaisesRegex(ValueError, "evidence_sources"):
                validate_run_evidence_authenticity(
                    {"run_date": "2026-07-23", "items": [item]},
                    require_evidence_sources=True,
                )


if __name__ == "__main__":
    unittest.main()

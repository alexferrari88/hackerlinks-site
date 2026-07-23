import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from hackerlinks.normalize import normalize_artifacts, rebuild_public_records, write_public_records

FIXTURES = Path(__file__).parent / "fixtures"


def _run(run_date: str, generated_at: str, items: list[dict]) -> dict:
    return {
        "version": 2,
        "run_date": run_date,
        "generated_at": generated_at,
        "stories_attempted": len(items),
        "stories_processed": len(items),
        "items": items,
    }


def _item(name: str, story_id: str, **overrides: object) -> dict:
    payload = {
        "name": name,
        "thing_url": f"https://example.com/{name.lower().replace(' ', '-')}",
        "hn_url": f"https://news.ycombinator.com/item?id={story_id}",
        "source_story_title": f"Story {story_id}",
        "summary": f"Summary {story_id}",
        "why_included": f"Why {story_id}",
        "evidence": f"Evidence {story_id}",
    }
    payload.update(overrides)
    return payload


def _tree_hash(root: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(candidate for candidate in root.rglob("*") if candidate.is_file()):
        digest.update(path.relative_to(root).as_posix().encode())
        digest.update(b"\0")
        digest.update(path.read_bytes())
    return digest.hexdigest()


class NormalizeTests(unittest.TestCase):
    def test_rebuild_public_records_replaces_tree_with_complete_corpus(self) -> None:
        first = _run("2026-04-14", "2026-04-14T09:00:00+00:00", [_item("Alpha", "101")])
        second = _run(
            "2026-04-15",
            "2026-04-15T09:00:00+00:00",
            [_item("Alpha", "201"), _item("Beta", "202")],
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            public_root = Path(tmpdir) / "public"
            (public_root / "items").mkdir(parents=True)
            (public_root / "items" / "stale.json").write_text("{}\n")

            result = rebuild_public_records(
                [(Path("2026-04-15.json"), second), (Path("2026-04-14.json"), first)],
                public_root,
            )

            alpha = json.loads((public_root / "items" / "alpha.json").read_text())
            archive = json.loads((public_root / "manifests" / "archive.json").read_text())
            self.assertFalse((public_root / "items" / "stale.json").exists())
            self.assertEqual(alpha["times_seen"], 2)
            self.assertEqual(alpha["times_seen"], len(alpha["mention_ids"]))
            self.assertEqual(alpha["latest_mention_id"], "2026-04-15:alpha:201")
            self.assertEqual(archive["issues"], [
                {"id": "2026-04-15", "date": "2026-04-15", "item_count": 2,
                 "headline": "2 interesting things surfaced from HN on 2026-04-15"},
                {"id": "2026-04-14", "date": "2026-04-14", "item_count": 1,
                 "headline": "1 interesting things surfaced from HN on 2026-04-14"},
            ])
            self.assertEqual(result["issue_count"], 2)

    def test_rebuild_rejects_duplicate_dates_and_filename_mismatch_before_writing(self) -> None:
        first = _run("2026-04-14", "2026-04-14T09:00:00+00:00", [_item("Alpha", "101")])
        disjoint = _run("2026-04-14", "2026-04-14T10:00:00+00:00", [_item("Beta", "102")])

        with tempfile.TemporaryDirectory() as tmpdir:
            public_root = Path(tmpdir) / "public"
            public_root.mkdir()
            sentinel = public_root / "sentinel.txt"
            sentinel.write_text("unchanged")
            with self.assertRaisesRegex(ValueError, "duplicate run_date"):
                rebuild_public_records([first, disjoint], public_root)
            with self.assertRaisesRegex(ValueError, "does not match run_date"):
                rebuild_public_records([(Path("2026-04-13.json"), first)], public_root)
            self.assertEqual(sentinel.read_text(), "unchanged")

    def test_rebuild_rejects_same_run_slug_and_duplicate_mention_ids(self) -> None:
        collision = _run(
            "2026-04-14", "2026-04-14T09:00:00+00:00",
            [_item("Same Name", "101"), _item("Same-Name", "102")],
        )
        duplicate_mention = _run(
            "2026-04-14", "2026-04-14T09:00:00+00:00",
            [_item("Alpha", "101"), _item("Alpha", "101")],
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            with self.assertRaisesRegex(ValueError, "same-run slug collision"):
                rebuild_public_records([(Path("2026-04-14.json"), collision)], Path(tmpdir) / "one")
            with self.assertRaisesRegex(ValueError, "duplicate mention id"):
                rebuild_public_records([(Path("2026-04-14.json"), duplicate_mention)], Path(tmpdir) / "two")

    def test_rebuild_is_idempotent_and_input_order_independent(self) -> None:
        first = _run("2026-04-14", "2026-04-14T09:00:00+00:00", [_item("Alpha", "101")])
        second = _run("2026-04-15", "2026-04-15T09:00:00+00:00", [_item("Alpha", "201")])
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            one = root / "one"
            two = root / "two"
            rebuild_public_records([(Path("2026-04-14.json"), first), (Path("2026-04-15.json"), second)], one)
            first_hash = _tree_hash(one)
            rebuild_public_records([(Path("2026-04-15.json"), second), (Path("2026-04-14.json"), first)], one)
            rebuild_public_records([(Path("2026-04-15.json"), second), (Path("2026-04-14.json"), first)], two)
            self.assertEqual(_tree_hash(one), first_hash)
            self.assertEqual(_tree_hash(two), first_hash)

    def test_latest_row_uses_mention_id_tiebreak_and_falls_back_per_field(self) -> None:
        earlier_id = _run(
            "2026-04-14", "2026-04-15T09:00:00+00:00",
            [_item("Alpha", "101", summary="Earlier summary", why_included="Earlier why")],
        )
        later_id = _run(
            "2026-04-15", "2026-04-15T09:00:00+00:00",
            [_item("Alpha", "201", summary="", why_included="Later why")],
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir) / "public"
            rebuild_public_records(
                [(Path("2026-04-15.json"), later_id), (Path("2026-04-14.json"), earlier_id)], root,
            )
            alpha = json.loads((root / "items" / "alpha.json").read_text())
            self.assertEqual(alpha["latest_mention_id"], "2026-04-15:alpha:201")
            self.assertEqual(alpha["summary"], "Earlier summary")
            self.assertEqual(alpha["why_included"], "Later why")

    def test_zero_item_run_is_omitted_and_latest_points_to_newest_nonempty_issue(self) -> None:
        nonempty = _run("2026-04-14", "2026-04-14T09:00:00+00:00", [_item("Alpha", "101")])
        empty = _run("2026-04-15", "2026-04-15T09:00:00+00:00", [])
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir) / "public"
            rebuild_public_records(
                [(Path("2026-04-14.json"), nonempty), (Path("2026-04-15.json"), empty)], root,
            )
            latest = json.loads((root / "manifests" / "latest.json").read_text())
            self.assertFalse((root / "issues" / "2026-04-15.json").exists())
            self.assertEqual(latest["issue_id"], "2026-04-14")

    def test_write_failure_preserves_prior_public_tree(self) -> None:
        run = _run("2026-04-14", "2026-04-14T09:00:00+00:00", [_item("Alpha", "101")])
        with tempfile.TemporaryDirectory() as tmpdir:
            public_root = Path(tmpdir) / "public"
            public_root.mkdir()
            sentinel = public_root / "sentinel.txt"
            sentinel.write_text("unchanged")
            with patch("hackerlinks.normalize._write_json", side_effect=OSError("injected")):
                with self.assertRaisesRegex(OSError, "injected"):
                    rebuild_public_records([(Path("2026-04-14.json"), run)], public_root)
            self.assertEqual(sentinel.read_text(), "unchanged")

    def test_rebuild_rejects_symlink_public_root_without_mutating_target(self) -> None:
        run = _run("2026-04-14", "2026-04-14T09:00:00+00:00", [_item("Alpha", "101")])
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            target = root / "outside"
            target.mkdir()
            sentinel = target / "sentinel.txt"
            sentinel.write_text("unchanged")
            public_root = root / "public"
            public_root.symlink_to(target, target_is_directory=True)

            with self.assertRaisesRegex(ValueError, "symlink"):
                rebuild_public_records([(Path("2026-04-14.json"), run)], public_root)

            self.assertTrue(public_root.is_symlink())
            self.assertEqual(sentinel.read_text(), "unchanged")
            self.assertEqual(list(root.glob(".public.backup-*")), [])

    def test_rebuild_has_no_orphan_references(self) -> None:
        run = _run("2026-04-14", "2026-04-14T09:00:00+00:00", [_item("Alpha", "101")])
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir) / "public"
            rebuild_public_records([(Path("2026-04-14.json"), run)], root)
            issue = json.loads((root / "issues" / "2026-04-14.json").read_text())
            item = json.loads((root / "items" / "alpha.json").read_text())
            for mention_key in issue["mention_ids"] + item["mention_ids"]:
                mention = json.loads((root / "mentions" / f"{mention_key}.json").read_text())
                self.assertTrue((root / "items" / f"{mention['item_id']}.json").exists())
                self.assertTrue((root / "issues" / f"{mention['issue_id']}.json").exists())

    def test_normalize_artifacts_builds_issue_item_and_mentions(self) -> None:
        run_data = json.loads((FIXTURES / "sample-run.json").read_text())
        history_data = json.loads((FIXTURES / "sample-history.json").read_text())

        public = normalize_artifacts(run_data, history_data)

        self.assertEqual(public["issue"]["id"], "2026-04-14")
        self.assertEqual(public["issue"]["summary"]["items_surfaced"], 6)
        self.assertEqual(len(public["issue"]["mention_ids"]), 6)
        self.assertEqual(len(public["items"]), 6)
        self.assertEqual(len(public["mentions"]), 6)

        davinci = public["items"]["davinci-resolve"]
        self.assertEqual(davinci["name"], "DaVinci Resolve")
        self.assertEqual(davinci["times_seen"], 1)
        self.assertEqual(davinci["first_seen_at"], "2026-04-14T13:41:27.313438+00:00")
        self.assertEqual(davinci["latest_mention_id"], "2026-04-14:davinci-resolve:47760529")
        self.assertIn("Adobe alternative", davinci["summary"])
        self.assertIn("color workflow", davinci["why_included"])

        davinci_mention = public["mentions"]["2026-04-14:davinci-resolve:47760529"]
        self.assertEqual(davinci_mention["evidence_sources"], run_data["items"][0]["evidence_sources"])

        jellyfin_mention = public["mentions"]["2026-04-14:jellyfin:47759341"]
        self.assertEqual(jellyfin_mention["source_story_id"], "47759341")
        self.assertEqual(jellyfin_mention["item_id"], "jellyfin")
        self.assertEqual(jellyfin_mention["source_story_title"], "WiiFin – Jellyfin Client for Nintendo Wii")
        self.assertFalse(jellyfin_mention["is_repeat"])
        self.assertIn("safe remote-access layer", jellyfin_mention["evidence"])

    def test_write_public_records_writes_expected_files(self) -> None:
        run_data = json.loads((FIXTURES / "sample-run.json").read_text())
        history_data = json.loads((FIXTURES / "sample-history.json").read_text())
        public = normalize_artifacts(run_data, history_data)

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            write_public_records(root, public)

            self.assertTrue((root / "issues" / "2026-04-14.json").exists())
            self.assertTrue((root / "items" / "davinci-resolve.json").exists())
            self.assertTrue((root / "mentions" / "2026-04-14:davinci-resolve:47760529.json").exists())
            self.assertTrue((root / "manifests" / "latest.json").exists())
            self.assertTrue((root / "manifests" / "archive.json").exists())


if __name__ == "__main__":
    unittest.main()

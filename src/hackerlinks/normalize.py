"""Normalize thin HN scout artifacts into public HackerLinks records."""

from __future__ import annotations

import json
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import Any, Iterable

from .models import IssueRecord, ItemRecord, MentionRecord
from .slugs import extract_story_id, mention_id, slugify

_PLACEHOLDER_SUMMARY = "Scaffold placeholder summary: richer editorial summaries should come from upstream HN scout artifacts."
_PLACEHOLDER_WHY = "Scaffold placeholder rationale: surfaced as an interesting concrete thing from HN discussion."
_PLACEHOLDER_EVIDENCE = "Scaffold placeholder evidence: this item was surfaced from an HN thread, but richer mention-level evidence still needs to be exported upstream."


def _history_index(history_data: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        slugify(product["name"]): product
        for product in history_data.get("products", [])
        if product.get("name")
    }


def normalize_artifacts(run_data: dict[str, Any], history_data: dict[str, Any]) -> dict[str, Any]:
    issue_id = run_data["run_date"]
    generated_at = run_data["generated_at"]
    history_index = _history_index(history_data)

    mentions: dict[str, dict[str, Any]] = {}
    items: dict[str, dict[str, Any]] = {}
    mention_ids: list[str] = []

    for rank, raw_item in enumerate(run_data.get("items", []), start=1):
        name = raw_item["name"]
        slug = slugify(name)
        story_id = extract_story_id(raw_item.get("hn_url", ""))
        current_mention_id = mention_id(issue_id, name, story_id)
        history_entry = history_index.get(slug, {})
        first_seen = history_entry.get("first_reported_at", generated_at)
        last_seen = history_entry.get("last_reported_at", generated_at)
        times_seen = int(history_entry.get("times_reported", 1))

        mention = MentionRecord(
            id=current_mention_id,
            issue_id=issue_id,
            item_id=slug,
            seen_at=generated_at,
            hn_url=raw_item.get("hn_url", ""),
            source_story_id=story_id,
            source_story_title=raw_item.get("source_story_title"),
            evidence=raw_item.get("evidence") or _PLACEHOLDER_EVIDENCE,
            rank=rank,
            is_repeat=times_seen > 1,
        )
        item = ItemRecord(
            id=slug,
            slug=slug,
            name=name,
            thing_url=raw_item.get("thing_url"),
            summary=raw_item.get("summary") or _PLACEHOLDER_SUMMARY,
            why_included=raw_item.get("why_included") or _PLACEHOLDER_WHY,
            first_seen_at=first_seen,
            last_seen_at=last_seen,
            times_seen=times_seen,
            latest_mention_id=current_mention_id,
            mention_ids=[current_mention_id],
        )

        mentions[current_mention_id] = mention.to_dict()
        items[slug] = item.to_dict()
        mention_ids.append(current_mention_id)

    issue = IssueRecord(
        id=issue_id,
        date=issue_id,
        generated_at=generated_at,
        summary={
            "items_surfaced": len(items),
            "stories_processed": run_data.get("stories_processed"),
            "stories_attempted": run_data.get("stories_attempted"),
        },
        headline=f"{len(items)} interesting things surfaced from HN on {issue_id}",
        mention_ids=mention_ids,
    )

    latest_manifest = {
        "issue_id": issue_id,
        "generated_at": generated_at,
        "item_count": len(items),
    }
    archive_manifest = {
        "issues": [
            {
                "id": issue_id,
                "date": issue_id,
                "item_count": len(items),
                "headline": issue.headline,
            }
        ]
    }

    return {
        "issue": issue.to_dict(),
        "items": items,
        "mentions": mentions,
        "manifests": {
            "latest": latest_manifest,
            "archive": archive_manifest,
        },
    }


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text())


def _prefer_value(new_value: Any, old_value: Any, *, placeholder_prefix: str | None = None) -> Any:
    if new_value in (None, "", []):
        return old_value
    if placeholder_prefix and isinstance(new_value, str) and new_value.startswith(placeholder_prefix):
        if isinstance(old_value, str) and old_value and not old_value.startswith(placeholder_prefix):
            return old_value
    return new_value


def _merge_item_payload(existing: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
    mention_ids: list[str] = []
    for mention_id_value in [*existing.get("mention_ids", []), *incoming.get("mention_ids", [])]:
        if mention_id_value not in mention_ids:
            mention_ids.append(mention_id_value)

    merged = dict(existing)
    merged.update(incoming)
    merged["thing_url"] = _prefer_value(incoming.get("thing_url"), existing.get("thing_url"))
    merged["summary"] = _prefer_value(
        incoming.get("summary"), existing.get("summary"), placeholder_prefix=_PLACEHOLDER_SUMMARY
    )
    merged["why_included"] = _prefer_value(
        incoming.get("why_included"), existing.get("why_included"), placeholder_prefix=_PLACEHOLDER_WHY
    )
    merged["first_seen_at"] = min(existing.get("first_seen_at", incoming["first_seen_at"]), incoming["first_seen_at"])
    merged["last_seen_at"] = max(existing.get("last_seen_at", incoming["last_seen_at"]), incoming["last_seen_at"])
    merged["times_seen"] = max(int(existing.get("times_seen", 0)), int(incoming.get("times_seen", 0)), len(mention_ids))
    merged["latest_mention_id"] = incoming.get("latest_mention_id") or existing.get("latest_mention_id")
    merged["mention_ids"] = mention_ids
    return merged


def write_public_records(root: Path, public: dict[str, Any]) -> None:
    issue = public["issue"]
    _write_json(root / "issues" / f"{issue['id']}.json", issue)

    for slug, item_payload in public["items"].items():
        item_path = root / "items" / f"{slug}.json"
        merged_item = item_payload
        if item_path.exists():
            merged_item = _merge_item_payload(_load_json(item_path), item_payload)
        _write_json(item_path, merged_item)

    for mention_key, mention_payload in public["mentions"].items():
        _write_json(root / "mentions" / f"{mention_key}.json", mention_payload)

    _write_json(root / "manifests" / "latest.json", public["manifests"]["latest"])
    _write_json(root / "manifests" / "archive.json", public["manifests"]["archive"])


RunInput = tuple[Path, dict[str, Any]] | dict[str, Any]


def validate_run_artifacts(run_data_list: Iterable[RunInput]) -> list[tuple[Path | None, dict[str, Any]]]:
    runs: list[tuple[Path | None, dict[str, Any]]] = []
    dates: set[str] = set()
    mention_ids_seen: set[str] = set()

    for entry in run_data_list:
        if isinstance(entry, tuple):
            source_path, run_data = entry
        else:
            source_path, run_data = None, entry
        if not isinstance(run_data, dict):
            raise ValueError("run artifact must be a JSON object")
        run_date = run_data.get("run_date")
        generated_at = run_data.get("generated_at")
        raw_items = run_data.get("items", [])
        if not isinstance(run_date, str) or not run_date:
            raise ValueError("run artifact missing run_date")
        if not isinstance(generated_at, str) or not generated_at:
            raise ValueError(f"run {run_date} missing generated_at")
        if not isinstance(raw_items, list):
            raise ValueError(f"run {run_date} items must be a list")
        if source_path is not None:
            if source_path.stem != run_date:
                raise ValueError(f"run filename {source_path.name} does not match run_date {run_date}")
        if run_date in dates:
            raise ValueError(f"duplicate run_date/issue id: {run_date}")
        dates.add(run_date)

        slugs_seen: set[str] = set()
        for raw_item in raw_items:
            if not isinstance(raw_item, dict):
                raise ValueError(f"run {run_date} contains a non-object item")
            name = raw_item.get("name")
            if not isinstance(name, str) or not name.strip():
                raise ValueError(f"run {run_date} contains an item without a name")
            slug = slugify(name)
            story_id = extract_story_id(raw_item.get("hn_url", ""))
            current_mention_id = mention_id(run_date, name, story_id)
            if current_mention_id in mention_ids_seen:
                raise ValueError(f"duplicate mention id: {current_mention_id}")
            mention_ids_seen.add(current_mention_id)
            if slug in slugs_seen:
                raise ValueError(f"same-run slug collision in {run_date}: {slug}")
            slugs_seen.add(slug)
        runs.append((source_path, run_data))

    return sorted(runs, key=lambda entry: (entry[1]["run_date"], entry[1]["generated_at"]))


def _latest_nonempty(rows: list[dict[str, Any]], field: str, default: Any) -> Any:
    for row in reversed(rows):
        value = row["raw"].get(field)
        if value not in (None, "", []):
            return value
    return default


def _build_corpus(runs: list[tuple[Path | None, dict[str, Any]]]) -> dict[str, Any]:
    issues: dict[str, dict[str, Any]] = {}
    mentions: dict[str, dict[str, Any]] = {}
    rows_by_slug: dict[str, list[dict[str, Any]]] = {}

    for _, run_data in runs:
        issue_id = run_data["run_date"]
        generated_at = run_data["generated_at"]
        issue_mention_ids: list[str] = []
        for rank, raw_item in enumerate(run_data.get("items", []), start=1):
            name = raw_item["name"]
            slug = slugify(name)
            story_id = extract_story_id(raw_item.get("hn_url", ""))
            current_mention_id = mention_id(issue_id, name, story_id)
            row = {
                "raw": raw_item,
                "slug": slug,
                "mention_id": current_mention_id,
                "issue_id": issue_id,
                "seen_at": generated_at,
                "story_id": story_id,
                "rank": rank,
            }
            rows_by_slug.setdefault(slug, []).append(row)
            issue_mention_ids.append(current_mention_id)

        if issue_mention_ids:
            issue = IssueRecord(
                id=issue_id,
                date=issue_id,
                generated_at=generated_at,
                summary={
                    "items_surfaced": len(issue_mention_ids),
                    "stories_processed": run_data.get("stories_processed"),
                    "stories_attempted": run_data.get("stories_attempted"),
                },
                headline=f"{len(issue_mention_ids)} interesting things surfaced from HN on {issue_id}",
                mention_ids=issue_mention_ids,
            )
            issues[issue_id] = issue.to_dict()

    items: dict[str, dict[str, Any]] = {}
    for slug in sorted(rows_by_slug):
        rows = sorted(rows_by_slug[slug], key=lambda row: (row["seen_at"], row["mention_id"]))
        mention_ids_for_item = [row["mention_id"] for row in rows]
        for occurrence, row in enumerate(rows):
            raw_item = row["raw"]
            mention = MentionRecord(
                id=row["mention_id"],
                issue_id=row["issue_id"],
                item_id=slug,
                seen_at=row["seen_at"],
                hn_url=raw_item.get("hn_url", ""),
                source_story_id=row["story_id"],
                source_story_title=raw_item.get("source_story_title"),
                evidence=raw_item.get("evidence") or _PLACEHOLDER_EVIDENCE,
                rank=row["rank"],
                is_repeat=occurrence > 0,
            )
            mentions[row["mention_id"]] = mention.to_dict()

        latest = rows[-1]
        item = ItemRecord(
            id=slug,
            slug=slug,
            name=_latest_nonempty(rows, "name", latest["raw"]["name"]),
            thing_url=_latest_nonempty(rows, "thing_url", None),
            summary=_latest_nonempty(rows, "summary", _PLACEHOLDER_SUMMARY),
            why_included=_latest_nonempty(rows, "why_included", _PLACEHOLDER_WHY),
            first_seen_at=rows[0]["seen_at"],
            last_seen_at=rows[-1]["seen_at"],
            times_seen=len(mention_ids_for_item),
            latest_mention_id=rows[-1]["mention_id"],
            mention_ids=mention_ids_for_item,
        )
        items[slug] = item.to_dict()

    archive_entries = [
        {
            "id": issue["id"],
            "date": issue["date"],
            "item_count": issue["summary"]["items_surfaced"],
            "headline": issue["headline"],
        }
        for issue in sorted(issues.values(), key=lambda issue: issue["date"], reverse=True)
    ]
    latest_issue = next(iter(sorted(issues.values(), key=lambda issue: issue["date"], reverse=True)), None)
    latest_manifest = {
        "issue_id": latest_issue["id"] if latest_issue else None,
        "generated_at": latest_issue["generated_at"] if latest_issue else None,
        "item_count": latest_issue["summary"]["items_surfaced"] if latest_issue else 0,
    }
    return {
        "issues": issues,
        "items": items,
        "mentions": mentions,
        "manifests": {"latest": latest_manifest, "archive": {"issues": archive_entries}},
    }


def _validate_corpus(corpus: dict[str, Any]) -> None:
    issues = corpus["issues"]
    items = corpus["items"]
    mentions = corpus["mentions"]
    issue_refs = [mention_id_value for issue in issues.values() for mention_id_value in issue["mention_ids"]]
    item_refs = [mention_id_value for item in items.values() for mention_id_value in item["mention_ids"]]
    if len(issue_refs) != len(set(issue_refs)) or set(issue_refs) != set(mentions):
        raise ValueError("issue-to-mention referential integrity failure")
    if len(item_refs) != len(set(item_refs)) or set(item_refs) != set(mentions):
        raise ValueError("item-to-mention referential integrity failure")
    for mention_key, mention in mentions.items():
        if mention["id"] != mention_key or mention["item_id"] not in items or mention["issue_id"] not in issues:
            raise ValueError(f"orphan mention record: {mention_key}")
    for slug, item in items.items():
        if item["times_seen"] != len(item["mention_ids"]):
            raise ValueError(f"invalid recurrence count: {slug}")
        if item["latest_mention_id"] not in item["mention_ids"]:
            raise ValueError(f"invalid latest mention: {slug}")


def _write_corpus(root: Path, corpus: dict[str, Any]) -> None:
    for directory in ("issues", "items", "mentions", "manifests"):
        (root / directory).mkdir(parents=True, exist_ok=True)
    for issue_id, payload in corpus["issues"].items():
        _write_json(root / "issues" / f"{issue_id}.json", payload)
    for slug, payload in corpus["items"].items():
        _write_json(root / "items" / f"{slug}.json", payload)
    for mention_key, payload in corpus["mentions"].items():
        _write_json(root / "mentions" / f"{mention_key}.json", payload)
    _write_json(root / "manifests" / "latest.json", corpus["manifests"]["latest"])
    _write_json(root / "manifests" / "archive.json", corpus["manifests"]["archive"])


def _validate_staged_tree(root: Path, corpus: dict[str, Any]) -> None:
    expected = {
        **{f"issues/{key}.json": value for key, value in corpus["issues"].items()},
        **{f"items/{key}.json": value for key, value in corpus["items"].items()},
        **{f"mentions/{key}.json": value for key, value in corpus["mentions"].items()},
        "manifests/latest.json": corpus["manifests"]["latest"],
        "manifests/archive.json": corpus["manifests"]["archive"],
    }
    actual = {path.relative_to(root).as_posix() for path in root.rglob("*.json")}
    if actual != set(expected):
        raise ValueError("staged public tree contains missing or unexpected records")
    for relative_path, expected_payload in expected.items():
        if _load_json(root / relative_path) != expected_payload:
            raise ValueError(f"staged public record does not match corpus: {relative_path}")


def _swap_public_tree(staging_root: Path, public_root: Path) -> None:
    backup_root = public_root.with_name(f".{public_root.name}.backup-{uuid.uuid4().hex}")
    moved_old = False
    try:
        if public_root.exists():
            public_root.rename(backup_root)
            moved_old = True
        staging_root.rename(public_root)
    except BaseException:
        if moved_old and not public_root.exists() and backup_root.exists():
            backup_root.rename(public_root)
        raise
    finally:
        if backup_root.exists() and public_root.exists():
            shutil.rmtree(backup_root)


def rebuild_public_records(
    run_data_list: Iterable[RunInput],
    public_root: Path,
) -> dict[str, Any]:
    """Validate all source runs and replace ``public_root`` with one complete corpus."""
    if public_root.is_symlink():
        raise ValueError(f"public root must not be a symlink: {public_root}")

    runs = validate_run_artifacts(run_data_list)
    corpus = _build_corpus(runs)
    _validate_corpus(corpus)

    public_root.parent.mkdir(parents=True, exist_ok=True)
    staging_root = Path(tempfile.mkdtemp(prefix=f".{public_root.name}.staging-", dir=public_root.parent))
    try:
        _write_corpus(staging_root, corpus)
        _validate_staged_tree(staging_root, corpus)
        _swap_public_tree(staging_root, public_root)
    finally:
        if staging_root.exists():
            shutil.rmtree(staging_root)

    latest = corpus["manifests"]["latest"]
    return {
        "issue_id": latest["issue_id"],
        "items_surfaced": latest["item_count"],
        "issue_count": len(corpus["issues"]),
        "item_count": len(corpus["items"]),
        "mention_count": len(corpus["mentions"]),
    }


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    source_root = repo_root / "data" / "source"
    public_root = repo_root / "data" / "public"

    run_files = sorted((source_root / "runs").glob("*.json"))
    if not run_files:
        raise SystemExit("no source run artifacts found")

    rebuild_public_records([(run_file, _load_json(run_file)) for run_file in run_files], public_root)


if __name__ == "__main__":
    main()

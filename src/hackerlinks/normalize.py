"""Normalize thin HN scout artifacts into public HackerLinks records."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

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


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    source_root = repo_root / "data" / "source"
    public_root = repo_root / "data" / "public"

    history_data = json.loads((source_root / "product-history.json").read_text())
    run_files = sorted((source_root / "runs").glob("*.json"))
    if not run_files:
        raise SystemExit("no source run artifacts found")

    for run_file in run_files:
        run_data = json.loads(run_file.read_text())
        public = normalize_artifacts(run_data, history_data)
        write_public_records(public_root, public)


if __name__ == "__main__":
    main()

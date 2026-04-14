"""Canonical data models for HackerLinks public records."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(slots=True)
class MentionRecord:
    id: str
    issue_id: str
    item_id: str
    seen_at: str
    hn_url: str
    source_story_id: str | None
    source_story_title: str | None
    evidence: str
    rank: int | None = None
    is_repeat: bool = False

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class ItemRecord:
    id: str
    slug: str
    name: str
    thing_url: str | None
    summary: str
    why_included: str
    first_seen_at: str
    last_seen_at: str
    times_seen: int
    latest_mention_id: str
    mention_ids: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class IssueRecord:
    id: str
    date: str
    generated_at: str
    summary: dict[str, Any]
    headline: str
    mention_ids: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

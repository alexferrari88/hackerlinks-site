"""Canonical data models for HackerLinks public records."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class EvidenceSource:
    comment_id: str
    comment_url: str
    author: str
    excerpt: str
    kind: str
    parent_comment_id: str | None
    context: str | None = None

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        if self.context is None:
            payload.pop("context")
        return payload


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
    evidence_sources: list[dict[str, Any]] | None = None

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        if self.evidence_sources is None:
            payload.pop("evidence_sources")
        return payload


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

"""Structural and packet-backed validation for exact Hacker News citations."""

from __future__ import annotations

import copy
import hashlib
import html
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

from .models import EvidenceSource

EVIDENCE_KINDS = frozenset(
    {"recommendation", "comparison", "criticism", "caveat", "incidental", "author_context"}
)
EVIDENCE_CONTEXTS = frozenset(
    {"first_hand_use", "production_use", "evaluated", "rejected", "author_or_maintainer"}
)
_REQUIRED_SOURCE_FIELDS = frozenset(
    {"comment_id", "comment_url", "author", "excerpt", "kind", "parent_comment_id"}
)
_ALLOWED_SOURCE_FIELDS = _REQUIRED_SOURCE_FIELDS | {"context"}
_NUMERIC_ID = re.compile(r"^[0-9]+$")
_SHA256 = re.compile(r"^[0-9a-f]{64}$")


class _CommentTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"p", "br"}:
            self.parts.append(" ")


def _numeric_id(value: Any, label: str, *, nullable: bool = False) -> str | None:
    if nullable and value is None:
        return None
    if not isinstance(value, str) or not _NUMERIC_ID.fullmatch(value):
        raise ValueError(f"evidence {label} must be a numeric string")
    return value


def _parse_comment_url(value: Any) -> tuple[str, str | None]:
    if not isinstance(value, str):
        raise ValueError("evidence comment_url must be a string")
    parsed = urlparse(value)
    if (
        parsed.scheme != "https"
        or parsed.hostname != "news.ycombinator.com"
        or parsed.port is not None
        or parsed.username is not None
        or parsed.path != "/item"
        or parsed.params
    ):
        raise ValueError("evidence comment_url must use the HN /item path")
    query = parse_qs(parsed.query, strict_parsing=True)
    if set(query) != {"id"} or len(query["id"]) != 1 or not _NUMERIC_ID.fullmatch(query["id"][0]):
        raise ValueError("evidence comment_url must contain one numeric id")
    if parsed.fragment and not _NUMERIC_ID.fullmatch(parsed.fragment):
        raise ValueError("evidence comment_url fragment must be numeric")
    return query["id"][0], parsed.fragment or None


def validate_evidence_sources(sources: Any, *, story_id: str | None) -> list[dict[str, Any]]:
    """Validate citation structure and return an unchanged deep copy."""
    if not isinstance(sources, list) or not sources:
        raise ValueError("evidence_sources must be a non-empty array when supplied")
    if story_id is None or not _NUMERIC_ID.fullmatch(story_id):
        raise ValueError("citation-bearing item must have a numeric HN story id")

    validated: list[dict[str, Any]] = []
    comment_ids: set[str] = set()
    for index, source in enumerate(sources):
        if not isinstance(source, dict):
            raise ValueError(f"evidence source {index} must be an object")
        missing = _REQUIRED_SOURCE_FIELDS - source.keys()
        unknown = source.keys() - _ALLOWED_SOURCE_FIELDS
        if missing:
            raise ValueError(f"evidence source {index} missing fields: {', '.join(sorted(missing))}")
        if unknown:
            raise ValueError(f"evidence source {index} has unknown fields: {', '.join(sorted(unknown))}")

        comment_id = _numeric_id(source["comment_id"], "comment_id")
        assert comment_id is not None
        _numeric_id(source["parent_comment_id"], "parent_comment_id", nullable=True)
        url_story_id, url_comment_id = _parse_comment_url(source["comment_url"])
        if url_comment_id is None:
            if url_story_id != comment_id:
                raise ValueError("direct evidence comment URL query does not match comment_id")
        else:
            if url_story_id != story_id:
                raise ValueError("evidence comment URL story query does not match item story")
            if url_comment_id != comment_id:
                raise ValueError("evidence comment URL fragment does not match comment_id")
        if comment_id in comment_ids:
            raise ValueError(f"duplicate evidence comment id: {comment_id}")
        comment_ids.add(comment_id)

        if not isinstance(source["author"], str) or not source["author"].strip():
            raise ValueError("evidence author must be non-empty")
        if not isinstance(source["excerpt"], str) or not source["excerpt"].strip():
            raise ValueError("evidence excerpt must be non-empty")
        if source["kind"] not in EVIDENCE_KINDS:
            raise ValueError(f"invalid evidence kind: {source['kind']}")
        if "context" in source and source["context"] not in EVIDENCE_CONTEXTS:
            raise ValueError(f"invalid evidence context: {source['context']}")
        record = EvidenceSource(
            comment_id=comment_id,
            comment_url=source["comment_url"],
            author=source["author"],
            excerpt=source["excerpt"],
            kind=source["kind"],
            parent_comment_id=source["parent_comment_id"],
            context=source.get("context"),
        )
        if record.to_dict() != source:
            raise ValueError(f"evidence source {index} does not match the exact source shape")
        validated.append(copy.deepcopy(source))
    return validated


def _story_id_from_item_url(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or parsed.hostname != "news.ycombinator.com" or parsed.path != "/item":
        return None
    ids = parse_qs(parsed.query).get("id", [])
    return ids[0] if len(ids) == 1 and _NUMERIC_ID.fullmatch(ids[0]) else None


def _fold_packet_comment_text(value: str) -> str:
    parser = _CommentTextParser()
    parser.feed(value)
    parser.close()
    return " ".join("".join(parser.parts).split())


def _fold_excerpt(value: str) -> str:
    return " ".join(html.unescape(value).split())


def validate_run_evidence_authenticity(
    run_data: dict[str, Any], *, require_evidence_sources: bool = False
) -> None:
    """Authenticate every supplied citation against the run's exact SHA-bound packet."""
    raw_items = run_data.get("items", [])
    if not isinstance(raw_items, list):
        raise ValueError("run items must be a list")
    if require_evidence_sources:
        for item in raw_items:
            if not isinstance(item, dict) or not item.get("evidence_sources"):
                raise ValueError("every selected item requires non-empty evidence_sources")

    citation_items = [
        item for item in raw_items if isinstance(item, dict) and "evidence_sources" in item
    ]
    if not citation_items:
        return

    metadata = run_data.get("comment_packet")
    if not isinstance(metadata, dict):
        raise ValueError("citation-bearing run requires comment_packet metadata")
    packet_path_value = metadata.get("path")
    expected_sha = metadata.get("sha256")
    if not isinstance(packet_path_value, str) or not packet_path_value:
        raise ValueError("comment_packet path must name the exact packet")
    if not isinstance(expected_sha, str) or not _SHA256.fullmatch(expected_sha):
        raise ValueError("comment_packet SHA-256 must be a lowercase hexadecimal digest")
    packet_path = Path(packet_path_value)
    expected_name = f"{run_data.get('run_date')}.json"
    if packet_path.name != expected_name:
        raise ValueError(f"comment_packet path must name {expected_name}")
    try:
        packet_bytes = packet_path.read_bytes()
    except OSError as error:
        raise ValueError(f"comment_packet cannot be read: {packet_path}") from error
    actual_sha = hashlib.sha256(packet_bytes).hexdigest()
    if actual_sha != expected_sha:
        raise ValueError("comment_packet SHA-256 mismatch")
    try:
        packet = json.loads(packet_bytes)
    except json.JSONDecodeError as error:
        raise ValueError("comment_packet is not valid JSON") from error

    comments: dict[str, tuple[str, dict[str, Any]]] = {}
    for story in packet.get("stories", []):
        story_id = str(story.get("id", ""))
        for comment in story.get("comments", []):
            comments[str(comment.get("id", ""))] = (story_id, comment)

    for item in citation_items:
        story_id = _story_id_from_item_url(item.get("hn_url"))
        sources = validate_evidence_sources(item["evidence_sources"], story_id=story_id)
        for source in sources:
            comment_id = source["comment_id"]
            match = comments.get(comment_id)
            if match is None:
                raise ValueError(f"evidence comment {comment_id} does not exist in comment_packet")
            packet_story_id, comment = match
            if packet_story_id != story_id:
                raise ValueError(f"evidence comment {comment_id} has wrong story")
            if comment.get("by") != source["author"]:
                raise ValueError(f"evidence comment {comment_id} has wrong author")
            comment_text = comment.get("text")
            if not isinstance(comment_text, str):
                raise ValueError(f"evidence comment {comment_id} has no text")
            if _fold_excerpt(source["excerpt"]) not in _fold_packet_comment_text(comment_text):
                raise ValueError(f"evidence excerpt is not contained in comment {comment_id}")

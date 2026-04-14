"""Slug generation utilities for stable item URLs."""

from __future__ import annotations

import re
import unicodedata


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    lowered = ascii_only.lower()
    cleaned = re.sub(r"[^a-z0-9]+", "-", lowered).strip("-")
    return cleaned or "item"


def extract_story_id(hn_url: str) -> str | None:
    match = re.search(r"[?&]id=(\d+)", hn_url)
    if match is None:
        return None
    return match.group(1)


def mention_id(issue_id: str, item_name: str, story_id: str | None) -> str:
    story_part = story_id or "unknown"
    return f"{issue_id}:{slugify(item_name)}:{story_part}"

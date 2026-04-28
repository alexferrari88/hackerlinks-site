"""Static build entrypoint for the Next.js-rendered HackerLinks site."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime
from email.utils import format_datetime as format_rfc2822_datetime
from html import escape
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

_PLACEHOLDER_SUMMARY_PREFIX = "Scaffold placeholder summary"
_PLACEHOLDER_EVIDENCE_PREFIX = "Scaffold placeholder evidence"
_PLACEHOLDER_WHY_PREFIX = "Scaffold placeholder rationale"
DEFAULT_SITE_URL = "https://hackerlinks.cc"
SITE_NAME = "HackerLinks"
SITE_DESCRIPTION = (
    "Source-linked archive of concrete things surfaced from Hacker News discussion."
)
FRONTEND_ROOT = Path(__file__).resolve().parents[2]


def _load_json_dir(path: Path) -> dict[str, dict[str, Any]]:
    if not path.exists():
        return {}
    payloads: dict[str, dict[str, Any]] = {}
    for file_path in sorted(path.glob("*.json")):
        payloads[file_path.stem] = json.loads(file_path.read_text())
    return payloads


def load_public_records(public_root: Path) -> dict[str, Any]:
    return {
        "issues": _load_json_dir(public_root / "issues"),
        "items": _load_json_dir(public_root / "items"),
        "mentions": _load_json_dir(public_root / "mentions"),
        "manifests": _load_json_dir(public_root / "manifests"),
    }


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)


def _site_url() -> str:
    return os.environ.get("HACKERLINKS_SITE_URL") or DEFAULT_SITE_URL


def _base_path_for_site_url(site_url: str) -> str:
    parsed = urlparse(site_url)
    raw_path = parsed.path.rstrip("/")
    return raw_path if raw_path and raw_path != "/" else ""


def _absolute_url(path: str = "", *, site_url: str) -> str:
    normalized = path.lstrip("/")
    if not normalized:
        return f"{site_url.rstrip('/')}/"
    return f"{site_url.rstrip('/')}/{normalized}"


def _safe_domain(url: str | None) -> str | None:
    if not url:
        return None
    parsed = urlparse(url)
    domain = parsed.netloc.lower().replace("www.", "")
    return domain or None


def _format_seen_at(value: str | None) -> str:
    if not value:
        return "Unknown"
    try:
        normalized = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(normalized)
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return value


def _story_label(mention: dict[str, Any]) -> str:
    story_title = mention.get("source_story_title")
    if story_title:
        return str(story_title)
    story_id = mention.get("source_story_id")
    if story_id:
        return f"HN #{story_id}"
    return "HN thread"


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def _rss_pub_date(value: str | None) -> str:
    dt = _parse_datetime(value)
    if not dt:
        return value or ""
    return format_rfc2822_datetime(dt)


def _sitemap_lastmod(value: str | None) -> str | None:
    dt = _parse_datetime(value)
    return dt.isoformat() if dt else value


def _friendly_summary(item: dict[str, Any]) -> str:
    raw_summary = str(item.get("summary") or "").strip()
    if raw_summary and not raw_summary.startswith(_PLACEHOLDER_SUMMARY_PREFIX):
        return raw_summary
    domain = _safe_domain(item.get("thing_url"))
    if domain:
        return f"Surfaced in HN. Source: {domain}."
    return "Surfaced in HN and preserved with its source thread."


def _friendly_evidence(mention: dict[str, Any], item: dict[str, Any]) -> str:
    raw_evidence = str(mention.get("evidence") or "").strip()
    if raw_evidence and not raw_evidence.startswith(_PLACEHOLDER_EVIDENCE_PREFIX):
        return raw_evidence
    story_label = _story_label(mention)
    seen_at = _format_seen_at(mention.get("seen_at"))
    return f"Surfaced in {story_label} on {seen_at} for {item['name']}."


def _sort_mentions_newest_first(mentions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        mentions,
        key=lambda mention: (mention.get("seen_at") or "", mention.get("id") or ""),
        reverse=True,
    )


def _write_preview_notes(records: dict[str, Any], dist_root: Path) -> None:
    items = list(records["items"].values())
    mentions = list(records["mentions"].values())
    placeholder_summaries = sum(
        1 for item in items if str(item.get("summary", "")).startswith(_PLACEHOLDER_SUMMARY_PREFIX)
    )
    placeholder_evidence = sum(
        1 for mention in mentions if str(mention.get("evidence", "")).startswith(_PLACEHOLDER_EVIDENCE_PREFIX)
    )
    placeholder_rationales = sum(
        1 for item in items if str(item.get("why_included", "")).startswith(_PLACEHOLDER_WHY_PREFIX)
    )
    missing_thing_urls = sum(1 for item in items if not item.get("thing_url"))
    notes = (
        f"issues rendered: {len(records['issues'])}\n"
        f"items rendered: {len(items)}\n"
        f"mentions rendered: {len(mentions)}\n"
        f"items missing thing_url: {missing_thing_urls}\n"
        f"placeholder summaries: {placeholder_summaries}\n"
        f"placeholder rationales: {placeholder_rationales}\n"
        f"placeholder evidence rows: {placeholder_evidence}\n"
    )
    _write(dist_root / "preview-notes.txt", notes)


def _write_feed(records: dict[str, Any], dist_root: Path, *, site_url: str) -> None:
    items = records["items"]
    mentions = records["mentions"]
    ordered_mentions = _sort_mentions_newest_first(list(mentions.values()))
    entries = []
    for mention in ordered_mentions:
        item = items.get(mention["item_id"])
        if not item:
            continue
        item_url = _absolute_url(f"items/{item['slug']}/", site_url=site_url)
        issue_url = _absolute_url(f"issues/{mention['issue_id']}/", site_url=site_url)
        summary = escape(_friendly_summary(item))
        evidence = escape(_friendly_evidence(mention, item))
        entries.append(
            "    <item>\n"
            f"      <title>{escape(item['name'])}</title>\n"
            f"      <link>{escape(item_url)}</link>\n"
            f"      <guid>{escape(item_url)}#{escape(mention['id'])}</guid>\n"
            f"      <pubDate>{escape(_rss_pub_date(mention.get('seen_at')))}</pubDate>\n"
            f"      <description>{summary} {evidence} Issue: {escape(issue_url)}</description>\n"
            "    </item>"
        )
    latest_generated_at = records.get("manifests", {}).get("latest", {}).get("generated_at")
    feed = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
        "<rss version=\"2.0\">\n"
        "  <channel>\n"
        f"    <title>{SITE_NAME}</title>\n"
        f"    <link>{escape(_absolute_url(site_url=site_url))}</link>\n"
        f"    <description>{escape(SITE_DESCRIPTION)}</description>\n"
        f"    <lastBuildDate>{escape(_rss_pub_date(latest_generated_at))}</lastBuildDate>\n"
        + "\n".join(entries)
        + "\n  </channel>\n"
        "</rss>\n"
    )
    _write(dist_root / "feed.xml", feed)


def _write_sitemap(records: dict[str, Any], dist_root: Path, *, site_url: str) -> None:
    latest_generated_at = records.get("manifests", {}).get("latest", {}).get("generated_at")
    url_entries = [
        (_absolute_url(site_url=site_url), latest_generated_at),
        (_absolute_url("issues/", site_url=site_url), latest_generated_at),
        (_absolute_url("archive/", site_url=site_url), latest_generated_at),
        (_absolute_url("about/", site_url=site_url), latest_generated_at),
        (_absolute_url("methodology/", site_url=site_url), latest_generated_at),
        *[
            (_absolute_url(f"issues/{issue['id']}/", site_url=site_url), issue.get("generated_at"))
            for issue in records["issues"].values()
        ],
        *[
            (_absolute_url(f"items/{item['slug']}/", site_url=site_url), item.get("last_seen_at"))
            for item in records["items"].values()
        ],
    ]
    unique_urls = list(dict.fromkeys(url_entries))
    sitemap = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
        "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n"
        + "\n".join(
            (
                f"  <url><loc>{escape(url)}</loc>"
                + (
                    f"<lastmod>{escape(lastmod)}</lastmod>"
                    if (lastmod := _sitemap_lastmod(last_seen_at))
                    else ""
                )
                + "</url>"
            )
            for url, last_seen_at in unique_urls
        )
        + "\n</urlset>\n"
    )
    _write(dist_root / "sitemap.xml", sitemap)


def _write_robots(dist_root: Path, *, site_url: str) -> None:
    robots_txt = (
        "User-agent: *\n"
        "Allow: /\n\n"
        f"Sitemap: {_absolute_url('sitemap.xml', site_url=site_url)}\n"
    )
    _write(dist_root / "robots.txt", robots_txt)


def _write_public_data_exports(records: dict[str, Any], public_root: Path, dist_root: Path, *, site_url: str) -> None:
    data_root = dist_root / "data"
    shutil.copytree(public_root, data_root)

    latest_generated_at = records.get("manifests", {}).get("latest", {}).get("generated_at")
    site_manifest = {
        "name": SITE_NAME,
        "url": _absolute_url(site_url=site_url),
        "description": SITE_DESCRIPTION,
        "generated_at": latest_generated_at,
        "counts": {
            "issues": len(records["issues"]),
            "items": len(records["items"]),
            "mentions": len(records["mentions"]),
        },
        "collections": {
            "home": _absolute_url(site_url=site_url),
            "issues": _absolute_url("issues/", site_url=site_url),
            "archive": _absolute_url("archive/", site_url=site_url),
            "about": _absolute_url("about/", site_url=site_url),
            "methodology": _absolute_url("methodology/", site_url=site_url),
            "feed": _absolute_url("feed.xml", site_url=site_url),
            "sitemap": _absolute_url("sitemap.xml", site_url=site_url),
            "llms": _absolute_url("llms.txt", site_url=site_url),
            "archive_manifest": _absolute_url("data/manifests/archive.json", site_url=site_url),
            "latest_manifest": _absolute_url("data/manifests/latest.json", site_url=site_url),
            "items_manifest": _absolute_url("data/manifests/items.json", site_url=site_url),
            "mentions_manifest": _absolute_url("data/manifests/mentions.json", site_url=site_url),
        },
    }
    items_manifest = {
        "generated_at": latest_generated_at,
        "items": sorted(
            [
                {
                    "id": item["id"],
                    "slug": item["slug"],
                    "name": item["name"],
                    "url": _absolute_url(f"items/{item['slug']}/", site_url=site_url),
                    "json_url": _absolute_url(f"data/items/{item['slug']}.json", site_url=site_url),
                    "thing_url": item.get("thing_url"),
                    "times_seen": item.get("times_seen"),
                    "first_seen_at": item.get("first_seen_at"),
                    "last_seen_at": item.get("last_seen_at"),
                }
                for item in records["items"].values()
            ],
            key=lambda item: (
                int(item.get("times_seen") or 0),
                str(item.get("last_seen_at") or ""),
                str(item.get("name") or ""),
            ),
            reverse=True,
        ),
    }
    mentions_manifest = {
        "generated_at": latest_generated_at,
        "mentions": [
            {
                "id": mention["id"],
                "seen_at": mention.get("seen_at"),
                "issue_id": mention["issue_id"],
                "issue_url": _absolute_url(f"issues/{mention['issue_id']}/", site_url=site_url),
                "item_id": mention["item_id"],
                "item_url": _absolute_url(f"items/{mention['item_id']}/", site_url=site_url),
                "json_url": _absolute_url(f"data/mentions/{mention['id']}.json", site_url=site_url),
                "hn_url": mention.get("hn_url"),
                "source_story_id": mention.get("source_story_id"),
                "source_story_title": mention.get("source_story_title"),
                "evidence": mention.get("evidence"),
            }
            for mention in _sort_mentions_newest_first(list(records["mentions"].values()))
        ],
    }
    _write(data_root / "manifests" / "site.json", json.dumps(site_manifest, indent=2, sort_keys=True) + "\n")
    _write(data_root / "manifests" / "items.json", json.dumps(items_manifest, indent=2, sort_keys=True) + "\n")
    _write(data_root / "manifests" / "mentions.json", json.dumps(mentions_manifest, indent=2, sort_keys=True) + "\n")


def _write_llms(dist_root: Path, *, site_url: str) -> None:
    llms_txt = "\n".join(
        [
            f"# {SITE_NAME}",
            "",
            f"> {SITE_DESCRIPTION}",
            "",
            "## Traversal guidance",
            "- Canonical unit: item page.",
            "- Freshness unit: issue page.",
            "- Prefer citing the linked Hacker News thread when using evidence from an item page.",
            "",
            "## Canonical pages",
            f"- Home: {_absolute_url(site_url=site_url)}",
            f"- Issues: {_absolute_url('issues/', site_url=site_url)}",
            f"- Archive: {_absolute_url('archive/', site_url=site_url)}",
            f"- About: {_absolute_url('about/', site_url=site_url)}",
            f"- Methodology: {_absolute_url('methodology/', site_url=site_url)}",
            "",
            "## Machine-readable endpoints",
            f"- Sitemap: {_absolute_url('sitemap.xml', site_url=site_url)}",
            f"- Feed: {_absolute_url('feed.xml', site_url=site_url)}",
            f"- Site manifest: {_absolute_url('data/manifests/site.json', site_url=site_url)}",
            f"- Archive manifest: {_absolute_url('data/manifests/archive.json', site_url=site_url)}",
            f"- Latest manifest: {_absolute_url('data/manifests/latest.json', site_url=site_url)}",
            f"- Items manifest: {_absolute_url('data/manifests/items.json', site_url=site_url)}",
            f"- Mentions manifest: {_absolute_url('data/manifests/mentions.json', site_url=site_url)}",
        ]
    )
    _write(dist_root / "llms.txt", llms_txt + "\n")


def _npm_executable() -> str:
    npm_path = shutil.which("npm")
    if npm_path:
        return npm_path

    node_path = shutil.which("node")
    if node_path:
        node_candidates = [Path(node_path)]
        resolved_node = Path(node_path).resolve()
        if resolved_node not in node_candidates:
            node_candidates.append(resolved_node)
        for candidate_node in node_candidates:
            sibling_npm = candidate_node.with_name("npm")
            if sibling_npm.exists():
                return str(sibling_npm)

    raise FileNotFoundError("npm executable not found on PATH and no sibling npm was found next to node")


def _run_next_export(*, public_root: Path, frontend_root: Path, site_url: str) -> Path:
    output_root = frontend_root / "out"
    if output_root.exists():
        shutil.rmtree(output_root)

    env = os.environ.copy()
    env.update(
        {
            "HACKERLINKS_PUBLIC_ROOT": str(public_root),
            "NEXT_PUBLIC_SITE_URL": site_url,
            "NEXT_BASE_PATH": _base_path_for_site_url(site_url),
        }
    )

    subprocess.run(
        [_npm_executable(), "run", "build"],
        cwd=frontend_root,
        check=True,
        env=env,
        stdout=sys.stderr,
        stderr=sys.stderr,
    )
    return output_root


def build_public_site(
    public_root: Path,
    dist_root: Path,
    static_root: Path | None = None,
    *,
    frontend_root: Path | None = None,
) -> None:
    del static_root  # Legacy parameter retained for test compatibility.
    site_url = _site_url()
    active_frontend_root = frontend_root or FRONTEND_ROOT
    export_root = _run_next_export(public_root=public_root, frontend_root=active_frontend_root, site_url=site_url)
    records = load_public_records(public_root)

    if dist_root.exists():
        shutil.rmtree(dist_root)
    shutil.copytree(export_root, dist_root)
    leaked_static_dir = dist_root / "static"
    if leaked_static_dir.exists():
        shutil.rmtree(leaked_static_dir)
    _write(dist_root / ".nojekyll", "")
    _write_public_data_exports(records, public_root, dist_root, site_url=site_url)
    _write_preview_notes(records, dist_root)
    _write_robots(dist_root, site_url=site_url)
    _write_llms(dist_root, site_url=site_url)
    _write_feed(records, dist_root, site_url=site_url)
    _write_sitemap(records, dist_root, site_url=site_url)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=FRONTEND_ROOT)
    parser.add_argument("--public-root", type=Path)
    parser.add_argument("--dist-root", type=Path)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    repo_root = args.repo_root
    public_root = args.public_root or repo_root / "data" / "public"
    dist_root = args.dist_root or repo_root / "dist"
    build_public_site(public_root=public_root, dist_root=dist_root, frontend_root=repo_root)


if __name__ == "__main__":
    main()

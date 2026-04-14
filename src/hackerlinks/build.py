"""Static HTML build entrypoint for HackerLinks."""

from __future__ import annotations

import json
import shutil
from datetime import datetime
from html import escape
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

_PLACEHOLDER_SUMMARY_PREFIX = "Scaffold placeholder summary"
_PLACEHOLDER_EVIDENCE_PREFIX = "Scaffold placeholder evidence"
_PLACEHOLDER_WHY_PREFIX = "Scaffold placeholder rationale"


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


def _page(title: str, description: str, body: str, prefix: str) -> str:
    stylesheet_href = _href(prefix, "site.css")
    return f"""<!doctype html>
<html lang=\"en\">
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>{escape(title)}</title>
    <meta name=\"description\" content=\"{escape(description)}\" />
    <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\" />
    <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin />
    <link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap\" rel=\"stylesheet\" />
    <script src=\"https://cdn.tailwindcss.com\"></script>
    <script>
      tailwind.config = {{
        theme: {{
          extend: {{
            colors: {{
              canvas: '#08090a',
              panel: '#111318',
              panel2: '#151922',
              line: '#232833',
              ink: '#f7f8f8',
              muted: '#9aa3b2',
              accent: '#7170ff',
              accent2: '#5e6ad2'
            }},
            boxShadow: {{
              panel: '0 0 0 1px rgba(255,255,255,0.06), 0 20px 50px -30px rgba(0,0,0,0.45)',
              button: '0 12px 24px -16px rgba(0,0,0,0.45)'
            }},
            borderRadius: {{
              xl2: '1.125rem'
            }}
          }}
        }}
      }}
    </script>
    <link rel=\"stylesheet\" href=\"{escape(stylesheet_href)}\" />
  </head>
  <body class=\"theme-dark bg-canvas text-ink antialiased selection:bg-accent/30\">
{body}
  </body>
</html>
"""


def _href(prefix: str, path: str = "") -> str:
    if not prefix:
        return path or "."
    return f"{prefix}/{path}" if path else f"{prefix}/"


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
        return dt.strftime("%d %b %Y")
    except ValueError:
        return value


def _thread_count(issue: dict[str, Any], mentions: dict[str, dict[str, Any]]) -> int:
    thread_ids = {mentions[mention_id].get("source_story_id") for mention_id in issue["mention_ids"]}
    return len({thread_id for thread_id in thread_ids if thread_id})


def _canonical_url_count(items: dict[str, dict[str, Any]]) -> int:
    return sum(1 for item in items.values() if item.get("thing_url"))


def _story_label(mention: dict[str, Any]) -> str:
    story_title = mention.get("source_story_title")
    if story_title:
        return str(story_title)
    story_id = mention.get("source_story_id")
    if story_id:
        return f"HN #{story_id}"
    return "HN thread"


def _friendly_summary(item: dict[str, Any]) -> str:
    raw_summary = str(item.get("summary") or "").strip()
    if raw_summary and not raw_summary.startswith(_PLACEHOLDER_SUMMARY_PREFIX):
        return raw_summary
    domain = _safe_domain(item.get("thing_url"))
    if domain:
        return f"Surfaced in HN. Source: {domain}."
    return "Surfaced in HN and preserved with its source thread."


def _compact_summary(item: dict[str, Any]) -> str:
    summary = _friendly_summary(item)
    if len(summary) <= 56:
        return summary
    return summary[:53].rstrip() + "…"


def _friendly_why(item: dict[str, Any]) -> str:
    raw_why = str(item.get("why_included") or "").strip()
    if raw_why and not raw_why.startswith(_PLACEHOLDER_WHY_PREFIX):
        return raw_why
    return "Saved because it was concrete, linkable, and worth finding later."


def _friendly_evidence(mention: dict[str, Any], item: dict[str, Any]) -> str:
    raw_evidence = str(mention.get("evidence") or "").strip()
    if raw_evidence and not raw_evidence.startswith(_PLACEHOLDER_EVIDENCE_PREFIX):
        return raw_evidence
    story_label = _story_label(mention)
    seen_at = _format_seen_at(mention.get("seen_at"))
    return f"Surfaced in {story_label} on {seen_at} for {item['name']}."


def _chip(text: str, accent: bool = False) -> str:
    classes = (
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium tracking-wide "
        + (
            "border-accent/30 bg-accent/15 text-indigo-200"
            if accent
            else "border-white/10 bg-white/5 text-zinc-300"
        )
    )
    return f'<span class="{classes}">{escape(text)}</span>'


def _button(label: str, href: str, primary: bool = False) -> str:
    classes = (
        "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition "
        + (
            "bg-accent text-white shadow-button hover:bg-accent2"
            if primary
            else "border border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10"
        )
    )
    return f'<a class="{classes}" href="{escape(href)}">{escape(label)}</a>'


def _nav(prefix: str) -> str:
    home_href = _href(prefix)
    archive_href = _href(prefix, "archive/")
    return f"""    <header class=\"sticky top-0 z-20 border-b border-white/5 bg-canvas/80 backdrop-blur\">\n      <div class=\"mx-auto flex min-h-[68px] w-full max-w-6xl items-center justify-between px-4\">\n        <a class=\"inline-flex items-center gap-3 text-sm font-semibold tracking-tight text-zinc-100\" href=\"{home_href}\">\n          <span class=\"grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent2 text-white shadow-button\">H</span>\n          <span>HackerLinks</span>\n        </a>\n        <nav class=\"flex items-center gap-5 text-sm text-zinc-400\">\n          <a class=\"hover:text-white\" href=\"{home_href}\">Home</a>\n          <a class=\"hover:text-white\" href=\"{archive_href}\">Archive</a>\n        </nav>\n      </div>\n    </header>\n"""


def _section_header(kicker: str, title: str) -> str:
    return (
        "        <div class=\"mb-4\">"
        f"<p class=\"mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500\">{escape(kicker)}</p>"
        f"<h2 class=\"text-2xl font-semibold tracking-tight text-zinc-100\">{escape(title)}</h2>"
        "</div>"
    )


def _meta_list(rows: list[tuple[str, str]]) -> str:
    items = "".join(
        f'<div class="grid grid-cols-[96px_1fr] gap-3 border-t border-white/5 py-3 first:border-t-0 first:pt-0"><dt class="text-xs text-zinc-500">{escape(label)}</dt><dd class="text-sm text-zinc-100">{escape(value)}</dd></div>'
        for label, value in rows
    )
    return f'<dl class="space-y-0">{items}</dl>'


def _render_item_card(item: dict[str, Any], mention: dict[str, Any], prefix: str, *, compact: bool = False) -> str:
    thing_url = item.get("thing_url") or mention.get("hn_url") or "#"
    hn_url = mention.get("hn_url") or "#"
    domain = _safe_domain(item.get("thing_url")) or "linked source"
    repeat_label = f"Seen {item['times_seen']} times" if item.get("times_seen", 0) > 1 else "New"
    summary = _compact_summary(item) if compact else _friendly_summary(item)
    proof_line = _friendly_evidence(mention, item)
    tag_markup = (
        f"{_chip(repeat_label, accent=True)}{_chip(domain)}"
        if compact
        else f"{_chip(repeat_label, accent=True)}{_chip(_story_label(mention))}{_chip(domain)}"
    )
    item_href = _href(prefix, f"items/{item['slug']}/")
    return f"""          <article class=\"rounded-xl2 border border-white/5 bg-panel/90 p-5 shadow-panel\">\n            <div class=\"flex flex-wrap gap-2\">{tag_markup}</div>\n            <h3 class=\"mt-4 text-xl font-semibold tracking-tight text-zinc-100\"><a class=\"hover:text-white\" href=\"{item_href}\">{escape(item['name'])}</a></h3>\n            <p class=\"mt-2 text-sm text-zinc-300\">{escape(summary)}</p>\n            <p class=\"mt-3 text-xs text-zinc-500\">{escape(_story_label(mention))} · {escape(proof_line)}</p>\n            <div class=\"mt-4 flex flex-wrap gap-4 text-sm text-accent\">\n              <a class=\"hover:text-indigo-300\" href=\"{escape(thing_url)}\">Open</a>\n              <a class=\"hover:text-indigo-300\" href=\"{escape(hn_url)}\">HN thread</a>\n            </div>\n          </article>\n"""


def _footer() -> str:
    return """    <footer class=\"mx-auto w-full max-w-6xl px-4 pb-10 text-sm text-zinc-500\">\n      <p>Archive of concrete things surfaced in HN discussion.</p>\n    </footer>\n"""


def _render_home(records: dict[str, Any]) -> str:
    prefix = ""
    issues = records["issues"]
    items = records["items"]
    mentions = records["mentions"]
    latest_issue = max(issues.values(), key=lambda issue: issue["date"])
    latest_mentions = [mentions[mention_id] for mention_id in latest_issue["mention_ids"]]
    featured_mention = latest_mentions[0]
    featured_item = items[featured_mention["item_id"]]
    cards = "".join(_render_item_card(items[m["item_id"]], m, prefix, compact=True) for m in latest_mentions)
    recent_markup = "".join(
        f'<li class="flex items-baseline justify-between gap-4 border-b border-white/5 pb-3 last:border-b-0 last:pb-0"><a class="text-zinc-100 hover:text-white" href="{_href(prefix, f"items/{item["slug"]}/")}">{escape(item["name"])}</a><span class="text-xs text-zinc-500">{escape(_safe_domain(item.get("thing_url")) or "HN-linked")}</span></li>'
        for item in sorted(items.values(), key=lambda item: item["name"])
    )
    repeat_items = [item for item in items.values() if item.get("times_seen", 0) > 1]
    repeat_markup = "".join(
        f'<li class="flex items-baseline justify-between gap-4 border-b border-white/5 pb-3 last:border-b-0 last:pb-0"><a class="text-zinc-100 hover:text-white" href="{_href(prefix, f"items/{item["slug"]}/")}">{escape(item["name"])}</a><span class="text-xs text-zinc-500">{item["times_seen"]} sightings</span></li>'
        for item in repeat_items
    ) or '<li class="text-sm text-zinc-500">No repeat items yet.</li>'

    body = (
        _nav(prefix)
        + "    <main class=\"mx-auto w-full max-w-6xl px-4 py-12\">\n"
        + "      <section class=\"grid gap-5 lg:grid-cols-[1.4fr_0.8fr]\">\n"
        + "        <div class=\"rounded-2xl border border-white/5 bg-panel/90 p-8 shadow-panel\">\n"
        + "          <p class=\"text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500\">HackerLinks</p>\n"
        + "          <h1 class=\"mt-3 max-w-[10ch] text-4xl font-semibold tracking-tight text-zinc-50 md:text-6xl\">HN finds useful things. HackerLinks keeps them.</h1>\n"
        + "          <p class=\"mt-4 max-w-2xl text-base text-zinc-300\">A dark, source-linked archive of tools, repos, talks, books, products, and other concrete things surfaced in HN discussion.</p>\n"
        + f"          <div class=\"mt-6 flex flex-wrap gap-3\">{_button('Latest issue', _href(prefix, f'issues/{latest_issue['id']}/'), primary=True)}{_button('Browse archive', _href(prefix, 'archive/'))}</div>\n"
        + "        </div>\n"
        + "        <aside class=\"rounded-2xl border border-white/5 bg-panel/90 p-6 shadow-panel\">\n"
        + "          <p class=\"text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500\">Latest issue</p>\n"
        + f"          <a class=\"mt-2 block text-2xl font-semibold tracking-tight text-zinc-50 hover:text-white\" href=\"{_href(prefix, f'issues/{latest_issue['id']}/')}\">{escape(latest_issue['date'])}</a>\n"
        + f"          <p class=\"mt-2 text-sm text-zinc-300\">{latest_issue['summary']['items_surfaced']} items from {_thread_count(latest_issue, mentions)} HN threads.</p>\n"
        + f"          <div class=\"mt-4 flex flex-wrap gap-2\">{_chip(f'{latest_issue['summary']['items_surfaced']} items', accent=True)}{_chip(f'{_thread_count(latest_issue, mentions)} threads')}{_chip(f'{_canonical_url_count(items)} pages')}</div>\n"
        + "          <div class=\"mt-5 border-t border-white/5 pt-4\">\n"
        + "            <p class=\"text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500\">Featured pick</p>\n"
        + f"            <a class=\"mt-2 block text-lg font-semibold text-zinc-100 hover:text-white\" href=\"{_href(prefix, f'items/{featured_item['slug']}/')}\">{escape(featured_item['name'])}</a>\n"
        + f"            <p class=\"mt-2 text-sm text-zinc-300\">{escape(_friendly_summary(featured_item))}</p>\n"
        + "          </div>\n"
        + "        </aside>\n"
        + "      </section>\n"
        + "      <section class=\"mt-10\">\n"
        + _section_header("Latest picks", "What HN surfaced most recently")
        + f"        <div class=\"grid gap-4 md:grid-cols-2 xl:grid-cols-3\">{cards}</div>\n"
        + "      </section>\n"
        + "      <section class=\"mt-10 grid gap-4 lg:grid-cols-2\">\n"
        + "        <article class=\"rounded-2xl border border-white/5 bg-panel/90 p-5 shadow-panel\">\n"
        + "          <p class=\"text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500\">Fresh archive entries</p>\n"
        + f"          <ul class=\"mt-4 space-y-3 text-sm\">{recent_markup}</ul>\n"
        + "        </article>\n"
        + "        <article class=\"rounded-2xl border border-white/5 bg-panel/90 p-5 shadow-panel\">\n"
        + "          <p class=\"text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500\">Repeat items</p>\n"
        + f"          <ul class=\"mt-4 space-y-3 text-sm\">{repeat_markup}</ul>\n"
        + "        </article>\n"
        + "      </section>\n"
        + "    </main>\n"
        + _footer()
    )
    return _page("HackerLinks", "Source-linked archive of concrete things surfaced from Hacker News discussion.", body, prefix)


def _render_archive(records: dict[str, Any]) -> str:
    prefix = ".."
    issues = sorted(records["issues"].values(), key=lambda issue: issue["date"], reverse=True)
    cards = "".join(
        f"""          <article class=\"rounded-2xl border border-white/5 bg-panel/90 p-5 shadow-panel\">\n            <p class=\"text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500\">Issue</p>\n            <h2 class=\"mt-2 text-2xl font-semibold tracking-tight text-zinc-50\"><a href=\"{_href(prefix, f'issues/{issue['id']}/')}\">{escape(issue['date'])}</a></h2>\n            <p class=\"mt-2 text-sm text-zinc-300\">{issue['summary']['items_surfaced']} items captured.</p>\n            <div class=\"mt-4 text-sm text-accent\"><a href=\"{_href(prefix, f'issues/{issue['id']}/')}\">Open issue</a></div>\n          </article>\n"""
        for issue in issues
    )
    body = (
        _nav(prefix)
        + "    <main class=\"mx-auto w-full max-w-6xl px-4 py-12\">\n"
        + "      <section class=\"rounded-2xl border border-white/5 bg-panel/90 p-8 shadow-panel\">\n"
        + "        <p class=\"text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500\">Archive</p>\n"
        + "        <h1 class=\"mt-3 text-4xl font-semibold tracking-tight text-zinc-50 md:text-5xl\">Every issue, kept as a stable record.</h1>\n"
        + "        <p class=\"mt-4 max-w-2xl text-base text-zinc-300\">Browse by date, then branch into canonical item pages and original HN threads.</p>\n"
        + "      </section>\n"
        + f"      <section class=\"mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3\">{cards}</section>\n"
        + "    </main>\n"
        + _footer()
    )
    return _page("HackerLinks Archive", "Date-first archive of HackerLinks issues.", body, prefix)


def _render_issue(issue: dict[str, Any], records: dict[str, Any]) -> str:
    prefix = "../.."
    mentions = records["mentions"]
    items = records["items"]
    issue_mentions = [mentions[mention_id] for mention_id in issue["mention_ids"]]
    featured_mention = issue_mentions[0]
    featured_item = items[featured_mention["item_id"]]
    cards = "".join(_render_item_card(items[m["item_id"]], m, prefix, compact=True) for m in issue_mentions)
    body = (
        _nav(prefix)
        + "    <main class=\"mx-auto w-full max-w-6xl px-4 py-12\">\n"
        + "      <section class=\"grid gap-5 lg:grid-cols-[1.3fr_0.8fr]\">\n"
        + "        <div class=\"rounded-2xl border border-white/5 bg-panel/90 p-8 shadow-panel\">\n"
        + f"          <p class=\"text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500\">Issue</p>\n"
        + f"          <h1 class=\"mt-3 text-4xl font-semibold tracking-tight text-zinc-50 md:text-5xl\">Issue {escape(issue['date'])}</h1>\n"
        + f"          <p class=\"mt-4 max-w-2xl text-base text-zinc-300\">{issue['summary']['items_surfaced']} items from {_thread_count(issue, mentions)} HN threads.</p>\n"
        + f"          <div class=\"mt-6\">{_button('Back to archive', _href(prefix, 'archive/'))}</div>\n"
        + "        </div>\n"
        + "        <aside class=\"rounded-2xl border border-white/5 bg-panel/90 p-6 shadow-panel\">\n"
        + _meta_list([
            ("Generated", _format_seen_at(issue["generated_at"])),
            ("Items", str(issue["summary"]["items_surfaced"])),
            ("Threads", str(_thread_count(issue, mentions))),
        ])
        + "          <div class=\"mt-5 border-t border-white/5 pt-4\">\n"
        + "            <p class=\"text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500\">Lead item</p>\n"
        + f"            <a class=\"mt-2 block text-lg font-semibold text-zinc-100 hover:text-white\" href=\"{_href(prefix, f'items/{featured_item['slug']}/')}\">{escape(featured_item['name'])}</a>\n"
        + f"            <p class=\"mt-2 text-sm text-zinc-300\">{escape(_friendly_summary(featured_item))}</p>\n"
        + "          </div>\n"
        + "        </aside>\n"
        + "      </section>\n"
        + "      <section class=\"mt-10\">\n"
        + _section_header("Latest picks", "Everything captured in this issue")
        + f"        <div class=\"grid gap-4 md:grid-cols-2 xl:grid-cols-3\">{cards}</div>\n"
        + "      </section>\n"
        + "    </main>\n"
        + _footer()
    )
    return _page(f"HackerLinks Issue {issue['date']}", f"Issue {issue['date']} from HackerLinks.", body, prefix)


def _render_item(item: dict[str, Any], records: dict[str, Any]) -> str:
    prefix = "../.."
    mentions = records["mentions"]
    item_mentions = [mentions[mention_id] for mention_id in item["mention_ids"]]
    latest_mention = item_mentions[0]
    domain = _safe_domain(item.get("thing_url")) or "linked source"
    thing_link = item.get("thing_url") or latest_mention.get("hn_url") or "#"
    history_rows = "".join(
        f"""          <li class=\"rounded-2xl border border-white/5 bg-panel/90 p-5 shadow-panel\">\n            <div class=\"grid gap-3 md:grid-cols-[140px_1fr]\">\n              <div class=\"text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500\">{escape(_format_seen_at(mention['seen_at']))}</div>\n              <div class=\"space-y-3\">\n                <div class=\"flex flex-wrap gap-2\">{_chip(_story_label(mention))}<a class=\"text-sm text-accent hover:text-indigo-300\" href=\"{_href(prefix, f'issues/{mention['issue_id']}/')}\">Issue page</a><a class=\"text-sm text-accent hover:text-indigo-300\" href=\"{escape(mention['hn_url'])}\">HN thread</a></div>\n                <p class=\"text-sm text-zinc-300\">{escape(_friendly_evidence(mention, item))}</p>\n              </div>\n            </div>\n          </li>\n"""
        for mention in item_mentions
    )
    body = (
        _nav(prefix)
        + "    <main class=\"mx-auto w-full max-w-6xl px-4 py-12\">\n"
        + "      <section class=\"grid gap-5 lg:grid-cols-[1.3fr_0.8fr]\">\n"
        + "        <div class=\"rounded-2xl border border-white/5 bg-panel/90 p-8 shadow-panel\">\n"
        + f"          <p class=\"text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500\">Item page</p>\n"
        + f"          <h1 class=\"mt-3 text-4xl font-semibold tracking-tight text-zinc-50 md:text-5xl\">{escape(item['name'])}</h1>\n"
        + f"          <p class=\"mt-4 text-base text-zinc-300\">{escape(_friendly_summary(item))}</p>\n"
        + f"          <p class=\"mt-3 text-sm text-zinc-500\">{escape(_friendly_why(item))}</p>\n"
        + f"          <div class=\"mt-6 flex flex-wrap gap-3\">{_button('Open source', thing_link, primary=True)}{_button('HN thread', latest_mention['hn_url'])}{_button('Back to archive', _href(prefix, 'archive/'))}</div>\n"
        + "        </div>\n"
        + "        <aside class=\"rounded-2xl border border-white/5 bg-panel/90 p-6 shadow-panel\">\n"
        + _meta_list([
            ("Canonical ID", item["slug"]),
            ("Source", domain),
            ("First archived", _format_seen_at(item["first_seen_at"])),
            ("Last seen", _format_seen_at(item["last_seen_at"])),
            ("Times seen", str(item["times_seen"])),
        ])
        + "        </aside>\n"
        + "      </section>\n"
        + "      <section class=\"mt-10\">\n"
        + _section_header("Proof trail", "Where this item showed up")
        + f"        <ol class=\"space-y-4\">{history_rows}</ol>\n"
        + "      </section>\n"
        + "    </main>\n"
        + _footer()
    )
    return _page(f"HackerLinks Item {item['name']}", f"Canonical page for {item['name']} on HackerLinks.", body, prefix)


def _copy_static_assets(static_root: Path, dist_root: Path) -> None:
    if not static_root.exists():
        return
    for asset in static_root.iterdir():
        if asset.is_file():
            shutil.copy2(asset, dist_root / asset.name)


def _write_preview_notes(records: dict[str, Any], dist_root: Path) -> None:
    items = list(records["items"].values())
    mentions = list(records["mentions"].values())
    placeholder_summaries = sum(
        1 for item in items if str(item.get("summary", "")).startswith(_PLACEHOLDER_SUMMARY_PREFIX)
    )
    placeholder_evidence = sum(
        1 for mention in mentions if str(mention.get("evidence", "")).startswith(_PLACEHOLDER_EVIDENCE_PREFIX)
    )
    missing_thing_urls = sum(1 for item in items if not item.get("thing_url"))
    notes = (
        f"issues rendered: {len(records['issues'])}\n"
        f"items rendered: {len(items)}\n"
        f"mentions rendered: {len(mentions)}\n"
        f"items missing thing_url: {missing_thing_urls}\n"
        f"placeholder summaries: {placeholder_summaries}\n"
        f"placeholder evidence rows: {placeholder_evidence}\n"
    )
    _write(dist_root / "preview-notes.txt", notes)


def build_public_site(public_root: Path, dist_root: Path, static_root: Path | None = None) -> None:
    records = load_public_records(public_root)
    dist_root.mkdir(parents=True, exist_ok=True)

    _write(dist_root / "index.html", _render_home(records))
    _write(dist_root / "archive" / "index.html", _render_archive(records))

    for issue in records["issues"].values():
        _write(dist_root / "issues" / issue["id"] / "index.html", _render_issue(issue, records))

    for item in records["items"].values():
        _write(dist_root / "items" / item["slug"] / "index.html", _render_item(item, records))

    _copy_static_assets(static_root or Path(), dist_root)
    _write_preview_notes(records, dist_root)


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    build_public_site(repo_root / "data" / "public", repo_root / "dist", repo_root / "static")


if __name__ == "__main__":
    main()

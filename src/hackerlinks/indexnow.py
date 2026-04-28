"""Compute and submit IndexNow URL batches after deployment."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Iterable
from urllib import error, parse, request

DEFAULT_SITE_URL = "https://hackerlinks.cc"
DEFAULT_INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow"
MAX_URLS_PER_REQUEST = 10_000

CORE_SITE_URLS = {
    "/",
    "/issues/",
    "/archive/",
    "/about/",
    "/methodology/",
    "/feed.xml",
    "/sitemap.xml",
    "/llms.txt",
    "/data/manifests/site.json",
    "/data/manifests/archive.json",
    "/data/manifests/latest.json",
    "/data/manifests/items.json",
    "/data/manifests/mentions.json",
}
GLOBAL_CHANGE_PREFIXES = (
    "app/",
    "components/",
    "functions/",
    "lib/",
    "public/",
    "src/hackerlinks/",
    "app/layout.tsx",
    "next.config.ts",
)


def _absolute_url(path: str, *, site_url: str) -> str:
    if path.startswith("http://") or path.startswith("https://"):
        return path
    if path == "/":
        return f"{site_url.rstrip('/')}/"
    return f"{site_url.rstrip('/')}/{path.lstrip('/')}"


def _normalize_repo_path(repo_path: str) -> str:
    return repo_path.strip().strip('"').replace("\\", "/")


def _urls_for_public_record(path: str) -> set[str]:
    urls: set[str] = set()

    if path.startswith("data/public/items/") and path.endswith(".json"):
        slug = Path(path).stem
        urls.update(
            {
                f"/items/{slug}/",
                f"/data/items/{slug}.json",
                "/data/manifests/items.json",
                "/data/manifests/site.json",
                "/llms.txt",
                "/sitemap.xml",
            }
        )
        return urls

    if path.startswith("data/public/issues/") and path.endswith(".json"):
        issue_id = Path(path).stem
        urls.update(
            {
                f"/issues/{issue_id}/",
                f"/data/issues/{issue_id}.json",
                "/",
                "/issues/",
                "/archive/",
                "/feed.xml",
                "/sitemap.xml",
                "/data/manifests/archive.json",
                "/data/manifests/latest.json",
                "/data/manifests/site.json",
                "/llms.txt",
            }
        )
        return urls

    if path.startswith("data/public/mentions/") and path.endswith(".json"):
        mention_id = Path(path).stem
        parts = mention_id.split(":", 2)
        issue_id = parts[0] if len(parts) > 0 else None
        item_id = parts[1] if len(parts) > 1 else None
        urls.update(
            {
                f"/data/mentions/{mention_id}.json",
                "/data/manifests/mentions.json",
                "/data/manifests/site.json",
                "/llms.txt",
                "/sitemap.xml",
            }
        )
        if issue_id:
            urls.add(f"/issues/{issue_id}/")
        if item_id:
            urls.add(f"/items/{item_id}/")
        return urls

    if path == "data/public/manifests/archive.json":
        urls.update(
            {
                "/archive/",
                "/issues/",
                "/data/manifests/archive.json",
                "/data/manifests/site.json",
                "/llms.txt",
                "/sitemap.xml",
            }
        )
        return urls

    if path == "data/public/manifests/latest.json":
        urls.update(
            {
                "/",
                "/issues/",
                "/archive/",
                "/feed.xml",
                "/data/manifests/latest.json",
                "/data/manifests/site.json",
                "/llms.txt",
                "/sitemap.xml",
            }
        )
        return urls

    if path == "data/public/manifests/items.json":
        urls.update(
            {
                "/data/manifests/items.json",
                "/data/manifests/site.json",
                "/llms.txt",
                "/sitemap.xml",
            }
        )
        return urls

    if path == "data/public/manifests/mentions.json":
        urls.update(
            {
                "/data/manifests/mentions.json",
                "/data/manifests/site.json",
                "/llms.txt",
                "/sitemap.xml",
            }
        )
        return urls

    return urls


def urls_for_repo_paths(paths: Iterable[str], *, site_url: str = DEFAULT_SITE_URL) -> list[str]:
    normalized_paths = []
    for path in paths:
        normalized = _normalize_repo_path(path)
        if normalized:
            normalized_paths.append(normalized)
    url_paths: set[str] = set()

    for repo_path in normalized_paths:
        url_paths.update(_urls_for_public_record(repo_path))

        if repo_path in {
            ".github/workflows/deploy-cloudflare-pages.yml",
            "README.md",
            "src/hackerlinks/indexnow.py",
        }:
            continue

        if any(
            repo_path == prefix or repo_path.startswith(prefix)
            for prefix in GLOBAL_CHANGE_PREFIXES
        ):
            url_paths.update(CORE_SITE_URLS)

    return sorted(_absolute_url(path, site_url=site_url) for path in url_paths)


def _chunked(urls: list[str], size: int) -> Iterable[list[str]]:
    for index in range(0, len(urls), size):
        yield urls[index : index + size]


def submit_indexnow(
    urls: list[str],
    *,
    key: str,
    key_location: str,
    site_url: str = DEFAULT_SITE_URL,
    endpoint: str = DEFAULT_INDEXNOW_ENDPOINT,
) -> list[dict[str, object]]:
    if not urls:
        return []

    host = parse.urlparse(site_url).netloc
    results: list[dict[str, object]] = []
    for batch in _chunked(urls, MAX_URLS_PER_REQUEST):
        payload = json.dumps(
            {
                "host": host,
                "key": key,
                "keyLocation": key_location,
                "urlList": batch,
            }
        ).encode("utf-8")
        req = request.Request(
            endpoint,
            data=payload,
            headers={"Content-Type": "application/json; charset=utf-8"},
            method="POST",
        )
        try:
            with request.urlopen(req) as response:
                results.append(
                    {
                        "status": response.status,
                        "url_count": len(batch),
                    }
                )
        except error.HTTPError as exc:  # pragma: no cover - exercised via caller behavior
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"IndexNow request failed with HTTP {exc.code}: {detail}") from exc
        except error.URLError as exc:  # pragma: no cover - exercised via caller behavior
            raise RuntimeError(f"IndexNow request failed: {exc.reason}") from exc
    return results


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site-url", default=os.environ.get("HACKERLINKS_SITE_URL", DEFAULT_SITE_URL))
    parser.add_argument("--changes-file", type=Path, required=True)
    parser.add_argument("--key", default=os.environ.get("INDEXNOW_KEY"))
    parser.add_argument("--key-location", default=os.environ.get("INDEXNOW_KEY_LOCATION"))
    parser.add_argument("--endpoint", default=os.environ.get("INDEXNOW_ENDPOINT", DEFAULT_INDEXNOW_ENDPOINT))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    changes = args.changes_file.read_text().splitlines() if args.changes_file.exists() else []
    urls = urls_for_repo_paths(changes, site_url=args.site_url)

    if not urls:
        print(json.dumps({"status": "skipped", "reason": "no_indexable_url_changes"}, sort_keys=True))
        return

    if not args.key or not args.key_location:
        print(
            json.dumps(
                {
                    "status": "skipped",
                    "reason": "missing_indexnow_config",
                    "url_count": len(urls),
                },
                sort_keys=True,
            )
        )
        return

    results = submit_indexnow(
        urls,
        key=args.key,
        key_location=args.key_location,
        site_url=args.site_url,
        endpoint=args.endpoint,
    )
    print(
        json.dumps(
            {
                "status": "submitted",
                "batches": results,
                "url_count": len(urls),
            },
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1) from exc

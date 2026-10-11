"""Prepare a static export for Cloudflare Pages' free-plan asset limit.

Keep Next.js navigation URLs intact with native static 200 proxies. Only
remove payloads after checking that the replacement is byte-identical.
"""
from __future__ import annotations

import argparse
import hashlib
from pathlib import Path


def prepare_pages(dist_root: Path, *, max_files: int = 20_000) -> None:
    if not dist_root.is_dir():
        raise ValueError(f"Build output does not exist: {dist_root}")
    redirects_path = dist_root / "_redirects"
    existing = redirects_path.read_text() if redirects_path.exists() else ""
    rules: list[str] = []
    removed = 0
    for section, parameter in (("items", "slug"), ("issues", "date")):
        pages = sorted(path for path in (dist_root / section).glob("*") if path.is_dir())
        if not pages:
            continue
        # The full route payload is also emitted as index.txt by Next.js.
        full_paths = [page / "__next._full.txt" for page in pages]
        if all(path.is_file() and (path.parent / "index.txt").is_file()
               and path.read_bytes() == (path.parent / "index.txt").read_bytes()
               for path in full_paths):
            rules.append(f"/{section}/:page/__next._full.txt /{section}/:page/index.txt 200")
            for path in full_paths:
                path.unlink()
                removed += 1
        # Shared layouts and empty parent segments repeat for every route.
        for filename in ("__next._index.txt", f"__next.{section}.txt",
                         f"__next.{section}.$d${parameter}.txt"):
            paths = [page / filename for page in pages]
            if not all(path.is_file() for path in paths):
                continue
            payload = paths[0].read_bytes()
            if not all(path.read_bytes() == payload for path in paths[1:]):
                continue
            digest = hashlib.sha256(payload).hexdigest()
            target = dist_root / "__next-shared" / f"{digest}.txt"
            target.parent.mkdir(exist_ok=True)
            target.write_bytes(payload)
            rules.append(f"/{section}/:page/{filename} /__next-shared/{digest}.txt 200")
            for path in paths:
                path.unlink()
                removed += 1
    if rules:
        redirects_path.write_text(existing.rstrip("\n") + ("\n" if existing else "")
                                  + "\n".join(rules) + "\n")
    count = sum(path.is_file() for path in dist_root.rglob("*"))
    print(f"Cloudflare Pages: {count} files; removed {removed} duplicate navigation assets; "
          f"free-plan limit {max_files}.")
    if count > max_files:
        raise ValueError(f"Cloudflare Pages output has {count} files; free-plan limit is {max_files}. "
                         "Reduce exported assets before deploying.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dist-root", type=Path, default=Path("dist"))
    args = parser.parse_args()
    prepare_pages(args.dist_root)


if __name__ == "__main__":
    main()

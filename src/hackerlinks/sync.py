"""Sync private HN scout artifacts into the public HackerLinks repo and optionally publish."""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path
from typing import Any

from .build import build_public_site
from .normalize import normalize_artifacts, write_public_records

PUBLISHABLE_PREFIXES = ("data/source/", "data/public/")


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text())


def _write_if_changed(src: Path, dst: Path) -> bool:
    payload = src.read_text()
    if dst.exists() and dst.read_text() == payload:
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(payload)
    return True


def _run_files(runs_dir: Path) -> list[Path]:
    run_files = sorted(runs_dir.glob("*.json"))
    if not run_files:
        raise FileNotFoundError(f"no run artifacts found in {runs_dir}")
    return run_files


def _latest_run_date(run_files: list[Path]) -> str:
    latest_run = _load_json(run_files[-1])
    run_date = latest_run.get("run_date")
    if not isinstance(run_date, str) or not run_date:
        raise ValueError(f"latest run missing run_date: {run_files[-1]}")
    return run_date


def rebuild_repo(repo_root: Path) -> dict[str, Any]:
    source_root = repo_root / "data" / "source"
    public_root = repo_root / "data" / "public"
    dist_root = repo_root / "dist"
    static_root = repo_root / "static"

    history_data = _load_json(source_root / "product-history.json")
    run_files = _run_files(source_root / "runs")

    last_public: dict[str, Any] | None = None
    for run_file in run_files:
        run_data = _load_json(run_file)
        last_public = normalize_artifacts(run_data, history_data)
        write_public_records(public_root, last_public)

    build_public_site(public_root, dist_root, static_root)
    latest_issue = last_public["issue"] if last_public else {"id": None, "summary": {"items_surfaced": 0}}
    return {
        "issue_id": latest_issue["id"],
        "items_surfaced": latest_issue["summary"]["items_surfaced"],
        "run_file_count": len(run_files),
    }


def sync_repo(private_root: Path, repo_root: Path) -> dict[str, Any]:
    private_runs_dir = private_root / "runs"
    run_files = _run_files(private_runs_dir)
    latest_run_date = _latest_run_date(run_files)

    copied_files: list[str] = []
    history_src = private_root / "product-history.json"
    if not history_src.exists():
        raise FileNotFoundError(f"missing private history file: {history_src}")
    _load_json(history_src)
    history_dst = repo_root / "data" / "source" / "product-history.json"
    if _write_if_changed(history_src, history_dst):
        copied_files.append(str(history_dst.relative_to(repo_root)))

    for run_src in run_files:
        _load_json(run_src)
        run_dst = repo_root / "data" / "source" / "runs" / run_src.name
        if _write_if_changed(run_src, run_dst):
            copied_files.append(str(run_dst.relative_to(repo_root)))

    build_summary = rebuild_repo(repo_root)
    return {
        "latest_run_date": latest_run_date,
        "copied_files": copied_files,
        "source_changed": bool(copied_files),
        "build": build_summary,
    }


def _git_status_lines(repo_root: Path) -> list[str]:
    result = subprocess.run(
        ["git", "status", "--short"],
        cwd=repo_root,
        check=True,
        capture_output=True,
        text=True,
    )
    return [line for line in result.stdout.splitlines() if line.strip()]


def _normalize_status_path(status_line: str) -> str:
    path = status_line[3:].strip()
    if " -> " in path:
        path = path.split(" -> ", 1)[1]
    return path.strip('"')


def blocking_dirty_paths(repo_root: Path, allowed_prefixes: tuple[str, ...] = PUBLISHABLE_PREFIXES) -> list[str]:
    blocked: list[str] = []
    for line in _git_status_lines(repo_root):
        path = _normalize_status_path(line)
        normalized = path.replace("\\", "/")
        if normalized.startswith("dist/"):
            continue
        if not any(normalized.startswith(prefix) for prefix in allowed_prefixes):
            blocked.append(normalized)
    return sorted(set(blocked))


def publish_repo(repo_root: Path, latest_run_date: str, *, allow_dirty: bool = False) -> dict[str, Any]:
    blocked = blocking_dirty_paths(repo_root)
    if blocked and not allow_dirty:
        raise RuntimeError(
            "refusing to publish with unrelated dirty files: " + ", ".join(blocked)
        )

    subprocess.run(["git", "add", "data/source", "data/public"], cwd=repo_root, check=True, capture_output=True, text=True)
    staged = subprocess.run(
        ["git", "diff", "--cached", "--name-only"],
        cwd=repo_root,
        check=True,
        capture_output=True,
        text=True,
    )
    staged_paths = [line for line in staged.stdout.splitlines() if line.strip()]
    if not staged_paths:
        return {"status": "no_changes", "commit": None, "pushed": False, "paths": []}

    commit_message = f"data: sync hn scout artifacts for {latest_run_date}"
    subprocess.run(["git", "commit", "-m", commit_message], cwd=repo_root, check=True, capture_output=True, text=True)
    commit_sha = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=repo_root,
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    subprocess.run(["git", "push", "origin", "HEAD"], cwd=repo_root, check=True, capture_output=True, text=True)
    return {"status": "pushed", "commit": commit_sha, "pushed": True, "paths": staged_paths}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--private-root", type=Path, default=Path.home() / ".hermes" / "hn-scout")
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--push", action="store_true", help="Commit and push publishable changes after syncing.")
    parser.add_argument(
        "--allow-dirty",
        action="store_true",
        help="Allow publishing even if unrelated repo files are dirty.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    result = sync_repo(private_root=args.private_root, repo_root=args.repo_root)
    publish_result = None
    if args.push:
        publish_result = publish_repo(args.repo_root, result["latest_run_date"], allow_dirty=args.allow_dirty)

    output = {
        "status": "ok",
        **result,
        "publish": publish_result,
    }
    print(json.dumps(output, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()

# HackerLinks

Static, data-first website for a **serendipity-first public archive** of interesting concrete things surfaced from Hacker News discussions.

## Product intent recovered from earlier discussion

HackerLinks is **not** meant to be a narrow launch tracker or a generic AI site factory.

It is meant to be:
- a public media product for **interesting concrete things** surfaced in HN discussion
- intentionally broad across repos, apps, products, books, talks, videos, podcasts, physical things, and other concrete references
- evidence-backed, with the HN thread kept close to the claim
- cumulative, so item pages compound over time instead of disappearing into daily output
- agent-first upstream and deterministic downstream

The core product question is:

> What interesting concrete things are Hacker News users surfacing right now, and which ones keep resurfacing over time?

## Current posture

This repo is now **live on GitHub Pages** and remains **data-first**:
- public deployment: `https://alexferrari88.github.io/hackerlinks-site/`
- no runtime scraping or AI calls happen in the website repo
- the site reads only structured JSON checked into the repo
- private HN scout artifacts are synced in from Alex's local Hermes environment, normalized by Python, then rendered by a static Next.js 16 export

## MVP target

Public page types:
- `/` homepage
- `/archive` date-first archive
- `/issues/YYYY-MM-DD` daily issue pages
- `/items/<slug>` canonical item pages

Public data contract:
- `issue`
- `item`
- `mention`

Product rules:
- canonical long-term unit = **item page**
- freshness/editorial unit = **daily issue page**
- trust comes from keeping provenance/evidence close to the surfaced item
- do **not** overbuild search, taxonomy, auth, comments, or ads in MVP

## Current source fixtures

The repo uses frozen copies of current HN scout artifacts under:
- `data/source/runs/`
- `data/source/product-history.json`

These are copied from the private HN Product Scout pipeline so the public site can be scaffolded without depending on a live cron run.

## Planned pipeline

1. Sync private scout artifacts into `data/source/`
2. Normalize private scout artifacts into public JSON
3. Export static HTML from public JSON through the Next.js frontend
4. Push repo updates to trigger **GitHub Pages** deploy

## Automation

Frontend/tooling prerequisites:

```bash
cd /home/alex/src/hackerlinks
npm ci
```

Manual sync command:

```bash
cd /home/alex/src/hackerlinks
PYTHONPATH=src python3 -m hackerlinks.sync
```

Publish sync command:

```bash
cd /home/alex/src/hackerlinks
PYTHONPATH=src python3 -m hackerlinks.sync --push
```

The sync command:
- copies `~/.hermes/hn-scout/product-history.json`
- copies all available `~/.hermes/hn-scout/runs/*.json`
- rebuilds `data/public/` and then exports `dist/` via Next.js
- refuses to publish if unrelated repo files are dirty
- commits and pushes only `data/source/` + `data/public/` when actual content changed

## Immediate next implementation step

Validate the scheduled local sync job and then point `hackerlinks.cc` at GitHub Pages when the content loop feels stable.

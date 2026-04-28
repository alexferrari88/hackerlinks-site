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

This repo is now **live on Cloudflare Pages** and remains **data-first**:
- public deployment: `https://hackerlinks.cc/`
- Pages preview/origin: `https://hackerlinks.pages.dev/`
- GitHub Actions direct-upload `dist/` to Cloudflare Pages on push to `main`
- GitHub Pages has been detached from the custom domain and remains available only at the GitHub-owned fallback URL
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
4. Push repo updates to trigger static deployment

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

## Cloudflare Pages deployment

Recommended path: let GitHub Actions build the site, then direct-upload `dist/` to Cloudflare Pages with Wrangler.

Repository files already added for this:
- `.python-version` → `3.14.3`
- `.nvmrc` → `22`
- `.github/workflows/deploy-cloudflare-pages.yml`

Required GitHub repository config before the workflow can publish:
- repository variable: `CLOUDFLARE_PAGES_PROJECT`
- repository secret: `CLOUDFLARE_ACCOUNT_ID`
- repository secret: `CLOUDFLARE_API_TOKEN`

Optional GEO freshness config:
- repository secret: `INDEXNOW_KEY`
- repository variable: `INDEXNOW_KEY_LOCATION`

If the optional IndexNow config is present, the deploy workflow will submit changed live URLs after a successful Cloudflare Pages deploy. `INDEXNOW_KEY_LOCATION` should point at the public verification file URL already served from `hackerlinks.cc`.

Cloudflare token scope needed:
- Account / Cloudflare Pages / Edit

Workflow behavior:
- builds public JSON with Python
- exports static HTML into `dist/`
- deploys `dist/` with `wrangler pages deploy`

Custom domain note:
- for apex `hackerlinks.cc`, Cloudflare Pages requires the domain to be on Cloudflare nameservers

## Immediate next implementation step

Keep using the existing sync pipeline; pushes to `main` now rebuild and publish the site to Cloudflare Pages automatically.

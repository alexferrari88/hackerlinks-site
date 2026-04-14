# HackerLinks

Static, data-first website scaffold for a **serendipity-first public archive** of interesting concrete things surfaced from Hacker News discussions.

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

This repo is **review-first** and currently **inactive**:
- no live deployment has been activated here
- no DNS changes have been made here
- no runtime scraping or AI calls happen in the website repo
- the website is intended to render only approved structured JSON

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

1. Normalize private scout artifacts into public JSON
2. Render static HTML from public JSON
3. Review output locally
4. Publish to **GitHub Pages** once the local preview is approved

## Immediate next implementation step

Implement `src/hackerlinks/normalize.py` so the thin source artifacts become a stable public contract for the renderer.

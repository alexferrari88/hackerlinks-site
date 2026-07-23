# HackerLinks Evidence Foundation Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Make HackerLinks' existing archive trustworthy and easier to use by fixing public-data integrity, supporting exact HN comment citations for future issues, demonstrating evidence on the homepage, and improving deterministic retrieval without adding a database, runtime LLM, or broad taxonomy.

**Architecture:** Keep the existing checked-in JSON and static Next.js export. Rebuild `data/public/` deterministically from all `data/source/runs/*.json`, treat persisted mentions as the only source of recurrence counts, and extend mentions with an optional `evidence_sources` array. The upstream HN scout will emit exact comment citations going forward; legacy mentions remain explicitly labelled as editorial paraphrases.

**Tech Stack:** Python dataclasses and `unittest`; Next.js 16 static export, React 19, TypeScript, Node's test runner; existing HN scout workflow skill.

---

## Scope and non-goals

### In scope

- deterministic public-data rebuild and complete archive manifest;
- recurrence counts derived from stored mentions;
- zero-item issue exclusion from generated routes and sitemap;
- honest JSON-LD and evidence wording;
- exact evidence-source schema, normalization, validation and UI support;
- same-discussion links using existing story IDs;
- evidence-first homepage hierarchy;
- improved static lexical search over existing fields;
- concise affiliation, automation and corrections disclosures;
- forward-only HN scout output contract for exact evidence.

### Explicitly deferred

- historical comment backfill beyond synthetic/retained-packet fixtures;
- automatic taxonomy and SEO facet-page generation;
- typed semantic relationship graph;
- embeddings, vector database, runtime API, RAG or per-query LLM calls;
- wholesale rebrand or visual redesign;
- deployment or push to `origin`.

## Blindspot verdict

**Proceed.** The work is reversible and fits the existing static architecture. The main risk is pretending legacy paraphrases are exact citations; the schema therefore remains backward-compatible and the UI labels records without citations honestly. Exact evidence must fail closed when a supplied comment URL/ID/quote is malformed. The forward scout contract can be changed without running a paid model; its first real cron output remains a post-implementation operational verification gate.

## Starting-state evidence

- Branch/worktree: `feat/evidence-foundation` at `/home/alex/src/hackerlinks-worktrees/evidence-foundation`.
- Current public corpus: 959 item files, 964 mention files, 99 issue files.
- Current source corpus resolves to 945 unique slugs, leaving 14 stale public item files.
- `data/public/manifests/archive.json` contains only one issue.
- `2026-07-19` is a zero-item issue.
- Seven items have `times_seen` greater than their stored mention count.
- All current mention URLs are story-level URLs.
- Baseline review found Node tests 15/15 and typecheck green; full Python suite has three stale copy assertions that this plan must update rather than preserve.

## Plan checkpoint

Before Task 1, commit this reviewed plan as a documentation-only commit:

```bash
git add docs/plans/2026-07-23-evidence-foundation.md
git commit -m "docs: add HackerLinks evidence foundation plan"
```

Do not push. Confirm the worktree is clean before implementation begins.

---

### Task 1: Make public normalization a deterministic complete rebuild

**Objective:** Produce public items, mentions, issues and manifests solely from the current source runs, with recurrence derived from persisted mentions.

**Files:**
- Modify: `src/hackerlinks/normalize.py`
- Modify: `src/hackerlinks/sync.py`
- Modify: `tests/test_normalize.py`
- Modify: `tests/test_build.py`
- Modify: `tests/test_sync.py`

**Steps:**

1. Add failing tests proving that rebuilding from two runs creates one complete archive manifest, merges item mention IDs, sets `times_seen == len(mention_ids)`, and removes stale public records.
2. Run the focused Python tests and confirm RED for missing corpus-level rebuild behaviour.
3. Add `rebuild_public_records(run_data_list, public_root)`. Aggregate and validate every run in memory, then replace the public tree exactly once. Keep `normalize_artifacts()` only as a single-run fixture helper.
4. Modify both `normalize.main()` and `sync.rebuild_repo()` to call the corpus-level API once. Add an end-to-end `sync_repo()` test proving two runs survive the clean rebuild.
5. Validate the complete corpus before touching the destination. Require each run filename stem to equal its `run_date`; reject duplicate `run_date`/issue IDs, duplicate mention IDs and same-run slug collisions. Add adversarial tests for duplicate dates with disjoint items and filename/payload mismatch.
6. Define latest mention by `(seen_at, mention_id)`. Use that run row's non-empty item fields, falling back to the newest earlier non-empty value for the same slug.
7. Derive `first_seen_at`, `last_seen_at`, `times_seen`, `latest_mention_id` and `is_repeat` from aggregated mention records, not `product-history.json` counters.
8. Preserve zero-item runs only in `data/source/runs`; emit no public issue for them. Build `archive.json` from every non-empty issue, newest first, and point `latest.json` at the newest non-empty issue even when the newest source run is empty.
9. Write a complete sibling staging tree, validate its referential integrity, then swap it into place. On any validation/write failure, leave or restore the prior public tree unchanged.
10. Add tests proving recursive-hash idempotence, shuffled-input determinism, deterministic repeated-slug precedence, prior-tree preservation on injected failure, and no orphan records.
11. Repair only the stale fixture/copy assertions affected by current site copy.
12. Run `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=src python3 -m unittest tests.test_normalize tests.test_build tests.test_sync -v`.
13. Commit exact task files with `fix: rebuild public archive deterministically`.

**Acceptance:** A temp rebuild is deterministic and failure-safe, leaves no orphan files, lists every non-empty issue, and never claims more sightings than persisted mentions.

---

### Task 2: Exclude empty issues and make structured data honest

**Objective:** Stop publishing empty issue routes and stop representing HackerLinks paraphrases as HN forum post bodies.

**Files:**
- Modify: `app/issues/[date]/page.tsx`
- Modify: `app/items/[slug]/page.tsx`
- Modify: `app/archive/page.tsx`
- Modify: `src/hackerlinks/build.py`
- Modify: `tests/node/site-data.test.ts` or create a focused route/data helper test where appropriate
- Modify: `tests/test_build.py`

**Steps:**

1. Add failing tests that the Task 1 invariant leaves no public zero-item issue, exported issue JSON, static route or sitemap entry.
2. Add a failing output assertion that item HTML does not contain `DiscussionForumPosting` for a legacy paraphrase.
3. Keep defensive empty-issue filters in `getIssuesNewestFirst()` and Python sitemap generation, even though Task 1 should emit no public empty issues.
4. Remove `DiscussionForumPosting.articleBody` for HackerLinks-generated paraphrases. Retain `WebPage`, `Thing`, breadcrumbs and source URLs.
5. Limit archive JSON-LD to honest collection metadata and the same bounded initial result count used by `ArchiveBrowser`, rather than all 959 hidden records or a second literal.
6. Run focused Node and Python build tests, then typecheck.
7. Commit exact task files with `fix: publish honest issue and evidence metadata`.

**Acceptance:** Empty issues are not generated or sitemapped, and generated summaries are not declared as source forum posts.

---

### Task 3: Add a backward-compatible exact evidence contract

**Objective:** Accept, validate, persist and render exact HN comment citations while clearly labelling legacy paraphrases.

**Files:**
- Create: `src/hackerlinks/evidence_validation.py`
- Modify: `src/hackerlinks/models.py`
- Modify: `src/hackerlinks/normalize.py`
- Modify: `src/hackerlinks/sync.py`
- Modify: `schemas/mention.schema.json`
- Modify: `lib/site-data.ts`
- Modify: `components/issue-row.tsx`
- Modify: `app/items/[slug]/page.tsx`
- Modify: `components/provenance-note.tsx`
- Modify: `tests/fixtures/sample-run.json`
- Modify: `tests/test_normalize.py`
- Create: `tests/test_evidence_validation.py`
- Modify: `tests/node/site-data.test.ts`
- Modify: `tests/test_build.py`

**Evidence source shape:**

```json
{
  "comment_id": "49010177",
  "comment_url": "https://news.ycombinator.com/item?id=49008211#49010177",
  "author": "vonnieda",
  "excerpt": "This is really clever.",
  "kind": "recommendation",
  "context": "first_hand_use",
  "parent_comment_id": null
}
```

Allowed `kind` values: `recommendation`, `comparison`, `criticism`, `caveat`, `incidental`, `author_context`.

Allowed optional `context` values: `first_hand_use`, `production_use`, `evaluated`, `rejected`, `author_or_maintainer`.

Validation has two explicit levels:

- **Repository structural validation:** HN host/path, numeric IDs, direct-comment URL query or story-fragment consistency, non-empty excerpt, enum values and unique comment IDs. This does not prove a quote is authentic.
- **Upstream authenticity validation:** the cited comment exists in the exact hashed packet, author and story match, and the excerpt is contained in the stored comment text after HTML entity decoding and whitespace folding. Do not lowercase or delete punctuation for containment.

**Steps:**

1. Add fixture citations and failing normalization tests for exact preservation.
2. Add failing structural tests for malformed HN URLs, mismatched IDs/fragments, duplicate source IDs and missing excerpts.
3. Add failing packet/run authenticity tests for valid, fabricated, whitespace-normalized, HTML-decoded, wrong-author, wrong-story and wrong-fragment cases.
4. Implement a small `EvidenceSource` dataclass plus structural validator; legacy runs without `evidence_sources` remain valid.
5. Implement a deterministic packet/run validator and call it from `sync_repo()` for citation-bearing private runs before they are copied. Fail closed on any supplied citation that cannot be authenticated against the packet identified by the run artifact.
6. Extend JSON schema and TypeScript interfaces.
7. Render exact excerpts, author/context labels and direct comment links on issue and item pages.
8. Label uncited legacy `evidence` as **Editorial paraphrase** and link it to the original thread; never call it an exact passage.
9. Update provenance copy to describe both states accurately.
10. Run focused Python tests, Node tests, typecheck and the static build fixture.
11. Commit exact task files with `feat: add exact HN evidence citations`.

**Acceptance:** Every supplied citation is structurally validated and directly clickable; legacy records remain usable without being misrepresented.

---

### Task 4: Add same-discussion discovery without a graph

**Objective:** Help users move between items surfaced from the same HN story using existing deterministic IDs.

**Files:**
- Modify: `lib/site-data.ts`
- Modify: `app/items/[slug]/page.tsx`
- Modify: `components/issue-row.tsx`
- Modify: `tests/node/site-data.test.ts`
- Modify: `tests/test_build.py`

**Steps:**

1. Add a failing test for a helper that returns other items sharing a mention's `source_story_id`, excludes the current item and deduplicates results across repeated mentions.
2. Implement the minimal helper.
3. Show the source story title on issue rows.
4. Order results by latest shared-mention date descending, then item slug. Add an “Also surfaced in this discussion” section to item pages only when results exist.
5. Do not infer `alternative`, `similar`, `recommended with` or any other semantic edge.
6. Run Node tests, typecheck and relevant build assertions.
7. Commit exact task files with `feat: link finds from the same HN discussion`.

**Acceptance:** Co-discussion navigation is deterministic, accurately labelled and absent when no related item exists.

---

### Task 5: Make the homepage an evidence-first preview

**Objective:** Demonstrate the product before asking for subscription while preserving the current visual system.

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/issue-row.tsx` only if a compact variant is required
- Modify: `tests/test_build.py`

**Steps:**

1. Add failing static-build assertions for primary “Search the archive” and “Browse latest issue” actions.
2. Render only the top five latest findings on the homepage and link to the complete issue.
3. Remove the duplicative “Fresh finds” rail.
4. Keep Telegram as a secondary action.
5. Show exact evidence for cited records and honest paraphrase labels for legacy records through the existing row component.
6. Preserve the present styling and responsive structure; do not create a redesign system or new component framework.
7. Run build tests, typecheck and capture desktop plus 320px screenshots for clipping/ordering verification.
8. Commit exact task files with `feat: make homepage an evidence-first preview`.

**Acceptance:** First-session users can search or inspect the issue immediately, and the homepage no longer duplicates the issue feed.

---

### Task 6: Improve deterministic archive retrieval

**Objective:** Support intent-like queries over existing static data without runtime AI.

**Files:**
- Modify: `lib/archive-browser.ts`
- Modify: `app/archive/page.tsx`
- Modify: `components/archive-browser.tsx`
- Modify: `tests/node/archive-browser.test.ts`

**Steps:**

1. Add failing tests for punctuation/hyphen normalization, stopword-tolerant multi-token queries, rationale/evidence/story-title matching and deterministic weighted ordering.
2. Extend archive rows in `app/archive/page.tsx` with `why_included` plus linked mention evidence and story titles.
3. Implement a compact tokenizer and field-weighted score with soft-AND matching. Define the minimum token match, field weights and ties in tests rather than introducing a configurable ranking system.
4. Track whether a valid `sort` query parameter was explicitly supplied or the user selected any sort. Selecting the default `recent` option must remain explicit and serialize as `sort=recent`. Resetting the view clears explicit-sort state. Add tests for URL-loaded sorts, user-selected sorts including `recent`, and reset.
5. With a query and no explicit sort, order by relevance, then `last_seen_at`, then slug/name. With an explicit sort, preserve that sort and use relevance only as the inclusion predicate.
6. Do not add dependencies, embeddings, telemetry or runtime endpoints.
7. Run `npm test` and `npm run typecheck`.
8. Commit exact task files with `feat: improve archive retrieval`.

**Acceptance:** Representative queries such as “tool for backing up postgres” can retrieve relevant records when those terms occur across structured fields, without exact-phrase matching.

---

### Task 7: Add concise trust and correction disclosures

**Objective:** Clarify independence, automation and accountability without rebranding.

**Files:**
- Modify: `components/site-footer.tsx`
- Modify: `app/about/page.tsx`
- Modify: `app/methodology/page.tsx`
- Modify: `lib/seo.ts` if organization JSON-LD needs matching identity text
- Modify: `tests/test_build.py`

**Steps:**

1. Add failing build assertions for the no-affiliation statement and correction/contact path.
2. Add concise copy stating that HackerLinks is independent and unaffiliated with Hacker News/Y Combinator; selection and summaries are automation/AI-assisted; original comments are authoritative.
3. Add a correction route using the existing repository/contact mechanism rather than building forms or a backend.
4. Replace defensive “not an AI-written link farm” wording with a factual workflow description.
5. Run build tests and typecheck.
6. Commit exact task files with `docs: clarify HackerLinks provenance and corrections`.

**Acceptance:** The footer/About/Methodology communicate ownership and correction handling plainly, with no rebrand or new service.

---

### Task 8: Require exact evidence in future HN scout runs

**Objective:** Make future selected run artifacts emit citation fields supported by Task 3.

**Files:**
- Modify outside repo through `skill_manage`: default-profile skill `research/hn-product-scout-workflow`
- No generated run or public data file should be manually fabricated.

**Steps:**

1. Verify legacy and citation-bearing synthetic run fixtures both normalize and that packet-authenticity tests pass before changing the external skill.
2. Record the exact skill path and pre-change SHA-256. Preserve the exact patch and rollback text in the implementation report; the skill mutation is not part of the Git branch.
3. Patch the selected-item output contract to require `evidence_sources` with exact comment IDs, URLs, short verbatim excerpts, author, kind, optional context and parent ID.
4. Require every evidence sentence to be traceable to one or more source IDs; ban combining multiple commenters under singular wording.
5. Require counterevidence only when a specific relevant caveat/criticism exists; never claim none exists merely because none was selected.
6. Require the scout to run the deterministic packet/run validator and fail the selected run before writing when authenticity validation fails.
7. Keep the existing daily publication cooldown and output size; do not add another model pass or provider.
8. Verify the saved skill text and post-change SHA-256. If patch verification fails, restore the recorded pre-change text and hash immediately.
9. Keep the modified skill only after Task 9 passes and the supporting repository commits exist. If final integration is blocked, restore the pre-change skill automatically. Report whether rollback occurred.
10. Report the retained change separately as operationally unproven until the next normal scout run passes. Do not invoke paid/model runs for verification without permission.

**Acceptance:** Future run contracts are evidence-complete without changing scout cadence, provider or cost profile.

---

### Task 9: Final integration verification and review

**Objective:** Verify the complete bounded release and leave a clean committed branch.

**Steps:**

1. Run the full Python suite:
   `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=src python3 -m unittest discover -s tests -v`
2. Run `npm test`.
3. Run `npm run typecheck`.
4. Run the corpus rebuild, record a recursive SHA-256 manifest, run it again, and prove the manifest is unchanged.
5. Run `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=src python3 -m hackerlinks.build` or the repository's canonical static-build command.
6. Run one deterministic invariant audit proving every item/issue mention reference exists and points back correctly; `times_seen == len(mention_ids)`; first/latest timestamps and `latest_mention_id` match mentions; manifests exactly match non-empty issues; and no orphan files exist.
7. Run `git diff --check` and inspect `git status --short --untracked-files=all`.
8. Dispatch an independent final integration review covering spec compliance first and code quality second; fix concrete findings through RED→GREEN loops.
9. Commit any reviewed integration fixes with a Conventional Commit.
10. Do **not push**; report commits and the branch for Alex's review.

## Success criteria

- all repo tests and typecheck pass;
- deterministic rebuild is idempotent and leaves no stale public records;
- recurrence claims equal stored evidence;
- empty issues are not generated or indexed;
- legacy paraphrases and exact citations are visibly distinct;
- exact citation URLs and excerpts validate structurally;
- same-discussion navigation is accurate;
- homepage is a five-item proof-oriented preview;
- archive retrieval handles multi-token intent-like queries without runtime AI;
- independence and correction disclosures are visible;
- no database, runtime model, taxonomy explosion, semantic graph or deployment is added;
- worktree is clean and commits are not pushed.

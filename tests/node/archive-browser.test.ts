import test from "node:test";
import assert from "node:assert/strict";

import {
  ARCHIVE_INITIAL_RESULT_COUNT,
  applyArchiveView,
  buildArchiveParams,
  getInitialArchiveItems,
  getRecentCutoff,
  paginateArchiveItems,
  parseArchiveParams,
  resetArchiveState,
  selectArchiveSort,
  type ArchiveItem,
} from "@/lib/archive-browser";

const items: ArchiveItem[] = [
  {
    slug: "alpha-tool",
    name: "Alpha Tool",
    summary: "A terminal-first deployment utility.",
    why_included: "Makes release automation easier.",
    evidence: ["Used for zero-downtime deploys."],
    story_titles: ["What are you deploying this week?"],
    thing_url: "https://alpha.example/docs",
    first_seen_at: "2026-07-20T08:00:00Z",
    last_seen_at: "2026-07-21T08:00:00Z",
    times_seen: 1,
  },
  {
    slug: "beta-book",
    name: "Beta Book",
    summary: "A practical guide to distributed systems.",
    why_included: "A field guide for reliable services.",
    evidence: ["The chapter on consensus is unusually clear."],
    story_titles: ["Ask HN: Books for systems engineers"],
    thing_url: "https://books.example/beta",
    first_seen_at: "2026-07-10T08:00:00Z",
    last_seen_at: "2026-07-18T08:00:00Z",
    times_seen: 4,
  },
  {
    slug: "gamma-db",
    name: "Gamma DB",
    summary: "An embedded analytical database.",
    why_included: "Useful for local analytics.",
    evidence: ["We use it for backing up Postgres snapshots."],
    story_titles: ["Tools for database backups"],
    thing_url: "https://gamma.example/",
    first_seen_at: "2026-07-01T08:00:00Z",
    last_seen_at: "2026-07-19T08:00:00Z",
    times_seen: 2,
  },
];

test("archive structured data uses the browser's bounded initial result count", () => {
  const manyItems = Array.from({ length: ARCHIVE_INITIAL_RESULT_COUNT + 7 }, (_, index) => ({
    ...items[0],
    slug: `item-${index}`,
  }));

  assert.equal(getInitialArchiveItems(manyItems).length, ARCHIVE_INITIAL_RESULT_COUNT);
  assert.deepEqual(
    getInitialArchiveItems(manyItems).map((item) => item.slug),
    manyItems.slice(0, ARCHIVE_INITIAL_RESULT_COUNT).map((item) => item.slug),
  );
});

test("archive search matches names, summaries, and domains case-insensitively", () => {
  assert.deepEqual(
    applyArchiveView(items, { query: "  DEPLOYMENT ", filter: "all", sort: "recent" }).map(
      (item) => item.slug,
    ),
    ["alpha-tool"],
  );
  assert.deepEqual(
    applyArchiveView(items, { query: "distributed", filter: "all", sort: "recent" }).map(
      (item) => item.slug,
    ),
    ["beta-book"],
  );
  assert.deepEqual(
    applyArchiveView(items, { query: "gamma.example", filter: "all", sort: "recent" }).map(
      (item) => item.slug,
    ),
    ["gamma-db"],
  );
});

test("archive search tokenizes punctuation and hyphenated text", () => {
  assert.deepEqual(
    applyArchiveView(items, { query: "terminal first", filter: "all", sort: "recent" }).map(
      (item) => item.slug,
    ),
    ["alpha-tool"],
  );
  assert.deepEqual(
    applyArchiveView(items, { query: "zero-downtime!", filter: "all", sort: "recent" }).map(
      (item) => item.slug,
    ),
    ["alpha-tool"],
  );
});

test("archive search ignores stopwords and soft-matches intent tokens across fields", () => {
  assert.deepEqual(
    applyArchiveView(items, {
      query: "tool for backing up postgres",
      filter: "all",
      sort: "recent",
    }).map((item) => item.slug),
    ["gamma-db"],
  );
});

test("archive search matches rationale, evidence, and story titles", () => {
  for (const query of ["local analytics", "consensus unusually", "systems engineers"]) {
    assert.equal(applyArchiveView(items, { query, filter: "all", sort: "recent" }).length, 1);
  }
});

test("archive search uses deterministic weighted relevance unless sort is explicit", () => {
  const ranked: ArchiveItem[] = [
    {
      ...items[0],
      slug: "name-match",
      name: "Postgres Backup",
      summary: "A utility.",
      last_seen_at: "2026-07-01T08:00:00Z",
    },
    {
      ...items[0],
      slug: "summary-match",
      name: "Older utility",
      summary: "A Postgres backup utility.",
      last_seen_at: "2026-07-22T08:00:00Z",
    },
    {
      ...items[0],
      slug: "rationale-match",
      name: "Another utility",
      summary: "A utility.",
      why_included: "Useful for Postgres backup jobs.",
      last_seen_at: "2026-07-23T08:00:00Z",
    },
  ];

  assert.deepEqual(
    applyArchiveView(ranked, {
      query: "postgres backup",
      filter: "all",
      sort: "recent",
      explicitSort: false,
    }).map((item) => item.slug),
    ["name-match", "summary-match", "rationale-match"],
  );
  assert.deepEqual(
    applyArchiveView(ranked, {
      query: "postgres backup",
      filter: "all",
      sort: "recent",
      explicitSort: true,
    }).map((item) => item.slug),
    ["rationale-match", "summary-match", "name-match"],
  );
  assert.deepEqual(
    applyArchiveView(
      [
        { ...ranked[1], slug: "z-tie" },
        { ...ranked[1], slug: "a-tie" },
      ],
      { query: "postgres backup", filter: "all", sort: "recent", explicitSort: false },
    ).map((item) => item.slug),
    ["a-tie", "z-tie"],
  );
});

test("resurfaced filter only includes items seen more than once", () => {
  assert.deepEqual(
    applyArchiveView(items, { query: "", filter: "resurfaced", sort: "seen" }).map(
      (item) => item.slug,
    ),
    ["beta-book", "gamma-db"],
  );
});

test("recently added filter uses a rolling fourteen-day cutoff anchored to the dataset", () => {
  const cutoff = getRecentCutoff(items);
  const expected = new Date("2026-07-20T08:00:00Z");
  expected.setUTCDate(expected.getUTCDate() - 14);
  const boundaryItem: ArchiveItem = {
    ...items[2],
    slug: "cutoff-item",
    name: "Cutoff Item",
    first_seen_at: "2026-07-06T08:00:00+00:00",
  };

  assert.equal(cutoff, expected.toISOString());
  assert.deepEqual(
    applyArchiveView([...items, boundaryItem], { query: "", filter: "recent", sort: "newest" }).map(
      (item) => item.slug,
    ),
    ["alpha-tool", "beta-book", "cutoff-item"],
  );
});

test("archive sorting supports recency, sightings, date added, and name", () => {
  assert.deepEqual(
    applyArchiveView(items, { query: "", filter: "all", sort: "recent" }).map(
      (item) => item.slug,
    ),
    ["alpha-tool", "gamma-db", "beta-book"],
  );
  assert.deepEqual(
    applyArchiveView(items, { query: "", filter: "all", sort: "seen" }).map(
      (item) => item.slug,
    ),
    ["beta-book", "gamma-db", "alpha-tool"],
  );
  assert.deepEqual(
    applyArchiveView(items, { query: "", filter: "all", sort: "newest" }).map(
      (item) => item.slug,
    ),
    ["alpha-tool", "beta-book", "gamma-db"],
  );
  assert.deepEqual(
    applyArchiveView(items, { query: "", filter: "all", sort: "name" }).map(
      (item) => item.slug,
    ),
    ["alpha-tool", "beta-book", "gamma-db"],
  );
});

test("archive pagination returns a bounded prefix and whether more results remain", () => {
  assert.deepEqual(paginateArchiveItems(items, 2), {
    visibleItems: items.slice(0, 2),
    hasMore: true,
  });
  assert.deepEqual(paginateArchiveItems(items, 10), {
    visibleItems: items,
    hasMore: false,
  });
});

test("archive URL state tracks valid explicit sorts including recent", () => {
  assert.deepEqual(parseArchiveParams(new URLSearchParams("q=database&view=resurfaced&sort=seen")), {
    query: "database",
    filter: "resurfaced",
    sort: "seen",
    explicitSort: true,
  });
  assert.deepEqual(parseArchiveParams(new URLSearchParams("view=unknown&sort=unknown")), {
    query: "",
    filter: "all",
    sort: "recent",
    explicitSort: false,
  });
  assert.deepEqual(parseArchiveParams(new URLSearchParams("sort=recent")), {
    query: "",
    filter: "all",
    sort: "recent",
    explicitSort: true,
  });
  assert.equal(
    buildArchiveParams({
      query: "database",
      filter: "resurfaced",
      sort: "seen",
      explicitSort: true,
    }).toString(),
    "q=database&view=resurfaced&sort=seen",
  );
  assert.equal(
    buildArchiveParams({ query: "", filter: "all", sort: "recent", explicitSort: true }).toString(),
    "sort=recent",
  );
  assert.equal(
    buildArchiveParams({ query: "", filter: "all", sort: "recent", explicitSort: false }).toString(),
    "",
  );
});

test("selecting any sort marks it explicit and reset clears URL state", () => {
  const selected = selectArchiveSort(
    { query: "database", filter: "resurfaced", sort: "seen", explicitSort: true },
    "recent",
  );

  assert.equal(selected.sort, "recent");
  assert.equal(selected.explicitSort, true);
  assert.equal(buildArchiveParams(selected).get("sort"), "recent");
  assert.deepEqual(resetArchiveState(), {
    query: "",
    filter: "all",
    sort: "recent",
    explicitSort: false,
  });
  assert.equal(buildArchiveParams(resetArchiveState()).toString(), "");
});

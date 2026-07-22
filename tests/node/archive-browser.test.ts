import test from "node:test";
import assert from "node:assert/strict";

import {
  applyArchiveView,
  buildArchiveParams,
  getRecentCutoff,
  paginateArchiveItems,
  parseArchiveParams,
  type ArchiveItem,
} from "@/lib/archive-browser";

const items: ArchiveItem[] = [
  {
    slug: "alpha-tool",
    name: "Alpha Tool",
    summary: "A terminal-first deployment utility.",
    thing_url: "https://alpha.example/docs",
    first_seen_at: "2026-07-20T08:00:00Z",
    last_seen_at: "2026-07-21T08:00:00Z",
    times_seen: 1,
  },
  {
    slug: "beta-book",
    name: "Beta Book",
    summary: "A practical guide to distributed systems.",
    thing_url: "https://books.example/beta",
    first_seen_at: "2026-07-10T08:00:00Z",
    last_seen_at: "2026-07-18T08:00:00Z",
    times_seen: 4,
  },
  {
    slug: "gamma-db",
    name: "Gamma DB",
    summary: "An embedded analytical database.",
    thing_url: "https://gamma.example/",
    first_seen_at: "2026-07-01T08:00:00Z",
    last_seen_at: "2026-07-19T08:00:00Z",
    times_seen: 2,
  },
];

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

test("archive URL state accepts known values and omits defaults", () => {
  assert.deepEqual(parseArchiveParams(new URLSearchParams("q=database&view=resurfaced&sort=seen")), {
    query: "database",
    filter: "resurfaced",
    sort: "seen",
  });
  assert.deepEqual(parseArchiveParams(new URLSearchParams("view=unknown&sort=unknown")), {
    query: "",
    filter: "all",
    sort: "recent",
  });
  assert.equal(
    buildArchiveParams({ query: "database", filter: "resurfaced", sort: "seen" }).toString(),
    "q=database&view=resurfaced&sort=seen",
  );
  assert.equal(buildArchiveParams({ query: "", filter: "all", sort: "recent" }).toString(), "");
});

export type ArchiveFilter = "all" | "resurfaced" | "recent";
export type ArchiveSort = "recent" | "seen" | "newest" | "name";
export const ARCHIVE_INITIAL_RESULT_COUNT = 50;

export interface ArchiveItem {
  slug: string;
  name: string;
  summary: string;
  why_included: string;
  evidence: string[];
  story_titles: string[];
  thing_url: string | null;
  first_seen_at: string;
  last_seen_at: string;
  times_seen: number;
}

export interface ArchiveState {
  query: string;
  filter: ArchiveFilter;
  sort: ArchiveSort;
  explicitSort?: boolean;
}

export function getInitialArchiveItems<T>(items: T[]): T[] {
  return items.slice(0, ARCHIVE_INITIAL_RESULT_COUNT);
}

const FILTERS = new Set<ArchiveFilter>(["all", "resurfaced", "recent"]);
const SORTS = new Set<ArchiveSort>(["recent", "seen", "newest", "name"]);
const RECENT_WINDOW_DAYS = 14;
const STOPWORDS = new Set(["a", "an", "and", "for", "in", "of", "on", "the", "to", "up", "with"]);
const SEARCH_FIELDS: Array<{ value: (item: ArchiveItem) => string; weight: number }> = [
  { value: (item) => item.name, weight: 8 },
  { value: (item) => item.summary, weight: 6 },
  { value: (item) => item.why_included, weight: 5 },
  { value: (item) => item.evidence.join(" "), weight: 4 },
  { value: (item) => item.story_titles.join(" "), weight: 3 },
  { value: (item) => domainFromUrl(item.thing_url), weight: 2 },
];

export function resetArchiveState(): ArchiveState {
  return { query: "", filter: "all", sort: "recent", explicitSort: false };
}

export function selectArchiveSort(state: ArchiveState, sort: ArchiveSort): ArchiveState {
  return { ...state, sort, explicitSort: true };
}

function tokenize(value: string) {
  const tokens = value.toLocaleLowerCase("en").match(/[\p{L}\p{N}]+/gu) ?? [];
  return [...new Set(tokens.filter((token) => !STOPWORDS.has(token)))];
}

function searchScore(item: ArchiveItem, queryTokens: string[]) {
  const fieldTokens = SEARCH_FIELDS.map((field) => ({
    tokens: new Set(tokenize(field.value(item))),
    weight: field.weight,
  }));
  let matchedTokens = 0;
  let score = 0;

  for (const token of queryTokens) {
    let bestWeight = 0;
    for (const field of fieldTokens) {
      if (field.tokens.has(token)) {
        bestWeight = Math.max(bestWeight, field.weight);
      }
    }
    if (bestWeight > 0) {
      matchedTokens += 1;
      score += bestWeight;
    }
  }

  const minimumMatches = Math.max(1, Math.ceil(queryTokens.length * 0.6));
  return matchedTokens >= minimumMatches ? score : 0;
}

function domainFromUrl(value: string | null) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function compareName(left: ArchiveItem, right: ArchiveItem) {
  return left.name.localeCompare(right.name, "en", { sensitivity: "base" });
}

export function getRecentCutoff(items: ArchiveItem[]) {
  if (items.length === 0) {
    return null;
  }

  const newestTimestamp = Math.max(...items.map((item) => Date.parse(item.first_seen_at)));
  const cutoff = new Date(newestTimestamp);
  cutoff.setUTCDate(cutoff.getUTCDate() - RECENT_WINDOW_DAYS);
  return cutoff.toISOString();
}

export function applyArchiveView(items: ArchiveItem[], state: ArchiveState) {
  const queryTokens = tokenize(state.query);
  const recentCutoff = getRecentCutoff(items);
  const scores = new Map<string, number>();

  const filtered = items.filter((item) => {
    if (state.filter === "resurfaced" && item.times_seen <= 1) {
      return false;
    }
    if (
      state.filter === "recent" &&
      recentCutoff &&
      Date.parse(item.first_seen_at) < Date.parse(recentCutoff)
    ) {
      return false;
    }
    if (queryTokens.length === 0) {
      return true;
    }

    const score = searchScore(item, queryTokens);
    scores.set(item.slug, score);
    return score > 0;
  });

  return filtered.slice().sort((left, right) => {
    if (queryTokens.length > 0 && !state.explicitSort) {
      return (
        (scores.get(right.slug) ?? 0) - (scores.get(left.slug) ?? 0) ||
        Date.parse(right.last_seen_at) - Date.parse(left.last_seen_at) ||
        left.slug.localeCompare(right.slug, "en") ||
        compareName(left, right)
      );
    }
    if (state.sort === "seen") {
      return right.times_seen - left.times_seen || compareName(left, right);
    }
    if (state.sort === "newest") {
      return Date.parse(right.first_seen_at) - Date.parse(left.first_seen_at) || compareName(left, right);
    }
    if (state.sort === "name") {
      return compareName(left, right);
    }
    return Date.parse(right.last_seen_at) - Date.parse(left.last_seen_at) || compareName(left, right);
  });
}

export function paginateArchiveItems(items: ArchiveItem[], limit: number) {
  return {
    visibleItems: items.slice(0, limit),
    hasMore: items.length > limit,
  };
}

export function parseArchiveParams(params: URLSearchParams): ArchiveState {
  const filter = params.get("view") as ArchiveFilter | null;
  const sort = params.get("sort") as ArchiveSort | null;

  return {
    query: params.get("q")?.trim() ?? "",
    filter: filter && FILTERS.has(filter) ? filter : "all",
    sort: sort && SORTS.has(sort) ? sort : "recent",
    explicitSort: Boolean(sort && SORTS.has(sort)),
  };
}

export function buildArchiveParams(state: ArchiveState) {
  const params = new URLSearchParams();
  const query = state.query.trim();

  if (query) {
    params.set("q", query);
  }
  if (state.filter !== "all") {
    params.set("view", state.filter);
  }
  if (state.explicitSort) {
    params.set("sort", state.sort);
  }

  return params;
}

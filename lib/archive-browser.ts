export type ArchiveFilter = "all" | "resurfaced" | "recent";
export type ArchiveSort = "recent" | "seen" | "newest" | "name";

export interface ArchiveItem {
  slug: string;
  name: string;
  summary: string;
  thing_url: string | null;
  first_seen_at: string;
  last_seen_at: string;
  times_seen: number;
}

export interface ArchiveState {
  query: string;
  filter: ArchiveFilter;
  sort: ArchiveSort;
}

const FILTERS = new Set<ArchiveFilter>(["all", "resurfaced", "recent"]);
const SORTS = new Set<ArchiveSort>(["recent", "seen", "newest", "name"]);
const RECENT_WINDOW_DAYS = 14;

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
  const query = state.query.trim().toLocaleLowerCase("en");
  const recentCutoff = getRecentCutoff(items);

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
    if (!query) {
      return true;
    }

    return [item.name, item.summary, domainFromUrl(item.thing_url)]
      .join(" ")
      .toLocaleLowerCase("en")
      .includes(query);
  });

  return filtered.slice().sort((left, right) => {
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
  if (state.sort !== "recent") {
    params.set("sort", state.sort);
  }

  return params;
}

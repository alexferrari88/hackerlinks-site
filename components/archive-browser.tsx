"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  applyArchiveView,
  buildArchiveParams,
  paginateArchiveItems,
  parseArchiveParams,
  type ArchiveFilter,
  type ArchiveItem,
  type ArchiveSort,
  type ArchiveState,
} from "@/lib/archive-browser";
import { SITE_BASE_PATH } from "@/lib/site-config";

const PAGE_SIZE = 50;
const DEFAULT_STATE: ArchiveState = {
  query: "",
  filter: "all",
  sort: "recent",
};

const filters: Array<{ value: ArchiveFilter; label: string }> = [
  { value: "all", label: "All items" },
  { value: "resurfaced", label: "Resurfaced" },
  { value: "recent", label: "Recently added" },
];

const sorts: Array<{ value: ArchiveSort; label: string }> = [
  { value: "recent", label: "Recently seen" },
  { value: "seen", label: "Most sightings" },
  { value: "newest", label: "Newest additions" },
  { value: "name", label: "Name A–Z" },
];

function domainFromUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function ArchiveBrowser({ items }: { items: ArchiveItem[] }) {
  const [state, setState] = useState<ArchiveState>(DEFAULT_STATE);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [urlStateLoaded, setUrlStateLoaded] = useState(false);

  useEffect(() => {
    const syncFromUrl = () => {
      setState(parseArchiveParams(new URLSearchParams(window.location.search)));
      setVisibleLimit(PAGE_SIZE);
      setUrlStateLoaded(true);
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  useEffect(() => {
    if (!urlStateLoaded) {
      return;
    }

    const params = buildArchiveParams(state);
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
  }, [state, urlStateLoaded]);

  const filteredItems = useMemo(() => applyArchiveView(items, state), [items, state]);
  const { visibleItems, hasMore } = paginateArchiveItems(filteredItems, visibleLimit);
  const hasActiveFilters = state.query.trim() !== "" || state.filter !== "all";

  function updateState(patch: Partial<ArchiveState>) {
    setState((current) => ({ ...current, ...patch }));
    setVisibleLimit(PAGE_SIZE);
  }

  function resetExplorer() {
    setState(DEFAULT_STATE);
    setVisibleLimit(PAGE_SIZE);
  }

  return (
    <section className="archive-browser" aria-labelledby="archive-results-heading">
      <div className="archive-toolbar">
        <div className="archive-search-group">
          <label htmlFor="archive-search" className="archive-control-label">
            Search the archive
          </label>
          <div className="archive-search-field">
            <Search aria-hidden="true" size={20} />
            <input
              id="archive-search"
              type="search"
              value={state.query}
              onChange={(event) => updateState({ query: event.target.value })}
              placeholder="Name, description, or domain"
              autoComplete="off"
            />
            {state.query ? (
              <button
                type="button"
                className="archive-clear-search"
                onClick={() => updateState({ query: "" })}
                aria-label="Clear search"
              >
                <X aria-hidden="true" size={18} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="archive-sort-group">
          <label htmlFor="archive-sort" className="archive-control-label">
            Sort by
          </label>
          <select
            id="archive-sort"
            value={state.sort}
            onChange={(event) => updateState({ sort: event.target.value as ArchiveSort })}
          >
            {sorts.map((sort) => (
              <option key={sort.value} value={sort.value}>
                {sort.label}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="archive-filters">
          <legend className="archive-control-label">Show</legend>
          <div className="archive-filter-list">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className="archive-filter-button"
                aria-pressed={state.filter === filter.value}
                onClick={() => updateState({ filter: filter.value })}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="archive-results-heading">
        <div>
          <p className="archive-results-kicker">Archive results</p>
          <h2 id="archive-results-heading">
            {filteredItems.length.toLocaleString("en")} {filteredItems.length === 1 ? "item" : "items"}
          </h2>
        </div>
        {hasActiveFilters ? (
          <button type="button" className="archive-reset" onClick={resetExplorer}>
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="sr-only" aria-live="polite">
        {filteredItems.length} archive results
      </div>

      {visibleItems.length > 0 ? (
        <div className="archive-result-list">
          {visibleItems.map((item) => {
            const domain = domainFromUrl(item.thing_url);
            return (
              <article key={item.slug} className="archive-result-row">
                <div className="archive-result-main">
                  <Link href={`${SITE_BASE_PATH}/items/${item.slug}/`} className="archive-result-title">
                    {item.name}
                  </Link>
                  <p>{item.summary}</p>
                </div>
                <dl className="archive-result-meta">
                  {domain ? (
                    <div>
                      <dt>Source</dt>
                      <dd>{domain}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Last seen</dt>
                    <dd>{formatDate(item.last_seen_at)}</dd>
                  </div>
                  <div>
                    <dt>Sightings</dt>
                    <dd>{item.times_seen}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="archive-empty-state">
          <h3>No matching items</h3>
          <p>Try a broader search, or clear the current view filter.</p>
          <button type="button" className="archive-reset" onClick={resetExplorer}>
            Show all items
          </button>
        </div>
      )}

      {hasMore ? (
        <div className="archive-load-more">
          <p>
            Showing {visibleItems.length.toLocaleString("en")} of{" "}
            {filteredItems.length.toLocaleString("en")}
          </p>
          <button type="button" onClick={() => setVisibleLimit((current) => current + PAGE_SIZE)}>
            Load 50 more
          </button>
        </div>
      ) : null}
    </section>
  );
}

import Link from "next/link";

import { ArchiveBrowser } from "@/components/archive-browser";
import { BreadcrumbTrail } from "@/components/breadcrumb-trail";
import { JsonLd } from "@/components/json-ld";
import { getIssuesNewestFirst, loadPublicRecords } from "@/lib/site-data";
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";
import { SITE_BASE_PATH } from "@/lib/site-config";

export const metadata = buildPageMetadata({
  title: "Archive",
  description:
    "Search every source-linked tool, library, app, book, and project surfaced from Hacker News discussions.",
  path: "/archive/",
});

export default function ArchivePage() {
  const records = loadPublicRecords();
  const issues = getIssuesNewestFirst();
  const items = Object.values(records.items).map((item) => ({
    slug: item.slug,
    name: item.name,
    summary: item.summary,
    thing_url: item.thing_url,
    first_seen_at: item.first_seen_at,
    last_seen_at: item.last_seen_at,
    times_seen: item.times_seen,
  }));
  const archiveJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Archive", path: "/archive/" },
      ]),
      {
        "@type": "CollectionPage",
        "@id": absoluteUrl("/archive/", "collection"),
        url: absoluteUrl("/archive/"),
        name: "HackerLinks Archive",
        description:
          "Searchable archive of source-linked tools, libraries, apps, books, and projects surfaced from Hacker News discussions.",
        mainEntity: {
          "@id": absoluteUrl("/archive/", "items"),
        },
      },
      {
        "@type": "ItemList",
        "@id": absoluteUrl("/archive/", "items"),
        numberOfItems: items.length,
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: absoluteUrl(`/items/${item.slug}/`),
          name: item.name,
        })),
      },
    ],
  };

  return (
    <div className="content-grid archive-page">
      <JsonLd data={archiveJsonLd} />
      <BreadcrumbTrail
        items={[
          { label: "Home", href: "/" },
          { label: "Archive" },
        ]}
      />

      <section className="stack-frame archive-intro">
        <div>
          <p className="eyebrow">Item archive</p>
          <h1>Find anything HackerLinks has surfaced.</h1>
          <p className="archive-intro-summary">
            Search by name, description, or source. Find repeat sightings and the newest additions.
          </p>
        </div>
        <dl className="archive-intro-stats">
          <div>
            <dt>Items</dt>
            <dd>{items.length.toLocaleString("en")}</dd>
          </div>
          <div>
            <dt>Daily issues</dt>
            <dd>{issues.length.toLocaleString("en")}</dd>
          </div>
          <div>
            <dt>Latest issue</dt>
            <dd>{issues[0]?.date ?? "None"}</dd>
          </div>
        </dl>
      </section>

      <ArchiveBrowser items={items} />

      <aside className="archive-issues-link">
        <div>
          <h2>Looking for the daily editions?</h2>
          <p>The issue index preserves the chronological record without mixing it into item search.</p>
        </div>
        <Link href={`${SITE_BASE_PATH}/issues/`}>Browse all {issues.length} issues</Link>
      </aside>
    </div>
  );
}

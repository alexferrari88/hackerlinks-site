import Link from "next/link";

import { ArchiveBrowser } from "@/components/archive-browser";
import { BreadcrumbTrail } from "@/components/breadcrumb-trail";
import { JsonLd } from "@/components/json-ld";
import { getIssuesNewestFirst, loadPublicRecords } from "@/lib/site-data";
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";
import { SITE_BASE_PATH } from "@/lib/site-config";

export const metadata = buildPageMetadata({
  title: "Search the archive",
  description:
    "Search the tools, books, products, talks, hardware, and other useful finds surfaced in Hacker News discussions.",
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
          "Searchable archive of useful, source-linked finds surfaced in Hacker News discussions.",
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
          <p className="eyebrow">Search every find</p>
          <h1>What was that thing someone mentioned on HN?</h1>
          <p className="archive-intro-summary">
            Search by name, description, or website. See what just appeared—and what keeps coming back.
          </p>
        </div>
        <dl className="archive-intro-stats">
          <div>
            <dt>Finds</dt>
            <dd>{items.length.toLocaleString("en")}</dd>
          </div>
          <div>
            <dt>Issues</dt>
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
          <h2>Want to browse instead?</h2>
          <p>Open the daily issues to retrace the archive in the order each find appeared.</p>
        </div>
        <Link href={`${SITE_BASE_PATH}/issues/`}>Browse {issues.length} daily issues</Link>
      </aside>
    </div>
  );
}

import Link from "next/link";

import { BreadcrumbTrail } from "@/components/breadcrumb-trail";
import { JsonLd } from "@/components/json-ld";
import { PageIntro } from "@/components/page-intro";
import { Separator } from "@/components/ui/separator";
import {
  formatDate,
  getIssuesNewestFirst,
  getRecentItems,
  getRepeatItems,
  issueHref,
  itemHref,
} from "@/lib/site-data";
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Archive",
  description:
    "Browse the long-term archive: issue timeline, resurfacing items, and newly discovered tools pulled from Hacker News discussions.",
  path: "/archive/",
});

export default function ArchivePage() {
  const issues = getIssuesNewestFirst();
  const repeatItems = getRepeatItems(12);
  const recentItems = getRecentItems(12);
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
          "Long-term archive of HackerLinks issues, resurfacing items, and newly discovered links from Hacker News discussions.",
        mainEntity: {
          "@id": absoluteUrl("/archive/", "issues"),
        },
      },
      {
        "@type": "ItemList",
        "@id": absoluteUrl("/archive/", "issues"),
        itemListOrder: "https://schema.org/ItemListOrderDescending",
        numberOfItems: issues.length,
        itemListElement: issues.map((issue, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: absoluteUrl(`/issues/${issue.id}/`),
          name: issue.headline,
        })),
      },
    ],
  };

  return (
    <div className="content-grid">
      <JsonLd data={archiveJsonLd} />
      <BreadcrumbTrail
        items={[
          { label: "Home", href: "/" },
          { label: "Archive" },
        ]}
      />

      <PageIntro
        eyebrow="Archive Map"
        title="Explore the long-term record."
        summary={
          <p>
            The archive is where repeat sightings start to matter. Use it to scan the full issue
            timeline, find items that keep resurfacing, and trace what was newly pulled into view.
          </p>
        }
        meta={[
          { label: "Issues", value: issues.length, accent: true },
          { label: "Repeat items", value: repeatItems.length },
          { label: "New items", value: recentItems.length },
        ]}
      />

      <section className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="stack-frame">
          <p className="eyebrow">Issue timeline</p>
          <div className="mt-6">
            {issues.map((issue, index) => (
              <div key={issue.id}>
                {index > 0 ? <Separator className="my-5" /> : null}
                <Link href={issueHref(issue.id)} className="issue-listing">
                  <div>
                    <p className="eyebrow">{issue.date}</p>
                    <h2 className="section-title mt-3 text-[1.8rem]">{issue.headline}</h2>
                    <p className="mt-4 max-w-[68ch] text-sm leading-6 text-[var(--muted-foreground)]">
                      Generated {formatDate(issue.generated_at)} with {issue.summary.items_surfaced} surfaced items.
                    </p>
                  </div>
                  <div className="issue-count-chip">{issue.summary.items_surfaced} items</div>
                </Link>
              </div>
            ))}
          </div>
        </section>

        <aside className="rail-stack">
          <section className="frame px-4 py-4 md:px-5">
            <p className="eyebrow">Resurfacing items</p>
            <Separator className="my-4 bg-[var(--line-strong)]" />
            <div className="space-y-3">
              {repeatItems.map((item) => (
                <Link key={item.slug} href={itemHref(item.slug)} className="rail-link">
                  <span>{item.name}</span>
                  <span className="rail-link-meta">{item.times_seen}x seen</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="frame px-4 py-4 md:px-5">
            <p className="eyebrow">Newly added items</p>
            <Separator className="my-4 bg-[var(--line-strong)]" />
            <div className="space-y-3">
              {recentItems.map((item) => (
                <Link key={item.slug} href={itemHref(item.slug)} className="rail-link">
                  <span>{item.name}</span>
                  <span className="rail-link-meta">{formatDate(item.first_seen_at)}</span>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

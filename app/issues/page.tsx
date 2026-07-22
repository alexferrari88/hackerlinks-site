import Link from "next/link";

import { BreadcrumbTrail } from "@/components/breadcrumb-trail";
import { JsonLd } from "@/components/json-ld";
import { PageIntro } from "@/components/page-intro";
import { Separator } from "@/components/ui/separator";
import { getIssueListing, getIssuesNewestFirst, issueHref } from "@/lib/site-data";
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Daily issues",
  description:
    "Browse every daily HackerLinks issue and see which useful things surfaced in Hacker News discussions each day.",
  path: "/issues/",
});

export default function IssuesPage() {
  const issues = getIssuesNewestFirst();
  const issuesJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Issues", path: "/issues/" },
      ]),
      {
        "@type": "CollectionPage",
        "@id": absoluteUrl("/issues/", "collection"),
        url: absoluteUrl("/issues/"),
        name: "HackerLinks Issues",
        description: "Daily collections of useful things surfaced in Hacker News discussions.",
        mainEntity: {
          "@id": absoluteUrl("/issues/", "list"),
        },
      },
      {
        "@type": "ItemList",
        "@id": absoluteUrl("/issues/", "list"),
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
      <JsonLd data={issuesJsonLd} />
      <BreadcrumbTrail
        items={[
          { label: "Home", href: "/" },
          { label: "Issues" },
        ]}
      />
      <PageIntro
        eyebrow="Daily issues"
        title="A day-by-day trail of what HN uncovered."
        summary={
          <p>
            Each issue gathers the specific things that caught our attention in Hacker News
            discussions that day, with the original threads attached.
          </p>
        }
        meta={[
          { label: "Issues", value: issues.length, accent: true },
          {
            label: "Latest",
            value: issues[0]?.date ?? "None",
          },
        ]}
      />

      <section className="stack-frame">
        {issues.map((issue, index) => {
          const listing = getIssueListing(issue);
          return (
            <div key={issue.id}>
              {index > 0 ? <Separator className="my-5" /> : null}
              <Link href={issueHref(issue.id)} className="issue-listing">
                <div>
                  <p className="eyebrow">{issue.date}</p>
                  <h2 className="section-title mt-3 text-[1.8rem]">{issue.headline}</h2>
                  <p className="mt-4 max-w-[68ch] text-sm leading-6 text-[var(--muted-foreground)]">
                    {listing.previewNames.join(" / ") || "No surfaced items"}
                  </p>
                </div>
                <div className="issue-count-chip">{issue.summary.items_surfaced} items</div>
              </Link>
            </div>
          );
        })}
      </section>
    </div>
  );
}

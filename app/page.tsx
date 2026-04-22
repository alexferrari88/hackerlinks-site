import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { JsonLd } from "@/components/json-ld";
import { IssueRow } from "@/components/issue-row";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  formatDate,
  getIssueListing,
  getLatestIssue,
  getRecentItems,
  getRepeatItems,
  getThreadCount,
  issueHref,
  itemHref,
} from "@/lib/site-data";
import { buildPageMetadata, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { SITE_TAGLINE } from "@/lib/site-config";

export const metadata = buildPageMetadata({
  description:
    "Find source-linked tools, libraries, apps, books, and other concrete things that keep surfacing in Hacker News discussions.",
  path: "/",
});

export default function HomePage() {
  const latestIssue = getLatestIssue();
  const listing = getIssueListing(latestIssue);
  const repeatItems = getRepeatItems();
  const recentItems = getRecentItems();
  const homeJsonLd = {
    "@context": "https://schema.org",
    "@graph": [websiteJsonLd(), organizationJsonLd()],
  };

  return (
    <div className="content-grid">
      <JsonLd data={homeJsonLd} />
      <PageIntro
        eyebrow="Hacker News Distilled"
        title={SITE_TAGLINE}
        summary={
          <p>
            HackerLinks is a source-linked archive of tools, libraries, apps, books, and other
            concrete things that developers keep surfacing in real Hacker News threads.
          </p>
        }
        meta={[
          { label: "Issue", value: latestIssue.date, accent: true },
          { label: "Items", value: latestIssue.summary.items_surfaced },
          { label: "Threads", value: getThreadCount(latestIssue) },
        ]}
      />

      <section className="grid gap-8 xl:grid-cols-[1.55fr_0.75fr]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Latest issue</p>
              <h2 className="section-title mt-3">{latestIssue.headline}</h2>
            </div>
            <Button asChild variant="frame" size="md">
              <Link href={issueHref(latestIssue.id)}>
                Open issue
                <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="space-y-4">
            {listing.mentions.map((mention) => (
              <IssueRow key={mention.id} mention={mention} />
            ))}
          </div>
        </div>

        <aside className="rail-stack">
          <section className="frame px-4 py-4 md:px-5">
            <p className="eyebrow">Most recommended</p>
            <Separator className="my-4 bg-[var(--line-strong)]" />
            <div className="space-y-3">
              {repeatItems.map((item) => (
                <Link key={item.slug} href={itemHref(item.slug)} className="rail-link">
                  <span>{item.name}</span>
                  <span className="rail-link-meta">{item.times_seen}x</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="frame px-4 py-4 md:px-5">
            <p className="eyebrow">Newly discovered</p>
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

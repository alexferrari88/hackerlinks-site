import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { JsonLd } from "@/components/json-ld";
import { IssueRow } from "@/components/issue-row";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  loadPublicRecords,
  getIssueListing,
  getLatestIssue,
  getRepeatItems,
  issueHref,
  itemHref,
} from "@/lib/site-data";
import { buildPageMetadata, dataCatalogJsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { SITE_BASE_PATH, SITE_TAGLINE, TELEGRAM_BOT_URL } from "@/lib/site-config";

export const metadata = buildPageMetadata({
  title: "Useful things discovered on Hacker News",
  description:
    "Explore useful tools, books, products, talks, hardware, and other finds from real Hacker News discussions. Every find links back to its source thread.",
  path: "/",
});

function formatIssueDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default function HomePage() {
  const records = loadPublicRecords();
  const latestIssue = getLatestIssue();
  const listing = getIssueListing(latestIssue);
  const previewMentions = listing.mentions.slice(0, 5);
  const completeIssueLabel = `View all ${listing.mentions.length} finds in this issue`;
  const repeatItems = getRepeatItems();
  const homeJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      websiteJsonLd(),
      organizationJsonLd(),
      ...dataCatalogJsonLd({
        generatedAt: records.manifests.latest.generated_at,
        counts: {
          issues: Object.keys(records.issues).length,
          items: Object.keys(records.items).length,
          mentions: Object.keys(records.mentions).length,
        },
      })["@graph"],
    ],
  };

  return (
    <div className="content-grid">
      <JsonLd data={homeJsonLd} />
      <PageIntro
        className="min-w-0 [&>.stack-frame]:min-w-0"
        title={SITE_TAGLINE}
        summary={
          <>
            <p>
              HackerLinks pulls useful tools, books, products, talks, hardware, and other finds out
              of sprawling Hacker News threads—then saves the context that made each one worth a look.
            </p>
            <div className="mt-5 flex min-w-0 flex-wrap gap-3">
              <Button
                asChild
                variant="solid"
                size="md"
                className="max-[360px]:w-full max-[360px]:px-3"
              >
                <Link href={`${SITE_BASE_PATH}/archive/`}>
                  Search the archive
                  <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                variant="frame"
                size="md"
                className="max-[360px]:w-full max-[360px]:px-3"
              >
                <Link href={issueHref(latestIssue.id)}>
                  Browse latest issue
                  <ArrowRight />
                </Link>
              </Button>
            </div>
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:underline"
            >
              <span>Get the daily finds</span>
              <span className="font-sans normal-case tracking-normal">@hn_links_bot</span>
            </a>
          </>
        }
      />

      <section className="grid min-w-0 gap-x-8 gap-y-6 xl:grid-cols-[1.55fr_0.75fr]">
        <header className="min-w-0 border-[3px] border-[var(--line-strong)] bg-[#09090b] px-5 py-5 text-[#fdfaf6] shadow-[6px_6px_0_0_var(--primary)] md:flex md:items-end md:justify-between md:gap-8 md:px-7 md:py-6 xl:col-span-2">
          <h2 className="font-display text-[clamp(1.9rem,5vw,3.25rem)] font-black uppercase leading-none tracking-[-0.02em] text-[var(--primary)]">
            {formatIssueDate(latestIssue.date)}
          </h2>
          <p className="mt-3 max-w-[38ch] text-sm leading-6 text-[#d4d4d8] md:mt-0 md:text-right">
            Showing {previewMentions.length} source-linked finds, with the discussion context that made each one useful.
          </p>
        </header>

        <div className="min-w-0 space-y-6">
          <div className="min-w-0 space-y-4">
            {previewMentions.map((mention) => (
              <IssueRow key={mention.id} mention={mention} showDate={false} />
            ))}
          </div>
          <div className="flex justify-end">
            <Button
              asChild
              variant="frame"
              size="md"
              className="max-[360px]:w-full max-[360px]:px-3 max-[360px]:text-[0.65rem]"
            >
              <Link href={issueHref(latestIssue.id)}>
                {completeIssueLabel}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>

        <aside className="rail-stack min-w-0">
          <section className="frame min-w-0 px-4 py-4 md:px-5">
            <p className="eyebrow">Keeps coming up</p>
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
        </aside>
      </section>
    </div>
  );
}

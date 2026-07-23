import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";

import { BreadcrumbTrail } from "@/components/breadcrumb-trail";
import { JsonLd } from "@/components/json-ld";
import { PageIntro } from "@/components/page-intro";
import { ProvenanceNote } from "@/components/provenance-note";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  domainFromUrl,
  formatDate,
  getItemBySlug,
  getMentionsForItem,
  getSameDiscussionItems,
  issueHref,
  itemHref,
} from "@/lib/site-data";
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata, WEBSITE_ID } from "@/lib/seo";

export async function generateStaticParams() {
  const { loadPublicRecords } = await import("@/lib/site-data");
  return Object.values(loadPublicRecords().items).map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = getItemBySlug(slug);

  if (!item) {
    return { title: "Find not found" };
  }

  return buildPageMetadata({
    title: `${item.name}: why it surfaced on Hacker News`,
    description: `${item.summary} See when ${item.name} surfaced on Hacker News and the discussion context behind it.`,
    path: `/items/${item.slug}/`,
  });
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = getItemBySlug(slug);
  if (!item) {
    notFound();
  }

  const mentions = getMentionsForItem(item);
  const sameDiscussionItems = getSameDiscussionItems(item);
  const latestMention = mentions[0];
  const domain = domainFromUrl(item.thing_url);
  const itemPath = `/items/${item.slug}/`;
  const itemJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Archive", path: "/archive/" },
        { name: item.name, path: itemPath },
      ]),
      {
        "@type": "WebPage",
        "@id": absoluteUrl(itemPath, "webpage"),
        url: absoluteUrl(itemPath),
        name: `${item.name}: why it surfaced on Hacker News`,
        description: item.summary,
        datePublished: item.first_seen_at,
        dateModified: item.last_seen_at,
        isPartOf: {
          "@id": absoluteUrl("/", WEBSITE_ID),
        },
        about: {
          "@id": absoluteUrl(itemPath, "thing"),
        },
        mainEntity: {
          "@id": absoluteUrl(itemPath, "thing"),
        },
      },
      {
        "@type": "Thing",
        "@id": absoluteUrl(itemPath, "thing"),
        identifier: item.slug,
        name: item.name,
        description: item.summary,
        url: absoluteUrl(itemPath),
        mainEntityOfPage: {
          "@id": absoluteUrl(itemPath, "webpage"),
        },
        ...(item.thing_url ? { sameAs: item.thing_url } : {}),
      },
    ],
  };

  return (
    <div className="content-grid">
      <JsonLd data={itemJsonLd} />
      <BreadcrumbTrail
        items={[
          { label: "Home", href: "/" },
          { label: "Archive", href: "/archive/" },
          { label: item.name },
        ]}
      />
      <PageIntro
        eyebrow="From the HackerLinks archive"
        title={item.name}
        summary={<p>{item.summary}</p>}
        meta={[
          { label: "First seen", value: formatDate(item.first_seen_at) },
          { label: "Last seen", value: formatDate(item.last_seen_at) },
          { label: "Times seen", value: item.times_seen, accent: true },
          { label: "Website", value: domain ?? "Not found" },
        ]}
      />

      <section className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="stack-frame">
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="solid">
              <Link href={item.thing_url || latestMention?.hn_url || "/"} target="_blank" rel="noreferrer">
                {item.thing_url ? "Visit website" : "Open the HN thread"}
                <ArrowUpRight />
              </Link>
            </Button>
            {latestMention ? (
              <Button asChild variant="frame">
                <Link href={latestMention.hn_url} target="_blank" rel="noreferrer">
                  See the latest HN mention
                  <ArrowUpRight />
                </Link>
              </Button>
            ) : null}
          </div>

          <div className="dossier-grid mt-8">
            <article className="frame px-4 py-4 md:px-5">
              <p className="eyebrow">The short version</p>
              <p className="mt-4 text-sm leading-7 text-[var(--muted-foreground)] md:text-base">
                {item.summary}
              </p>
            </article>
            <article className="frame px-4 py-4 md:px-5">
              <p className="eyebrow">Why it caught our attention</p>
              <p className="mt-4 text-sm leading-7 text-[var(--muted-foreground)] md:text-base">
                {item.why_included}
              </p>
            </article>
          </div>

          <article className="frame mt-8 px-4 py-4 md:px-5">
            <p className="eyebrow">Where it surfaced on Hacker News</p>
            <div className="mt-4">
              {mentions.map((mention, index) => (
                <div key={mention.id}>
                  {index > 0 ? <Separator className="my-5" /> : null}
                  <div className="grid gap-4 md:grid-cols-[8rem_1fr_auto] md:items-start">
                    <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                      {formatDate(mention.seen_at)}
                    </div>
                    <div>
                      <p className="text-sm leading-7 text-[var(--foreground)]">{mention.evidence}</p>
                      <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                        {mention.source_story_title || `HN #${mention.source_story_id ?? "unknown"}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <Button asChild variant="frame" size="sm">
                        <Link href={issueHref(mention.issue_id)}>Daily issue</Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={mention.hn_url} target="_blank" rel="noreferrer">
                          Original thread
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          {sameDiscussionItems.length > 0 ? (
            <section className="frame mt-8 px-4 py-4 md:px-5">
              <p className="eyebrow">Also surfaced in this discussion</p>
              <div className="mt-4">
                {sameDiscussionItems.map(({ item: relatedItem, latestSharedMention }, index) => (
                  <div key={relatedItem.slug}>
                    {index > 0 ? <Separator className="my-5" /> : null}
                    <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-start">
                      <div>
                        <Link
                          href={itemHref(relatedItem.slug)}
                          className="font-display text-xl uppercase tracking-[0.04em] hover:text-[var(--primary)] hover:underline"
                        >
                          {relatedItem.name}
                        </Link>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                          {latestSharedMention.source_story_title ||
                            `HN #${latestSharedMention.source_story_id}`}
                        </p>
                      </div>
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                        {formatDate(latestSharedMention.seen_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="rail-stack">
          <ProvenanceNote title="How this record is sourced" />
          <section className="frame px-4 py-4 md:px-5">
            <p className="eyebrow">In the archive</p>
            <Separator className="my-4 bg-[var(--line-strong)]" />
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              {item.times_seen > 1
                ? `This find surfaced ${item.times_seen} times between ${formatDate(item.first_seen_at)} and ${formatDate(item.last_seen_at)}.`
                : `This find surfaced once, on ${formatDate(item.first_seen_at)}.`}
            </p>
          </section>
          <section className="frame px-4 py-4 md:px-5">
            <p className="eyebrow">Archive ID</p>
            <Separator className="my-4 bg-[var(--line-strong)]" />
            <p className="font-display text-2xl uppercase tracking-[0.06em]">{item.slug}</p>
          </section>
        </aside>
      </section>
    </div>
  );
}

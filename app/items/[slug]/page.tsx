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
  issueHref,
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
    return { title: "Item not found" };
  }

  return buildPageMetadata({
    title: `${item.name}: why developers mention it on Hacker News`,
    description: `${item.summary} Source-linked record of how Hacker News users referenced ${item.name}.`,
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
        name: `${item.name}: why developers mention it on Hacker News`,
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
        subjectOf: mentions.map((mention) => ({
          "@id": absoluteUrl(itemPath, `mention-${mention.id}`),
        })),
        ...(item.thing_url ? { sameAs: item.thing_url } : {}),
      },
      ...mentions.map((mention) => ({
        "@type": "DiscussionForumPosting",
        "@id": absoluteUrl(itemPath, `mention-${mention.id}`),
        url: mention.hn_url,
        datePublished: mention.seen_at,
        headline: mention.source_story_title || `Hacker News thread ${mention.source_story_id ?? mention.id}`,
        articleBody: mention.evidence,
        publisher: {
          "@type": "Organization",
          name: "Hacker News",
          url: "https://news.ycombinator.com/",
        },
        about: {
          "@id": absoluteUrl(itemPath, "thing"),
        },
        isPartOf: {
          "@type": "CollectionPage",
          "@id": absoluteUrl(`/issues/${mention.issue_id}/`, "collection"),
          url: absoluteUrl(`/issues/${mention.issue_id}/`),
        },
      })),
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
        eyebrow="Tool Profile"
        title={item.name}
        summary={<p>{item.summary}</p>}
        meta={[
          { label: "First seen", value: formatDate(item.first_seen_at) },
          { label: "Last seen", value: formatDate(item.last_seen_at) },
          { label: "Sightings", value: item.times_seen, accent: true },
          { label: "Source", value: domain ?? "Unknown" },
        ]}
      />

      <section className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="stack-frame">
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="solid">
              <Link href={item.thing_url || latestMention?.hn_url || "/"} target="_blank" rel="noreferrer">
                Open source
                <ArrowUpRight />
              </Link>
            </Button>
            {latestMention ? (
              <Button asChild variant="frame">
                <Link href={latestMention.hn_url} target="_blank" rel="noreferrer">
                  Latest HN thread
                  <ArrowUpRight />
                </Link>
              </Button>
            ) : null}
          </div>

          <div className="dossier-grid mt-8">
            <article className="frame px-4 py-4 md:px-5">
              <p className="eyebrow">What it is</p>
              <p className="mt-4 text-sm leading-7 text-[var(--muted-foreground)] md:text-base">
                {item.summary}
              </p>
            </article>
            <article className="frame px-4 py-4 md:px-5">
              <p className="eyebrow">Why developers recommend it</p>
              <p className="mt-4 text-sm leading-7 text-[var(--muted-foreground)] md:text-base">
                {item.why_included}
              </p>
            </article>
          </div>

          <article className="frame mt-8 px-4 py-4 md:px-5">
            <p className="eyebrow">Hacker News evidence</p>
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
                        <Link href={issueHref(mention.issue_id)}>Issue</Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={mention.hn_url} target="_blank" rel="noreferrer">
                          HN thread
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <aside className="rail-stack">
          <ProvenanceNote title="Why this record is trustworthy" />
          <section className="frame px-4 py-4 md:px-5">
            <p className="eyebrow">History</p>
            <Separator className="my-4 bg-[var(--line-strong)]" />
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              {item.times_seen > 1
                ? `Seen ${item.times_seen} times between ${formatDate(item.first_seen_at)} and ${formatDate(item.last_seen_at)}.`
                : `Seen once in the current dataset on ${formatDate(item.first_seen_at)}.`}
            </p>
          </section>
          <section className="frame px-4 py-4 md:px-5">
            <p className="eyebrow">Reference ID</p>
            <Separator className="my-4 bg-[var(--line-strong)]" />
            <p className="font-display text-2xl uppercase tracking-[0.06em]">{item.slug}</p>
          </section>
        </aside>
      </section>
    </div>
  );
}

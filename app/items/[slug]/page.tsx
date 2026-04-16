import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";

import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  domainFromUrl,
  formatDate,
  getItemBySlug,
  getMentionsForItem,
  issueHref,
} from "@/lib/site-data";

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

  return {
    title: item.name,
    description: item.summary,
  };
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

  return (
    <div className="content-grid">
      <PageIntro
        eyebrow="Canonical item page"
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
              <p className="eyebrow">Why it matters</p>
              <p className="mt-4 text-sm leading-7 text-[var(--muted-foreground)] md:text-base">
                {item.why_included}
              </p>
            </article>
            <article className="frame px-4 py-4 md:px-5">
              <p className="eyebrow">Canonical id</p>
              <p className="mt-4 font-display text-2xl uppercase tracking-[0.06em]">{item.slug}</p>
            </article>
          </div>

          <article className="frame mt-8 px-4 py-4 md:px-5">
            <p className="eyebrow">Sighting log</p>
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
          <section className="frame px-4 py-4 md:px-5">
            <p className="eyebrow">Status</p>
            <Separator className="my-4 bg-[var(--line-strong)]" />
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              This page is the long-term reference point for the item. Daily issues show when it
              surfaced; this dossier keeps the cumulative thread history intact.
            </p>
          </section>
          <section className="frame px-4 py-4 md:px-5">
            <p className="eyebrow">Coverage window</p>
            <Separator className="my-4 bg-[var(--line-strong)]" />
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              {item.times_seen > 1
                ? `Seen ${item.times_seen} times between ${formatDate(item.first_seen_at)} and ${formatDate(item.last_seen_at)}.`
                : `Seen once in the current dataset on ${formatDate(item.first_seen_at)}.`}
            </p>
          </section>
        </aside>
      </section>
    </div>
  );
}

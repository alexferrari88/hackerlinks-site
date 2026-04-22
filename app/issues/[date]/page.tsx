import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BreadcrumbTrail } from "@/components/breadcrumb-trail";
import { IssueRow } from "@/components/issue-row";
import { JsonLd } from "@/components/json-ld";
import { PageIntro } from "@/components/page-intro";
import { ProvenanceNote } from "@/components/provenance-note";
import { Button } from "@/components/ui/button";
import {
  getIssueByDate,
  getIssueListing,
  getItemForMention,
  getIssuesNewestFirst,
  getPreviousAndNextIssue,
  getThreadCount,
  issueHref,
} from "@/lib/site-data";
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";
import { SITE_BASE_PATH } from "@/lib/site-config";

export async function generateStaticParams() {
  return getIssuesNewestFirst().map((issue) => ({ date: issue.date }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  const issue = getIssueByDate(date);

  if (!issue) {
    return { title: "Issue not found" };
  }

  return buildPageMetadata({
    title: `Issue ${issue.date}`,
    description: `${issue.headline}. Daily board of source-linked items surfaced from Hacker News on ${issue.date}.`,
    path: `/issues/${issue.date}/`,
  });
}

export default async function IssuePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const issue = getIssueByDate(date);
  if (!issue) {
    notFound();
  }

  const listing = getIssueListing(issue);
  const { previousIssue, nextIssue } = getPreviousAndNextIssue(issue);
  const issueJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Issues", path: "/issues/" },
        { name: issue.date, path: `/issues/${issue.date}/` },
      ]),
      {
        "@type": "CollectionPage",
        "@id": absoluteUrl(`/issues/${issue.date}/`, "collection"),
        url: absoluteUrl(`/issues/${issue.date}/`),
        name: `Issue ${issue.date}`,
        description: issue.headline,
        datePublished: issue.generated_at,
        dateModified: issue.generated_at,
        mainEntity: {
          "@id": absoluteUrl(`/issues/${issue.date}/`, "list"),
        },
      },
      {
        "@type": "ItemList",
        "@id": absoluteUrl(`/issues/${issue.date}/`, "list"),
        itemListOrder: "https://schema.org/ItemListOrderAscending",
        numberOfItems: listing.mentions.length,
        itemListElement: listing.mentions.map((mention, index) => {
          const item = getItemForMention(mention);
          return {
            "@type": "ListItem",
            position: index + 1,
            url: absoluteUrl(`/items/${mention.item_id}/`),
            name: item?.name ?? mention.item_id,
          };
        }),
      },
    ],
  };

  return (
    <div className="content-grid">
      <JsonLd data={issueJsonLd} />
      <BreadcrumbTrail
        items={[
          { label: "Home", href: "/" },
          { label: "Issues", href: `${SITE_BASE_PATH}/issues/` },
          { label: issue.date },
        ]}
      />
      <PageIntro
        eyebrow={`Issue / ${issue.date}`}
        title={issue.headline}
        summary={
          <p>
            A daily board of tools, apps, and references that Hacker News readers pulled into view
            on {issue.date}. Each row keeps the original HN thread close to the claim.
          </p>
        }
        meta={[
          { label: "Items", value: issue.summary.items_surfaced, accent: true },
          { label: "Threads", value: getThreadCount(issue) },
        ]}
      />

      <section className="stack-frame">
        <div className="mb-6">
          <ProvenanceNote title="How this issue was compiled" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="frame" size="sm">
            <Link href={previousIssue ? issueHref(previousIssue.id) : `${SITE_BASE_PATH}/issues/`}>
              {previousIssue ? "Previous issue" : "Issue index"}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={nextIssue ? issueHref(nextIssue.id) : `${SITE_BASE_PATH}/issues/`}>
              {nextIssue ? "Next issue" : "Back to issues"}
            </Link>
          </Button>
        </div>

        <div className="mt-6">
          <p className="eyebrow">What surfaced that day</p>
        </div>
        <div className="mt-6 space-y-4">
          {listing.mentions.map((mention) => (
            <IssueRow key={mention.id} mention={mention} />
          ))}
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { IssueRow } from "@/components/issue-row";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import {
  getIssueByDate,
  getIssueListing,
  getIssuesNewestFirst,
  getPreviousAndNextIssue,
  getThreadCount,
  issueHref,
} from "@/lib/site-data";
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

  return {
    title: `Issue ${issue.date}`,
    description: issue.headline,
  };
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

  return (
    <div className="content-grid">
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
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="frame" size="sm">
            <Link href={previousIssue ? issueHref(previousIssue.id) : `${SITE_BASE_PATH}/issues`}>
              {previousIssue ? "Previous issue" : "Issue index"}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={nextIssue ? issueHref(nextIssue.id) : `${SITE_BASE_PATH}/issues`}>
              {nextIssue ? "Next issue" : "Back to issues"}
            </Link>
          </Button>
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

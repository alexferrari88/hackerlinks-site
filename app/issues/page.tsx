import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { Separator } from "@/components/ui/separator";
import { getIssueListing, getIssuesNewestFirst, issueHref } from "@/lib/site-data";

export const metadata = {
  title: "Issues",
};

export default function IssuesPage() {
  const issues = getIssuesNewestFirst();

  return (
    <div className="content-grid">
      <PageIntro
        eyebrow="Issue index"
        title="Every captured issue, kept in chronological order."
        summary={
          <p>
            The archive stays date-first here: each issue preserves the concrete things surfaced in
            a specific day&apos;s reading, with direct paths into the canonical item pages.
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

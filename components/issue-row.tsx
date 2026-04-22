import Link from "next/link";
import { ArrowUpRight, MessageSquareQuote, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  domainFromUrl,
  formatDate,
  getItemForMention,
  issueHref,
  itemHref,
  type MentionRecord,
} from "@/lib/site-data";

export function IssueRow({ mention }: { mention: MentionRecord }) {
  const item = getItemForMention(mention);
  if (!item) {
    return null;
  }

  const domain = domainFromUrl(item.thing_url);

  return (
    <article className="board-row">
      <div className="board-rank">
        <span>{String(mention.rank ?? 0).padStart(2, "0")}</span>
      </div>
      <div className="board-main">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={itemHref(item.slug)} className="board-title">
            {item.name}
          </Link>
          {mention.is_repeat ? <Badge variant="accent">{item.times_seen} sightings</Badge> : null}
          {domain ? <Badge variant="muted">{domain}</Badge> : null}
        </div>
        <p className="mt-3 max-w-[72ch] text-base leading-relaxed text-[var(--muted-foreground)] md:text-lg">
          {item.summary}
        </p>
        {mention.evidence && (
          <details className="group mt-4 cursor-pointer">
            <summary className="flex w-fit items-center gap-1 text-sm font-bold uppercase tracking-wider text-[var(--primary)] hover:underline">
              <span className="group-open:hidden">Show Evidence</span>
              <span className="hidden group-open:inline">Hide Evidence</span>
            </summary>
            <p className="mt-3 border-l-4 border-[var(--primary)] pl-4 text-base leading-relaxed text-[var(--foreground)]/92">
              {mention.evidence}
            </p>
          </details>
        )}
      </div>
      <div className="board-meta">
        <Badge variant="default" className="w-fit">{formatDate(mention.seen_at)}</Badge>
        <div className="board-actions flex-col items-start gap-3">
          <Button asChild variant="solid" size="sm" className="w-full justify-between">
            <Link href={item.thing_url || mention.hn_url} target="_blank" rel="noreferrer">
              Source
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <div className="flex w-full items-center justify-between gap-4 px-1">
            <Link href={mention.hn_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:underline">
              <MessageSquareQuote className="h-3.5 w-3.5" />
              HN
            </Link>
            <Link href={issueHref(mention.issue_id)} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:underline">
              <History className="h-3.5 w-3.5" />
              Issue log
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

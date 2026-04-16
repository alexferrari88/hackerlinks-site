import Link from "next/link";
import { ArrowUpRight, MessageSquareQuote } from "lucide-react";

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
        <p className="mt-4 text-base leading-relaxed text-[var(--foreground)]/92">{mention.evidence}</p>
      </div>
      <div className="board-meta">
        <Badge variant="default">{formatDate(mention.seen_at)}</Badge>
        <div className="board-actions">
          <Button asChild variant="solid" size="sm">
            <Link href={item.thing_url || mention.hn_url} target="_blank" rel="noreferrer">
              Source
              <ArrowUpRight />
            </Link>
          </Button>
          <Button asChild variant="frame" size="sm">
            <Link href={mention.hn_url} target="_blank" rel="noreferrer">
              HN
              <MessageSquareQuote />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={issueHref(mention.issue_id)}>Issue log</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

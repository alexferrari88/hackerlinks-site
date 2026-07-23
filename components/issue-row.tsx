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

export function IssueRow({
  mention,
  showDate = true,
}: {
  mention: MentionRecord;
  showDate?: boolean;
}) {
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
          {mention.is_repeat ? <Badge variant="accent">Seen {item.times_seen} times</Badge> : null}
          {domain ? <Badge variant="muted">{domain}</Badge> : null}
        </div>
        <p className="mt-3 max-w-[72ch] text-base leading-relaxed text-[var(--muted-foreground)] md:text-lg">
          {item.summary}
        </p>
        {mention.source_story_title ? (
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            Source discussion:{" "}
            <Link
              href={mention.hn_url}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[var(--foreground)] hover:text-[var(--primary)] hover:underline"
            >
              {mention.source_story_title}
            </Link>
          </p>
        ) : null}
        {mention.evidence_sources?.length ? (
          <div className="mt-4 space-y-3">
            {mention.evidence_sources.map((source) => (
              <blockquote key={source.comment_id} className="border-l-4 border-[var(--primary)] pl-4">
                <p className="text-base leading-relaxed text-[var(--foreground)]/92">“{source.excerpt}”</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  {source.author} · {source.kind.replaceAll("_", " ")}
                  {source.context ? ` · ${source.context.replaceAll("_", " ")}` : ""}
                </p>
                <Link
                  href={source.comment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-sm font-semibold text-[var(--primary)] hover:underline"
                >
                  Direct HN comment
                </Link>
              </blockquote>
            ))}
          </div>
        ) : mention.evidence ? (
          <div className="mt-4 border-l-4 border-[var(--line-strong)] pl-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              Editorial paraphrase
            </p>
            <p className="mt-2 text-base leading-relaxed text-[var(--foreground)]/92">{mention.evidence}</p>
            <Link
              href={mention.hn_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm font-semibold text-[var(--primary)] hover:underline"
            >
              Read the original thread
            </Link>
          </div>
        ) : null}
      </div>
      <div className="board-meta">
        {showDate ? <Badge variant="default" className="w-fit">{formatDate(mention.seen_at)}</Badge> : null}
        <div className="board-actions flex-col items-start gap-3">
          <Button asChild variant="solid" size="sm" className="w-full justify-between">
            <Link href={item.thing_url || mention.hn_url} target="_blank" rel="noreferrer">
              {item.thing_url ? "Visit website" : "Open HN thread"}
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <div className="flex w-full items-center justify-between gap-4 px-1">
            <Link href={mention.hn_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:underline">
              <MessageSquareQuote className="h-3.5 w-3.5" />
              HN thread
            </Link>
            <Link href={issueHref(mention.issue_id)} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:underline">
              <History className="h-3.5 w-3.5" />
              Daily issue
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

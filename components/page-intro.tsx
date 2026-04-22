import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PageIntroProps {
  eyebrow: string;
  title: string;
  summary: ReactNode;
  meta?: Array<{ label: string; value: ReactNode; accent?: boolean }>;
  className?: string;
}

export function PageIntro({ eyebrow, title, summary, meta, className }: PageIntroProps) {
  return (
    <section className={cn("grid gap-6", className)}>
      <div className="stack-frame">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="headline mt-4">{title}</h1>
        <div className="mt-5 max-w-[62ch] text-base leading-7 text-[var(--muted-foreground)] md:text-lg">
          {summary}
        </div>
        {meta ? (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold uppercase tracking-wider text-[var(--muted-foreground)]">At a glance:</span>
            {meta.map((entry) => (
              <Badge key={entry.label} variant={entry.accent ? "accent" : "default"} className="gap-1.5 px-3 py-1">
                <span className={entry.accent ? "text-white/80" : "text-[var(--muted-foreground)]"}>{entry.label}:</span>
                <span className={entry.accent ? "text-white" : "text-[var(--foreground)]"}>{entry.value}</span>
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

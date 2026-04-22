import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function BreadcrumbTrail({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]", className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-[var(--primary)] hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-[var(--foreground)]" : undefined}>{item.label}</span>
            )}
            {!isLast ? <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /> : null}
          </span>
        );
      })}
    </nav>
  );
}

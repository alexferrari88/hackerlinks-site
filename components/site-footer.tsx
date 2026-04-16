import Link from "next/link";

import { SITE_BASE_PATH } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="site-shell pb-10 pt-14">
      <div className="frame grid gap-6 px-4 py-6 md:grid-cols-[1.2fr_0.8fr] md:px-6">
        <div>
          <p className="eyebrow">HackerLinks</p>
          <p className="mt-3 max-w-[44ch] text-sm leading-6 text-[var(--muted-foreground)]">
            The easiest way to find tools recommended by the Hacker News community. Fast, searchable, and always up to date.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3 md:justify-end">
          <Link href={`${SITE_BASE_PATH}/issues`} className="nav-chip">
            Browse issues
          </Link>
          <Link href={`${SITE_BASE_PATH}/archive`} className="nav-chip">
            Open archive
          </Link>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";

import { SITE_BASE_PATH, TELEGRAM_BOT_URL } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="site-shell pb-10 pt-14">
      <div className="frame grid gap-6 px-4 py-6 md:grid-cols-[1.2fr_0.8fr] md:px-6">
        <div>
          <p className="eyebrow">HackerLinks</p>
          <p className="mt-3 max-w-[44ch] text-sm leading-6 text-[var(--muted-foreground)]">
            Useful things found in Hacker News discussions, minus the thread-diving. Every find
            keeps the original discussion close enough to check for yourself.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3 md:justify-end">
          <Link href={`${SITE_BASE_PATH}/issues/`} className="nav-chip">
            Daily issues
          </Link>
          <Link href={`${SITE_BASE_PATH}/archive/`} className="nav-chip">
            Search the archive
          </Link>
          <Link href={`${SITE_BASE_PATH}/about/`} className="nav-chip">
            About
          </Link>
          <Link href={`${SITE_BASE_PATH}/methodology/`} className="nav-chip">
            Methodology
          </Link>
          <Link href={`${SITE_BASE_PATH}/feed.xml`} className="nav-chip">
            RSS feed
          </Link>
          <a href={TELEGRAM_BOT_URL} target="_blank" rel="noopener noreferrer" className="nav-chip">
            Daily finds on Telegram
          </a>
        </div>
      </div>
    </footer>
  );
}

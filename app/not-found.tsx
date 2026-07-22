import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SITE_BASE_PATH } from "@/lib/site-config";

export default function NotFound() {
  return (
    <div className="site-shell">
      <section className="stack-frame max-w-[48rem]">
        <p className="eyebrow">404 / Nothing here</p>
        <h1 className="headline mt-4">This link has slipped out of the archive.</h1>
        <p className="mt-5 max-w-[56ch] text-base leading-7 text-[var(--muted-foreground)]">
          It may have moved, or it may never have been captured. Start with the latest finds or
          search everything HackerLinks has saved.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="solid">
            <Link href={`${SITE_BASE_PATH}/`}>See the latest</Link>
          </Button>
          <Button asChild variant="frame">
            <Link href={`${SITE_BASE_PATH}/archive/`}>Search the archive</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SITE_BASE_PATH } from "@/lib/site-config";

export default function NotFound() {
  return (
    <div className="site-shell">
      <section className="stack-frame max-w-[48rem]">
        <p className="eyebrow">404 / Missing record</p>
        <h1 className="headline mt-4">The requested page is not in the archive.</h1>
        <p className="mt-5 max-w-[56ch] text-base leading-7 text-[var(--muted-foreground)]">
          Try the front page for the latest issue, or jump into the issue index to browse the
          captured timeline directly.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="solid">
            <Link href={`${SITE_BASE_PATH}/`}>Front page</Link>
          </Button>
          <Button asChild variant="frame">
            <Link href={`${SITE_BASE_PATH}/issues`}>Issue index</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

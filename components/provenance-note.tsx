import Link from "next/link";

import { SITE_BASE_PATH } from "@/lib/site-config";

export function ProvenanceNote({
  title = "Where this comes from",
  className = "",
}: {
  title?: string;
  className?: string;
}) {
  return (
    <aside className={`frame px-4 py-4 md:px-5 ${className}`.trim()}>
      <p className="eyebrow">{title}</p>
      <p className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">
        Every find starts with a real Hacker News discussion. Exact excerpts include the commenter,
        context, and a direct comment link so you can verify the words in place.
      </p>
      <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
        Older records without a retained exact citation are labelled Editorial paraphrase and link to
        the original thread; they are summaries, not quotations.
      </p>
      <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
        See the{" "}
        <Link href={`${SITE_BASE_PATH}/methodology/`} className="font-semibold text-[var(--primary)] hover:underline">
          full methodology
        </Link>{" "}
        for the selection rules, or read{" "}
        <Link href={`${SITE_BASE_PATH}/about/`} className="font-semibold text-[var(--primary)] hover:underline">
          why HackerLinks exists
        </Link>.
      </p>
    </aside>
  );
}

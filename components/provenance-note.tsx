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
        Every find starts with a real Hacker News discussion. We keep the original thread, the date,
        and the passage that caught our attention beside the summary, so you can judge it yourself.
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

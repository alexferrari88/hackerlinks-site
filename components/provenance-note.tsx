import Link from "next/link";

import { SITE_BASE_PATH } from "@/lib/site-config";

export function ProvenanceNote({
  title = "How this page is compiled",
  className = "",
}: {
  title?: string;
  className?: string;
}) {
  return (
    <aside className={`frame px-4 py-4 md:px-5 ${className}`.trim()}>
      <p className="eyebrow">{title}</p>
      <p className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">
        HackerLinks publishes structured summaries of things surfaced in Hacker News discussions.
        Every canonical page keeps the source link, the issue date, and the supporting evidence
        close to the claim.
      </p>
      <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
        Read the{" "}
        <Link href={`${SITE_BASE_PATH}/methodology/`} className="font-semibold text-[var(--primary)] hover:underline">
          methodology
        </Link>{" "}
        for provenance rules and the{" "}
        <Link href={`${SITE_BASE_PATH}/about/`} className="font-semibold text-[var(--primary)] hover:underline">
          about page
        </Link>{" "}
        for the editorial brief.
      </p>
    </aside>
  );
}

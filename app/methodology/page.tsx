import Link from "next/link";

import { BreadcrumbTrail } from "@/components/breadcrumb-trail";
import { JsonLd } from "@/components/json-ld";
import { PageIntro } from "@/components/page-intro";
import { Separator } from "@/components/ui/separator";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { SITE_BASE_PATH } from "@/lib/site-config";

export const metadata = buildPageMetadata({
  title: "Methodology",
  description:
    "How HackerLinks selects finds from Hacker News, preserves source context, builds the archive, and handles incomplete records.",
  path: "/methodology/",
});

export default function MethodologyPage() {
  const methodologyJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url: absoluteUrl("/methodology/"),
    name: "HackerLinks Methodology",
    description:
      "How HackerLinks selects useful finds from Hacker News and keeps every summary tied to its source discussion.",
  };

  return (
    <div className="content-grid">
      <JsonLd data={methodologyJsonLd} />
      <BreadcrumbTrail
        items={[
          { label: "Home", href: "/" },
          { label: "Methodology" },
        ]}
      />

      <PageIntro
        eyebrow="Methodology"
        title="Every find should lead back to the thread."
        summary={
          <p>
            HackerLinks uses automation to spot specific things mentioned in Hacker News
            discussions. The public archive is built from saved records—not generated on demand—and
            keeps the evidence beside every summary.
          </p>
        }
        meta={[
          { label: "Source", value: "HN discussions", accent: true },
          { label: "Rule", value: "Specific + checkable" },
          { label: "Site", value: "Static + source-linked" },
        ]}
      />

      <section className="stack-frame">
        <p className="eyebrow">What gets included</p>
        <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
          A find must be a specific thing a reader can investigate: a product, tool, library, book,
          piece of hardware, talk, video, or similarly specific reference. Broad ideas, passing
          topics, and unsupported claims do not belong in the archive.
        </p>
        <Separator className="my-6" />
        <p className="eyebrow">How the source is preserved</p>
        <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
          Each find&apos;s page shows when it appeared, which HN discussion mentioned it, and what
          prompted its inclusion. When the same thing resurfaces, the new sighting is added instead
          of erasing the earlier context.
        </p>
        <Separator className="my-6" />
        <p className="eyebrow">How updates reach the site</p>
        <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
          An upstream scout collects structured records. Those records are cleaned, converted to
          public JSON, and rendered as static pages. Visiting HackerLinks never triggers a live HN
          scrape or an AI request.
        </p>
        <Separator className="my-6" />
        <p className="eyebrow">Where automation stops</p>
        <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
          Selection and editorial summarization are automated and AI-assisted. The published site is
          deterministic: pages, feeds, manifests, and metadata are built from the same checked-in
          data. Summaries help readers navigate, but the original comments are authoritative.
        </p>
        <Separator className="my-6" />
        <p className="eyebrow">What can go wrong</p>
        <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
          HackerLinks does not capture every worthwhile mention, and automation can miss context.
          Some records have thin summaries or no direct product URL. The HN thread is kept visible
          precisely so the archive can be checked rather than taken on faith.
        </p>
        <Separator className="my-6" />
        <p className="eyebrow">Corrections</p>
        <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
          If a record misstates its source or links to the wrong place, use the{" "}
          <Link
            href={`${SITE_BASE_PATH}/corrections/`}
            className="font-semibold text-[var(--foreground)] underline underline-offset-4"
          >
            corrections and contact page
          </Link>{" "}
          to report it. Reports are checked against the original discussion and corrected in the
          source record.
        </p>
      </section>
    </div>
  );
}

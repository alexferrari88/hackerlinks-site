import { ExternalLink } from "lucide-react";

import { BreadcrumbTrail } from "@/components/breadcrumb-trail";
import { JsonLd } from "@/components/json-ld";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";

const REPOSITORY_ISSUES_URL = "https://github.com/alexferrari88/hackerlinks-site/issues";

export const metadata = buildPageMetadata({
  title: "Corrections and contact",
  description:
    "How to report a HackerLinks correction, ask a question, or understand its sponsorship and affiliate policy.",
  path: "/corrections/",
});

export default function CorrectionsPage() {
  const correctionsJsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    url: absoluteUrl("/corrections/"),
    name: "HackerLinks corrections and contact",
    description: "How to report corrections or contact HackerLinks through its public repository.",
  };

  return (
    <div className="content-grid">
      <JsonLd data={correctionsJsonLd} />
      <BreadcrumbTrail
        items={[
          { label: "Home", href: "/" },
          { label: "Corrections and contact" },
        ]}
      />

      <PageIntro
        eyebrow="Accountability"
        title="Corrections and contact"
        summary={
          <p>
            Found a summary that misses context, a broken link, or a record attached to the wrong
            source? Report it in the public HackerLinks repository.
          </p>
        }
        meta={[
          { label: "Contact", value: "Public GitHub issue", accent: true },
          { label: "Checked against", value: "Original source" },
          { label: "Paid placement", value: "None" },
        ]}
      />

      <section className="stack-frame">
        <p className="eyebrow">Report a correction</p>
        <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
          Open an issue with the HackerLinks page URL, the statement or link that needs attention,
          and the original source that supports the correction. General questions can use the same
          contact path. Please do not include private information.
        </p>
        <Button asChild variant="frame" className="mt-6">
          <a href={REPOSITORY_ISSUES_URL} target="_blank" rel="noopener noreferrer">
            Open a GitHub issue
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        </Button>
        <Separator className="my-6" />
        <p className="eyebrow">How corrections are handled</p>
        <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
          Reports are checked against the linked Hacker News discussion or other original source.
          When a report is confirmed, the checked-in record is corrected so the next static build
          carries the change across the site. Original comments remain authoritative.
        </p>
        <Separator className="my-6" />
        <p className="eyebrow">Sponsorships and affiliate links</p>
        <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
          HackerLinks currently has no paid placements, sponsorships, or affiliate commissions.
          Selection is not sold. If that policy changes, any paid or affiliate relationship will be
          disclosed next to the affected link and on this page.
        </p>
      </section>
    </div>
  );
}

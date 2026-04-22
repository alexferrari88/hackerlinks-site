import { BreadcrumbTrail } from "@/components/breadcrumb-trail";
import { JsonLd } from "@/components/json-ld";
import { PageIntro } from "@/components/page-intro";
import { Separator } from "@/components/ui/separator";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Methodology",
  description:
    "How HackerLinks compiles daily issues and item pages, including provenance rules, automation flow, limitations, and update policy.",
  path: "/methodology/",
});

export default function MethodologyPage() {
  const methodologyJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url: absoluteUrl("/methodology/"),
    name: "HackerLinks Methodology",
    description:
      "Methodology for the HackerLinks archive, including data sources, editorial rules, automation flow, and known limitations.",
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
        title="How the archive is compiled."
        summary={
          <p>
            HackerLinks publishes deterministic, source-linked pages from structured scout
            artifacts. This page explains what gets included, how updates flow into the site, and
            where the archive still has limitations.
          </p>
        }
        meta={[
          { label: "Source", value: "HN discussions", accent: true },
          { label: "Pipeline", value: "Structured artifacts" },
          { label: "Output", value: "Static pages + JSON" },
        ]}
      />

      <section className="stack-frame">
        <p className="eyebrow">Selection rules</p>
        <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
          The archive focuses on concrete references that surfaced in Hacker News discussion:
          products, tools, libraries, books, hardware, talks, and similar specific things. The
          canonical long-term unit is an item page. The daily freshness unit is an issue page.
        </p>
        <Separator className="my-6" />
        <p className="eyebrow">Provenance rules</p>
        <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
          Every item page keeps the issue date, the cited HN thread, and the supporting evidence
          near the summary. The archive prefers source URLs when available and preserves repeat
          sightings over time instead of replacing them with a single abstract description.
        </p>
        <Separator className="my-6" />
        <p className="eyebrow">Update flow</p>
        <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
          Private scout artifacts are synced into the repository, normalized into public JSON, and
          rendered into static HTML. The public site does not scrape Hacker News or call models at
          request time.
        </p>
        <Separator className="my-6" />
        <p className="eyebrow">Automation and AI usage</p>
        <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
          Automation is used upstream to collect and normalize structured records. The website
          itself is deterministic downstream: static pages, JSON manifests, and machine-readable
          metadata are built from checked-in artifacts.
        </p>
        <Separator className="my-6" />
        <p className="eyebrow">Known limitations</p>
        <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
          Coverage depends on the upstream artifact quality. Some items still have thin summaries
          or missing source URLs. The archive is meant to improve over time by preserving history,
          not by pretending every record is already complete.
        </p>
      </section>
    </div>
  );
}

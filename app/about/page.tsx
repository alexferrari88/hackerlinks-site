import { BreadcrumbTrail } from "@/components/breadcrumb-trail";
import { JsonLd } from "@/components/json-ld";
import { PageIntro } from "@/components/page-intro";
import { Separator } from "@/components/ui/separator";
import { absoluteUrl, buildPageMetadata, organizationJsonLd } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "About",
  description:
    "Editorial brief for HackerLinks: what the site covers, who it is for, and why provenance stays close to every claim.",
  path: "/about/",
});

export default function AboutPage() {
  const aboutJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      organizationJsonLd(),
      {
        "@type": "AboutPage",
        url: absoluteUrl("/about/"),
        name: "About HackerLinks",
        description:
          "Editorial brief describing what HackerLinks covers, who it serves, and why the archive keeps evidence close to every claim.",
      },
    ],
  };

  return (
    <div className="content-grid">
      <JsonLd data={aboutJsonLd} />
      <BreadcrumbTrail
        items={[
          { label: "Home", href: "/" },
          { label: "About" },
        ]}
      />

      <PageIntro
        eyebrow="About"
        title="A public archive of what developers keep surfacing."
        summary={
          <p>
            HackerLinks turns recurring Hacker News references into stable, source-linked pages so
            readers can understand what was mentioned, why it mattered, and where the claim came
            from.
          </p>
        }
        meta={[
          { label: "Format", value: "Static archive", accent: true },
          { label: "Audience", value: "Readers and agents" },
          { label: "Focus", value: "Concrete references" },
        ]}
      />

      <section className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="stack-frame">
          <p className="eyebrow">What HackerLinks covers</p>
          <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
            The archive is intentionally broad. It tracks tools, libraries, products, books, talks,
            videos, hardware, and other concrete things that Hacker News users pull into view while
            discussing what they actually use.
          </p>
          <Separator className="my-6" />
          <p className="eyebrow">Why it exists</p>
          <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
            Daily discussion is noisy and ephemeral. HackerLinks keeps the useful references stable,
            cumulative, and legible so readers do not have to reconstruct the context from scratch.
          </p>
          <Separator className="my-6" />
          <p className="eyebrow">Who it is for</p>
          <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
            It is built for developers, researchers, and retrieval systems that need more than a
            link dump. Every canonical page is designed to keep provenance, dates, and evidence
            close to the summary.
          </p>
        </article>

        <aside className="rail-stack">
          <section className="frame px-4 py-4 md:px-5">
            <p className="eyebrow">Editorial posture</p>
            <Separator className="my-4 bg-[var(--line-strong)]" />
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              Canonical unit: item page. Freshness unit: daily issue page. Trust comes from keeping
              the source thread and evidence close to the claim.
            </p>
          </section>

          <section className="frame px-4 py-4 md:px-5">
            <p className="eyebrow">What it avoids</p>
            <Separator className="my-4 bg-[var(--line-strong)]" />
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              HackerLinks is not a generic AI content farm, not a startup launch tracker, and not a
              broad taxonomy project. The archive only keeps concrete references with evidence.
            </p>
          </section>
        </aside>
      </section>
    </div>
  );
}

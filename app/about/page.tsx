import { BreadcrumbTrail } from "@/components/breadcrumb-trail";
import { JsonLd } from "@/components/json-ld";
import { PageIntro } from "@/components/page-intro";
import { Separator } from "@/components/ui/separator";
import { absoluteUrl, buildPageMetadata, organizationJsonLd } from "@/lib/seo";

const OPERATOR_URL = "https://github.com/alexferrari88";

export const metadata = buildPageMetadata({
  title: "About",
  description:
    "Why HackerLinks turns useful finds from Hacker News discussions into a searchable archive with the original context attached.",
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
          "Why HackerLinks saves useful finds from Hacker News discussions with their original context attached.",
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
        title="The links worth saving are often buried in the comments."
        summary={
          <p>
            HackerLinks digs useful tools, books, products, talks, hardware, and other worthwhile
            finds out of Hacker News discussions—then keeps the context that made them interesting.
          </p>
        }
        meta={[
          { label: "Built for", value: "Curious people", accent: true },
          { label: "Drawn from", value: "Real HN threads" },
          { label: "Every find", value: "Source-linked" },
        ]}
      />

      <section className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="stack-frame">
          <p className="eyebrow">What you&apos;ll find</p>
          <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
            Not just launches. Not just software. HackerLinks follows the useful side trails: tools,
            libraries, books, talks, videos, physical products, and anything else specific enough to
            open, try, read, watch, or buy.
          </p>
          <Separator className="my-6" />
          <p className="eyebrow">Why save it</p>
          <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
            An offhand mention can sit deep in a thread and vanish from view by tomorrow. HackerLinks
            gives each find a permanent page, records when it resurfaces, and preserves the reason it
            was mentioned.
          </p>
          <Separator className="my-6" />
          <p className="eyebrow">Independence</p>
          <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
            HackerLinks is independent and unaffiliated with Hacker News or Y Combinator. It is a
            separate archive built from publicly linked discussions; neither organization selects,
            reviews, or endorses its entries. It is operated and edited by the maintainer of the
            public HackerLinks repository, {" "}
            <a
              href={OPERATOR_URL}
              className="font-semibold text-[var(--foreground)] underline underline-offset-4"
            >
              @alexferrari88
            </a>.
          </p>
          <Separator className="my-6" />
          <p className="eyebrow">Who it&apos;s for</p>
          <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
            People who enjoy Hacker News for the unexpected discoveries but do not want to read
            every thread to find them. Browse the daily issue for serendipity, or search the archive
            when you need something specific.
          </p>
        </article>

        <aside className="rail-stack">
          <section className="frame px-4 py-4 md:px-5">
            <p className="eyebrow">The short version</p>
            <Separator className="my-4 bg-[var(--line-strong)]" />
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              The daily issue shows what surfaced now. The item page shows where it has surfaced
              over time. The original HN discussion stays one click away.
            </p>
          </section>

          <section className="frame px-4 py-4 md:px-5">
            <p className="eyebrow">How it works</p>
            <Separator className="my-4 bg-[var(--line-strong)]" />
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              Automated, AI-assisted selection and summarization turn source discussions into
              structured records. Static pages publish those records with the source close by so
              readers can check the editorial summary against the original comments.
            </p>
          </section>
        </aside>
      </section>
    </div>
  );
}

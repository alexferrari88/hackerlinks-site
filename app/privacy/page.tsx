import Link from "next/link";

import { BreadcrumbTrail } from "@/components/breadcrumb-trail";
import { JsonLd } from "@/components/json-ld";
import { PageIntro } from "@/components/page-intro";
import { Separator } from "@/components/ui/separator";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";

const OPERATOR_URL = "https://github.com/alexferrari88";
const CLOUDFLARE_ANALYTICS_URL = "https://www.cloudflare.com/web-analytics/";
const CLOUDFLARE_DPA_URL = "https://www.cloudflare.com/cloudflare-customer-dpa/";
const CLOUDFLARE_PRIVACY_URL = "https://www.cloudflare.com/privacypolicy/";
const DUTCH_DPA_URL =
  "https://www.autoriteitpersoonsgegevens.nl/en/submitting-a-tip-off-or-a-complaint-to-the-ap";
const TELEGRAM_PRIVACY_URL = "https://telegram.org/privacy";

export const metadata = buildPageMetadata({
  title: "Privacy",
  description:
    "How HackerLinks uses privacy-limited analytics and handles Telegram subscription attribution.",
  path: "/privacy/",
});

function ExternalTextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-[var(--foreground)] underline underline-offset-4"
    >
      {children}
    </a>
  );
}

export default function PrivacyPage() {
  const privacyJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url: absoluteUrl("/privacy/"),
    name: "HackerLinks privacy notice",
    dateModified: "2026-07-24",
  };

  return (
    <div className="content-grid">
      <JsonLd data={privacyJsonLd} />
      <BreadcrumbTrail
        items={[
          { label: "Home", href: "/" },
          { label: "Privacy" },
        ]}
      />

      <PageIntro
        eyebrow="Privacy"
        title="Aggregate measurement without visitor profiles."
        summary={
          <p>
            HackerLinks uses limited, cookie-free analytics to understand which pages and referral
            sources are useful. It does not run advertising trackers or build visitor profiles.
          </p>
        }
        meta={[
          { label: "Cookies", value: "None for analytics", accent: true },
          { label: "Visitor IDs", value: "None" },
          { label: "Last updated", value: "24 July 2026" },
        ]}
      />

      <section className="stack-frame">
        <p className="eyebrow">Who is responsible</p>
        <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
          The data controller for HackerLinks is its Netherlands-based operator, Alex Ferrari,
          identified through the public {" "}
          <ExternalTextLink href={OPERATOR_URL}>@alexferrari88 profile</ExternalTextLink>. To ask a
          privacy question or exercise a data-protection right, use the {" "}
          <Link
            href="/corrections/"
            className="font-semibold text-[var(--foreground)] underline underline-offset-4"
          >
            contact route
          </Link>
          . Do not put personal information in a public issue; ask there for a private contact route.
        </p>

        <Separator className="my-6" />
        <p className="eyebrow">Cloudflare Web Analytics</p>
        <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
          HackerLinks uses {" "}
          <ExternalTextLink href={CLOUDFLARE_ANALYTICS_URL}>
            Cloudflare Web Analytics
          </ExternalTextLink>{" "}
          for aggregate page-view, referral, country, browser, device-category, and page-performance
          statistics. Cloudflare says this service does not use cookies or local storage, assign
          persistent visitor identifiers, or fingerprint people through IP addresses, user-agent
          strings, or other data. HackerLinks does not receive user-level event records.
        </p>
        <p className="mt-4 text-base leading-7 text-[var(--muted-foreground)]">
          The lawful basis is the legitimate interest in measuring and improving a small public
          website under Article 6(1)(f) GDPR. The measurement is limited to aggregate audience and
          performance statistics and is intended to have little or no effect on visitor privacy. On
          that basis, HackerLinks relies on the limited-analytics exception in Article 11.7a of the
          Dutch Telecommunications Act rather than displaying a consent banner.
        </p>
        <p className="mt-4 text-base leading-7 text-[var(--muted-foreground)]">
          Cloudflare also hosts and delivers HackerLinks through Cloudflare Pages and its edge network.
          Like any web host or content-delivery network, Cloudflare may process ordinary request and
          security metadata, including an IP address, request headers, requested path, and threat
          signals, to deliver and protect the site. The lawful basis is the legitimate interest in
          providing a secure, reliable public website.
        </p>
        <p className="mt-4 text-base leading-7 text-[var(--muted-foreground)]">
          Cloudflare states that unsampled Web Analytics beacon data is retained for seven days and
          then reduced to aggregated data; the Web Analytics dashboard provides up to six months of
          history. Cloudflare acts as a service provider under its {" "}
          <ExternalTextLink href={CLOUDFLARE_DPA_URL}>Data Processing Addendum</ExternalTextLink>,
          which includes safeguards for international transfers. See {" "}
          <ExternalTextLink href={CLOUDFLARE_PRIVACY_URL}>
            Cloudflare&apos;s privacy policy
          </ExternalTextLink>{" "}
          for its own processing.
        </p>

        <Separator className="my-6" />
        <p className="eyebrow">Telegram subscription links</p>
        <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
          A Telegram subscription link contains only a coarse source label such as
          <code className="mx-1 rounded bg-[var(--secondary)] px-1.5 py-0.5 text-sm">
            hackerlinks_site
          </code>
          or
          <code className="mx-1 rounded bg-[var(--secondary)] px-1.5 py-0.5 text-sm">
            hackerlinks_hn_2026
          </code>
          . HackerLinks does not store this label in cookies, local storage, or session storage and
          does not send the referring URL to Telegram. If you open Telegram, Telegram processes that
          visit under its {" "}
          <ExternalTextLink href={TELEGRAM_PRIVACY_URL}>own privacy policy</ExternalTextLink>.
        </p>

        <Separator className="my-6" />
        <p className="eyebrow">Your rights</p>
        <p className="mt-6 text-base leading-7 text-[var(--muted-foreground)]">
          Where the GDPR applies, you may request access, correction, deletion, restriction, or
          portability of personal data and may object to processing based on legitimate interests.
          Because the analytics are aggregate and do not assign a visitor identifier, HackerLinks may
          be unable to connect an analytics record to you. You may also lodge a complaint with the {" "}
          <ExternalTextLink href={DUTCH_DPA_URL}>
            Dutch Data Protection Authority
          </ExternalTextLink>.
        </p>
      </section>
    </div>
  );
}

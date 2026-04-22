import type { Metadata } from "next";

import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site-config";

export const SOCIAL_IMAGE_PATH = "/og-card.svg";
export const ORGANIZATION_ID = "organization";
export const WEBSITE_ID = "website";

const siteUrl = new URL(SITE_URL);
const sitePathPrefix = siteUrl.pathname === "/" ? "" : siteUrl.pathname.replace(/\/$/, "");

export const DEFAULT_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    noimageindex: false,
    "max-snippet": -1,
    "max-image-preview": "large",
    "max-video-preview": -1,
  },
};

function normalizeRoutePath(routePath = "/") {
  const trimmed = routePath.trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }

  const withoutEdges = trimmed.replace(/^\/+|\/+$/g, "");
  if (withoutEdges.split("/").pop()?.includes(".")) {
    return `/${withoutEdges}`;
  }

  return `/${withoutEdges}/`;
}

export function absoluteUrl(routePath = "/", fragment?: string) {
  const url = new URL(siteUrl.origin);
  url.pathname = `${sitePathPrefix}${normalizeRoutePath(routePath)}`;
  if (fragment) {
    url.hash = fragment.startsWith("#") ? fragment : `#${fragment}`;
  }
  return url.toString();
}

export function pageTitle(title?: string) {
  if (!title || title === SITE_NAME) {
    return SITE_NAME;
  }

  return `${title} | ${SITE_NAME}`;
}

export function buildPageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path = "/",
}: {
  title?: string;
  description?: string;
  path?: string;
}): Metadata {
  const canonical = absoluteUrl(path);
  const fullTitle = pageTitle(title);

  return {
    title,
    description,
    alternates: {
      canonical,
      types: {
        "application/rss+xml": absoluteUrl("/feed.xml"),
      },
    },
    robots: DEFAULT_ROBOTS,
    openGraph: {
      type: "website",
      url: canonical,
      title: fullTitle,
      description,
      siteName: SITE_NAME,
      images: [
        {
          url: absoluteUrl(SOCIAL_IMAGE_PATH),
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} social card`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [absoluteUrl(SOCIAL_IMAGE_PATH)],
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path?: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/about/", ORGANIZATION_ID),
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description: SITE_DESCRIPTION,
    logo: absoluteUrl("/icon.svg"),
    publishingPrinciples: absoluteUrl("/methodology/"),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/", WEBSITE_ID),
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description: SITE_DESCRIPTION,
    publisher: {
      "@id": absoluteUrl("/about/", ORGANIZATION_ID),
    },
  };
}

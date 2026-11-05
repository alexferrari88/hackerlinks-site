import type { Metadata } from "next";
import localFont from "next/font/local";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { buildPageMetadata } from "@/lib/seo";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site-config";

import "./globals.css";

// Keep builds independent of Google Fonts responses (Next.js issue #99114).
const display = localFont({
  src: "./fonts/BricolageGrotesque[opsz,wdth,wght].ttf",
  variable: "--font-display",
  weight: "200 800",
  display: "swap",
});

const body = localFont({
  src: "./fonts/PublicSans[wght].ttf",
  variable: "--font-body",
  weight: "100 900",
  display: "swap",
});

const mono = localFont({
  src: [
    { path: "./fonts/SpaceMono-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/SpaceMono-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
});

const baseMetadata = buildPageMetadata({
  description: SITE_DESCRIPTION,
  path: "/",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: baseMetadata.alternates,
  robots: baseMetadata.robots,
  openGraph: baseMetadata.openGraph,
  twitter: baseMetadata.twitter,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <ThemeProvider>
          <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
            <div className="background-grid" />
            <SiteHeader />
            <main className="site-shell pb-12 pt-8 md:pt-12">{children}</main>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Bricolage_Grotesque, Public_Sans, Space_Mono } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { buildPageMetadata } from "@/lib/seo";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site-config";

import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

const body = Public_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const mono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "700"],
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

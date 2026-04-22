import Link from "next/link";

import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { SITE_BASE_PATH } from "@/lib/site-config";

const links = [
  { href: `${SITE_BASE_PATH}/`, label: "Front page" },
  { href: `${SITE_BASE_PATH}/issues/`, label: "Issues" },
  { href: `${SITE_BASE_PATH}/archive/`, label: "Archive" },
  { href: `${SITE_BASE_PATH}/about/`, label: "About" },
];

export function SiteHeader() {
  return (
    <header className="site-shell pt-6">
      <div className="frame flex items-center justify-between gap-4 px-4 py-4 md:px-6">
        <div className="flex items-center gap-4">
          <Link href={`${SITE_BASE_PATH}/`} className="brand-lockup">
            <span className="brand-mark" aria-hidden="true" />
            <span className="font-display text-[1.7rem] uppercase tracking-[0.08em] md:text-[2rem]">
              HackerLinks
            </span>
          </Link>
          <Badge variant="accent" className="hidden md:inline-flex">
            Curated Tools
          </Badge>
        </div>
        <nav className="hidden items-center gap-2 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="nav-chip">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}

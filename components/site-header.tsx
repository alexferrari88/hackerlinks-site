"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { SITE_BASE_PATH } from "@/lib/site-config";

const links = [
  { href: `${SITE_BASE_PATH}/`, label: "Latest" },
  { href: `${SITE_BASE_PATH}/issues/`, label: "Daily issues" },
  { href: `${SITE_BASE_PATH}/archive/`, label: "Search" },
  { href: `${SITE_BASE_PATH}/about/`, label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === `${SITE_BASE_PATH}/`) {
      return pathname === href;
    }
    if (href === `${SITE_BASE_PATH}/archive/` && pathname.startsWith(`${SITE_BASE_PATH}/items/`)) {
      return true;
    }
    return pathname.startsWith(href);
  }

  return (
    <header className="site-shell pt-6">
      <div className="frame site-header-frame flex items-center justify-between gap-4 px-4 py-4 md:px-6">
        <div className="site-brand-group flex min-w-0 items-center gap-4">
          <Link href={`${SITE_BASE_PATH}/`} className="brand-lockup">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-name font-display text-[1.7rem] uppercase tracking-[0.08em] md:text-[2rem]">
              HackerLinks
            </span>
          </Link>
          <Badge variant="accent" className="hidden lg:inline-flex">
            From real HN threads
          </Badge>
        </div>
        <nav className="hidden items-center gap-2 lg:flex" aria-label="Primary navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-chip ${isActive(link.href) ? "nav-chip-active" : ""}`}
              aria-current={isActive(link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="site-header-actions flex shrink-0 items-center gap-3">
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}

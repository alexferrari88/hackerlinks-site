"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SITE_BASE_PATH } from "@/lib/site-config";

const links = [
  { href: `${SITE_BASE_PATH}/`, label: "Front page" },
  { href: `${SITE_BASE_PATH}/issues/`, label: "Issues" },
  { href: `${SITE_BASE_PATH}/archive/`, label: "Archive" },
  { href: `${SITE_BASE_PATH}/about/`, label: "About" },
  { href: `${SITE_BASE_PATH}/methodology/`, label: "Methodology" },
];

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="frame" size="icon" className="md:hidden">
          <Menu />
          <span className="sr-only">Open navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>HackerLinks</SheetTitle>
          <SheetDescription>
            Dense, source-linked sightings from Hacker News without the startup-marketing varnish.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-10 flex flex-col gap-4">
          {links.map((link) => (
            <Button key={link.href} asChild variant="frame" size="lg" className="justify-start">
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
          <div className="pt-4">
            <ThemeToggle />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

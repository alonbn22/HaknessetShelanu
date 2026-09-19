"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { primaryNav, isActive, isHighlighted } from "./nav-items";
import { NavMore } from "./NavMore";

// Desktop nav: seven sections inline, the rest behind "More", so the bar is one
// line at every desktop width. The active item is marked by a rule, not by
// weight — a bold active link changes its width and reflows the row.
export function NavLinks() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-x-5 text-sm">
      {primaryNav.map((item) => {
        const active = isActive(pathname, item.href);
        if (isHighlighted(item)) {
          // The election pill: filled, bold, and outlined when current.
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-3 py-1 font-semibold transition-colors ${
                active
                  ? "bg-on-chrome text-chrome"
                  : "bg-on-chrome/15 text-on-chrome hover:bg-on-chrome/25"
              }`}
            >
              {t(item.key)}
            </Link>
          );
        }
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`border-b-2 py-1 transition-colors ${
              active ? "border-on-chrome" : "border-transparent text-on-chrome/85 hover:text-on-chrome"
            }`}
          >
            {t(item.key)}
          </Link>
        );
      })}
      <NavMore />
    </nav>
  );
}

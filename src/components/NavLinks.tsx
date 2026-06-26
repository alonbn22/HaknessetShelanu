"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { navItems } from "./nav-items";

// Desktop nav (inline row). On small screens it is hidden in favor of MobileNav.
export function NavLinks() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
      {navItems.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "font-bold underline underline-offset-[6px] decoration-2"
                : "text-white/85 hover:text-white"
            }
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const navItems = [
  { href: "/", key: "home" },
  { href: "/members", key: "members" },
  { href: "/ministers", key: "ministers" },
  { href: "/parties", key: "parties" },
  { href: "/votes", key: "votes" },
  { href: "/laws", key: "laws" },
  { href: "/committees", key: "committees" },
  { href: "/lawbook", key: "lawbook" },
  { href: "/budget", key: "budget" },
  { href: "/lobbyists", key: "lobbyists" },
  { href: "/attendance", key: "attendance" },
  { href: "/elections", key: "electionsHistory" },
  { href: "/quiz", key: "quiz" },
  { href: "/glossary", key: "glossary" },
  { href: "/tickets", key: "tickets" },
] as const;

export function NavLinks() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
      {navItems.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
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

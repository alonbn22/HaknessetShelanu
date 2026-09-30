"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useDisclosure } from "@/lib/use-disclosure";
import { moreNav, isActive } from "./nav-items";

// The overflow disclosure for the desktop nav: a button and a list of links
// (not role="menu", which promises arrow-key handling that site navigation
// doesn't need). The panel hangs from the trigger's end edge (logical, so it
// mirrors in RTL).
export function NavMore() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { open, setOpen, root, trigger } = useDisclosure();
  const id = useId();
  const anyActive = moreNav.some((i) => isActive(pathname, i.href));

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 border-b-2 py-1 transition-colors ${
          anyActive ? "border-on-chrome" : "border-transparent text-on-chrome/85 hover:text-on-chrome"
        }`}
      >
        {t("more")}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d={open ? "M2 8l4-4 4 4" : "M2 4l4 4 4-4"} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul
          id={id}
          className="absolute end-0 top-full z-50 mt-2 min-w-48 rounded-control border border-line bg-surface p-1 text-foreground shadow-float"
        >
          {moreNav.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`block rounded-chip px-3 py-2 text-sm hover:bg-surface-sunken ${
                    active ? "font-semibold text-accent-ink" : ""
                  }`}
                >
                  {t(item.key)}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

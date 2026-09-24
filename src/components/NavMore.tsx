"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { moreNav, isActive } from "./nav-items";

// The overflow disclosure for the desktop nav. Escape and click-away close it,
// as MobileNav does; the panel hangs from the trigger's end edge (logical, so
// it mirrors in RTL).
export function NavMore() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const anyActive = moreNav.some((i) => isActive(pathname, i.href));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
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
          role="menu"
          className="absolute end-0 top-full z-50 mt-2 min-w-48 rounded-control border border-line bg-surface p-1 text-foreground shadow-float"
        >
          {moreNav.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.key} role="none">
                <Link
                  role="menuitem"
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

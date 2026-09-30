"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useDisclosure } from "@/lib/use-disclosure";
import { navItems, isActive, isHighlighted } from "./nav-items";

// Hamburger menu for small screens (desktop uses NavLinks).
export function MobileNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  // Escape (focus back on the button), click-away and tabbing out close it;
  // links close via their onClick, so no route-change effect is needed.
  const { open, setOpen, root, trigger } = useDisclosure();

  return (
    <div ref={root} className="md:hidden">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={t("menu")}
        className="inline-flex h-10 w-10 items-center justify-center rounded-control hover:bg-chrome-hover"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          ) : (
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open && (
        <>
          {/* Click-away backdrop; header (z-40) stays above it. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default bg-black/20"
          />
          <nav
            id="mobile-nav"
            className="absolute inset-x-0 top-full z-40 max-h-[70vh] overflow-y-auto border-t border-on-chrome/20 bg-chrome shadow-float"
          >
            <ul className="mx-auto flex max-w-6xl flex-col px-4 py-2">
              {navItems.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={`block rounded-lg px-3 py-2.5 text-sm ${
                        isHighlighted(item)
                          ? `font-semibold ${active ? "bg-on-chrome text-chrome" : "bg-on-chrome/15 text-on-chrome hover:bg-on-chrome/25"}`
                          : active
                            ? "bg-chrome-hover font-semibold"
                            : "text-on-chrome/90 hover:bg-chrome-hover"
                      }`}
                    >
                      {t(item.key)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}

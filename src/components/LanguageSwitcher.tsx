"use client";

import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useDisclosure } from "@/lib/use-disclosure";
import { locales, type Locale } from "@/i18n/routing";

const localeNames: Record<Locale, string> = {
  he: "עברית",
  en: "English",
  ar: "العربية",
  ru: "Русский",
  es: "Español",
};

// A button and a list of links to this page in each language — the More
// menu's pattern. It was a <select> that navigated on change: on Windows the
// arrow keys change a closed select's value, so a keyboard user browsing the
// options was sent to another language at the first key press (WCAG 3.2.2),
// and its name, "Language", was English on every page.
export function LanguageSwitcher() {
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const query = Object.fromEntries(useSearchParams().entries());
  const { open, setOpen, root, trigger } = useDisclosure();
  const id = useId();

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex cursor-pointer items-center gap-1 rounded-chip border border-on-chrome/40 bg-chrome-hover px-2 py-1 text-sm text-on-chrome"
      >
        <span className="sr-only">{t("language")} </span>
        {localeNames[locale]}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d={open ? "M2 8l4-4 4 4" : "M2 4l4 4 4-4"} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul
          id={id}
          className="absolute end-0 top-full z-50 mt-2 min-w-40 rounded-control border border-line bg-surface p-1 text-foreground shadow-float"
        >
          {locales.map((l) => (
            <li key={l}>
              <Link
                href={{ pathname, query }}
                locale={l}
                replace
                lang={l}
                aria-current={l === locale ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`block rounded-chip px-3 py-2 text-sm hover:bg-surface-sunken ${
                  l === locale ? "font-semibold text-accent-ink" : ""
                }`}
              >
                {localeNames[l]}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

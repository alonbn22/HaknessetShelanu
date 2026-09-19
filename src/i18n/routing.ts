import { defineRouting } from "next-intl/routing";

// Order = the language switcher order. Hebrew is the source of truth; es/fr
// were added on 19 Sep 2026 (plan Stage 9) — UI strings translated, data text
// via the lazy translation cache, editorial content falling back to English.
export const locales = ["he", "en", "ar", "ru", "es", "fr"] as const;
export type Locale = (typeof locales)[number];

export const rtlLocales: ReadonlySet<string> = new Set(["he", "ar"]);

export const routing = defineRouting({
  locales,
  defaultLocale: "he",
  // Hebrew is served at the root path; en/ar/ru get a prefix.
  localePrefix: "as-needed",
});

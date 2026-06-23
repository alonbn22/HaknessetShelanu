import { defineRouting } from "next-intl/routing";

export const locales = ["he", "en", "ar", "ru"] as const;
export type Locale = (typeof locales)[number];

export const rtlLocales: ReadonlySet<string> = new Set(["he", "ar"]);

export const routing = defineRouting({
  locales,
  defaultLocale: "he",
  // Hebrew is served at the root path; en/ar/ru get a prefix.
  localePrefix: "as-needed",
});

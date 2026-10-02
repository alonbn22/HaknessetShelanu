import { defineRouting } from "next-intl/routing";

// Order = the language switcher order. Hebrew is the source of truth; es/fr
// were added on 19 Sep 2026 (plan Stage 9). French is paused since 3 Oct 2026
// (owner's decision): ~22,000 Knesset data strings have no French yet and no
// translation source both good and easy exists (LibreTranslate failed a test).
// Its UI strings (messages/fr.json) and editorial text (the `fr` fields in
// content/) stay in the repo; to bring it back, add "fr" here and the switcher
// name, fill what `npm run translations:export -- out.json fr` lists, and let
// the parity tests show any new strings it missed.
export const locales = ["he", "en", "ar", "ru", "es"] as const;
export type Locale = (typeof locales)[number];

export const rtlLocales: ReadonlySet<string> = new Set(["he", "ar"]);

export const routing = defineRouting({
  locales,
  defaultLocale: "he",
  // Hebrew is served at the root path; en/ar/ru get a prefix.
  localePrefix: "as-needed",
  // No cookies (decided 27 Sep 2026): the language lives in the URL alone, so
  // "/" is always Hebrew — no NEXT_LOCALE cookie, no Accept-Language redirect.
  localeCookie: false,
  localeDetection: false,
});

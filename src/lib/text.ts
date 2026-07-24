// Shared text helpers.

// Hebrew Unicode block — detects Hebrew so we can set dir="rtl"/lang="he" on
// untranslated data (names, vote titles) still in Hebrew regardless of UI locale.
// Escaped, so it carries no literal Hebrew.
const HEBREW = /[\u0590-\u05FF]/;

export function isHebrew(s: string | null | undefined): boolean {
  return s != null && HEBREW.test(s);
}

// Spreadable dir/lang props for text that may be untranslated Hebrew:
//   <span {...rtlAttrs(name)}>{name}</span>
export function rtlAttrs(s: string | null | undefined): { dir?: "rtl"; lang?: "he" } {
  return isHebrew(s) ? { dir: "rtl", lang: "he" } : {};
}

// Same, for values already resolved by the translation cache (Localized-shaped:
// anything carrying an `rtl` flag). Structural type — safe in client components.
export function localizedAttrs(l: { rtl: boolean }): { dir?: "rtl"; lang?: "he" } {
  return l.rtl ? { dir: "rtl", lang: "he" } : {};
}

// Scheme guard for DB-sourced URLs rendered into href (committee docs, broadcast
// links, Wikipedia links): only http(s) passes; anything else → null. Trim first —
// browsers tolerate "\tjavascript:…". Defense-in-depth: React already sanitizes
// javascript: hrefs, and the sync normalizes these, but data is data.
export function safeHttpUrl(url: string | null | undefined): string | null {
  const u = (url ?? "").trim();
  return /^https?:\/\//i.test(u) ? u : null;
}

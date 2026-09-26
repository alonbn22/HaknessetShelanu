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
export function localizedAttrs(l: { rtl: boolean; lang?: string }): { dir?: "rtl" | "ltr"; lang?: string } {
  if (l.rtl) return { dir: "rtl", lang: "he" };
  return l.lang ? { dir: "ltr", lang: l.lang } : {};
}

// Scheme guard for DB-sourced URLs rendered into href (committee docs, broadcast
// links, Wikipedia links): only http(s) passes; anything else → null. Trim first —
// browsers tolerate "\tjavascript:…". Defense-in-depth: React already sanitizes
// javascript: hrefs, and the sync normalizes these, but data is data.
export function safeHttpUrl(url: string | null | undefined): string | null {
  const u = (url ?? "").trim();
  return /^https?:\/\//i.test(u) ? u : null;
}

// Commons' imageinfo API now hands back thumbnails on thumb.wikimedia.org with
// tracking parameters; the site's CSP (and the committed photo columns) use
// the canonical upload.wikimedia.org host, whose paths are identical. Applied
// in the sync when storing and again when rendering, so an older DB still works.
export function canonicalCommonsUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === "thumb.wikimedia.org") u.hostname = "upload.wikimedia.org";
    if (u.hostname === "upload.wikimedia.org") u.search = "";
    return u.toString();
  } catch {
    return url;
  }
}

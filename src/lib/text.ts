// Shared text helpers.

// Hebrew Unicode block — detects Hebrew so we can set dir="rtl"/lang="he" on
// untranslated data (names, vote titles) still in Hebrew regardless of UI locale.
// Escaped, so it carries no literal Hebrew.
const HEBREW = /[\u0590-\u05FF]/;

export function isHebrew(s: string | null | undefined): boolean {
  return s != null && HEBREW.test(s);
}

// A source's own title, for its link tooltip — left out on a non-Hebrew page
// when it is Hebrew (the visible credit already names the publisher).
export function sourceTitle(title: string, locale: string): string | undefined {
  return locale === "he" || !isHebrew(title) ? title : undefined;
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

// The Commons page of the file behind an upload URL, thumbnail or not:
// .../commons/thumb/8/85/Name.jpg/500px-Name.jpg → .../wiki/File:Name.jpg.
export function commonsFilePage(url: string | null | undefined): string | null {
  const m = /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)/.exec(
    canonicalCommonsUrl(url) ?? "",
  );
  return m ? `https://commons.wikimedia.org/wiki/File:${m[1]}` : null;
}

// A photo license's Creative Commons deed ("CC BY-SA 4.0" → .../by-sa/4.0/);
// null for anything without one, such as "Public domain".
export function licenseUrl(license: string | null | undefined): string | null {
  if (license === "CC0") return "https://creativecommons.org/publicdomain/zero/1.0/";
  const m = /^CC (BY|BY-SA) (\d\.\d)$/.exec(license ?? "");
  return m ? `https://creativecommons.org/licenses/${m[1].toLowerCase()}/${m[2]}/` : null;
}

// The same photo at a smaller Commons thumbnail width. Thumbnail paths end in
// /thumb/…/<n>px-<file>; Wikimedia pre-renders only standard widths (250 is
// one), so pass one of those. Only ever narrows: an original file (the stored
// URL when the photo is smaller than the stored width) or a thumbnail already
// that small is returned as is, since Commons refuses to upscale.
export function commonsThumbUrl(url: string | null | undefined, width: number): string | null {
  const u = canonicalCommonsUrl(url);
  if (!u?.startsWith("https://upload.wikimedia.org/")) return u;
  return u.replace(/(\/thumb\/.+\/)(\d+)px-([^/]+)$/, (m, dir, n, file) =>
    Number(n) > width ? `${dir}${width}px-${file}` : m,
  );
}

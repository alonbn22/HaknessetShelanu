// Server-only: translate a user's search query into Hebrew so it can match the
// always-populated Hebrew titles, even when a row's machine-translated title is
// missing. This makes search work in every language regardless of how much of
// the translated-title backfill has completed.
//
// Uses the same public Google endpoint as the title sync (no key). Results are
// cached in-memory per (locale, query) and degrade gracefully: on any failure
// we return the original query, so search still works against the locale column.
// Only import from server components / server code (it performs a network fetch).

import { gtxTranslate } from "./gtx";

const HE_RANGE = /[֐-׿]/;
const cache = new Map<string, string>();

export async function translateQueryToHebrew(
  query: string | undefined | null,
  locale: string,
): Promise<string> {
  const q = (query ?? "").trim();
  // Already Hebrew, or the Hebrew UI — nothing to translate.
  if (!q || locale === "he" || HE_RANGE.test(q)) return q;

  const key = `${locale}:${q}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const sl = locale === "ru" ? "ru" : locale === "ar" ? "ar" : "en";
  const he = await gtxTranslate(q, { sl, tl: "iw", timeoutMs: 5000 });
  const out = he || q; // fall back to the original query on any failure
  if (cache.size > 500) cache.clear(); // simple cap
  cache.set(key, out);
  return out;
}

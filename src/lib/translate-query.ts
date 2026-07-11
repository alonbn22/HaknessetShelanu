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
import { isHebrew } from "./text";

// LRU-ish success cache (Map keeps insertion order; a hit is re-inserted to mark
// it recent, and we evict the oldest when full — so hot queries survive instead
// of the old wholesale clear()).
const CACHE_MAX = 500;
const cache = new Map<string, string>();

// Token bucket over the outbound Google-translate calls: every unique non-Hebrew
// ?q= would otherwise trigger one server-side fetch, so a bot sending random
// queries could use the site as an unauthenticated translation proxy/amplifier.
// When the bucket is empty we skip translation — search still works against the
// locale column. Per server instance; refills continuously.
const BUCKET_MAX = 30;
const REFILL_PER_SEC = 1;
let tokens = BUCKET_MAX;
let lastRefill = Date.now();
function takeToken(): boolean {
  const now = Date.now();
  tokens = Math.min(BUCKET_MAX, tokens + ((now - lastRefill) / 1000) * REFILL_PER_SEC);
  lastRefill = now;
  if (tokens >= 1) {
    tokens -= 1;
    return true;
  }
  return false;
}

// At least one letter (any script)? Pure digits/punctuation — a bill number, a
// year — never need translating, so don't spend a token on them.
const HAS_LETTER = /\p{L}/u;

export async function translateQueryToHebrew(
  query: string | undefined | null,
  locale: string,
): Promise<string> {
  // Cap the length: a search query has no business being longer, and the cap
  // bounds both the gtx fetch payload and the LIKE scans downstream.
  const q = (query ?? "").trim().slice(0, 200);
  // Already Hebrew, the Hebrew UI, or nothing to translate.
  if (!q || locale === "he" || isHebrew(q) || !HAS_LETTER.test(q)) return q;

  const key = `${locale}:${q}`;
  const hit = cache.get(key);
  if (hit !== undefined) {
    cache.delete(key); // re-insert as most-recently-used
    cache.set(key, hit);
    return hit;
  }
  // Rate-limited: skip translation (don't cache, so it can retry once refilled).
  if (!takeToken()) return q;

  const sl = locale === "ru" ? "ru" : locale === "ar" ? "ar" : "en";
  const he = await gtxTranslate(q, { sl, tl: "iw", timeoutMs: 5000 });
  // Cache only successes — a transient failure shouldn't be pinned as "no
  // translation" for the life of the process.
  if (!he) return q;
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, he);
  return he;
}

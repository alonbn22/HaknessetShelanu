// Server-only: translate a search query to Hebrew so it matches the always-
// populated Hebrew titles even when a row's translated title is missing. Cached
// in-memory per (locale, query); on any failure returns the original query so
// search still works against the locale column. Performs a network fetch.

import { gtxTranslate } from "./gtx";
import { isHebrew } from "./text";

// LRU-ish success cache: Map preserves insertion order; hits are re-inserted and
// the oldest is evicted when full, so hot queries survive.
const CACHE_MAX = 500;
const cache = new Map<string, string>();

// Token bucket over outbound translate calls: without it a bot sending random ?q=
// could use the site as an unauthenticated translation proxy/amplifier. When empty
// we skip translation (search still works against the locale column).
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

// Pure digits/punctuation (bill number, year) never need translating — don't
// spend a token on them.
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

  const sl = locale === "ru" ? "ru" : locale === "ar" ? "ar" : locale === "es" ? "es" : locale === "fr" ? "fr" : "en";
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

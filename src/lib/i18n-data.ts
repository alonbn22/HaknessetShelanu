// Unified data-translation layer: one dedup cache (`translations`) keyed by the
// Hebrew source, shared across ALL data. Read-only: nothing is translated or
// written at request time — a miss renders in Hebrew, marked as Hebrew, until a
// translation batch is imported into the DB. No per-table columns.
// Server-only (DB). Enumerated UI terms live in gov-terms.ts.

import { inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { govCommittee } from "./gov-terms";

const RTL = /[\u0590-\u06ff]/; // Hebrew or Arabic → render rtl
const T = schema.translations;
const COL = { en: T.en, ar: T.ar, ru: T.ru, es: T.es, fr: T.fr } as const;

// `lang` is set only when the text is in neither the page's language nor Hebrew:
// the English fallback below.
export type Localized = { text: string; translated: boolean; rtl: boolean; lang?: "en" };
const hebrew = (he: string): Localized => ({ text: he, translated: false, rtl: true });

// Resolve many Hebrew strings → the active locale (one batched query).
export function localizeData(
  heList: (string | null | undefined)[],
  locale: string,
): Map<string, Localized> {
  const map = new Map<string, Localized>();
  const uniq = [...new Set(heList.filter((s): s is string => !!s && s.trim() !== "").map((s) => s.trim()))];
  const col = COL[locale as keyof typeof COL];
  if (locale === "he" || !col) {
    for (const he of uniq) map.set(he, hebrew(he));
    return map;
  }
  const found = new Map<string, { tr: string | null; en: string | null }>();
  for (let i = 0; i < uniq.length; i += 400) {
    const chunk = uniq.slice(i, i + 400);
    const rows = getDb()
      .select({ he: T.sourceHe, tr: col, en: T.en })
      .from(T)
      .where(inArray(T.sourceHe, chunk))
      .all();
    for (const r of rows) found.set(r.he, r);
  }
  for (const he of uniq) {
    const f = found.get(he);
    if (f?.tr) map.set(he, { text: f.tr, translated: true, rtl: RTL.test(f.tr) });
    // Not in the page's language yet: English reads for every other audience
    // where Hebrew does not, and is marked as English.
    else if (f?.en) map.set(he, { text: f.en, translated: true, rtl: false, lang: "en" });
    else map.set(he, hebrew(he));
  }
  return map;
}

// Per-page convenience: build the cache for a page's Hebrew strings. Returns the
// cache + a bound `loc(he)`.
export function localizePage(heList: (string | null | undefined)[], locale: string) {
  const cache = localizeData(heList, locale);
  const loc = (he: string | null | undefined) => resolveLocalized(cache, he);
  return { cache, loc };
}

// Resolve one Hebrew string against a localizeData() map (the common per-page
// pattern): cache hit, else the Hebrew RTL fallback. Empty input → empty/LTR.
export function resolveLocalized(
  map: Map<string, Localized>,
  he: string | null | undefined,
): Localized {
  const key = (he ?? "").trim();
  if (!key) return { text: "", translated: false, rtl: false };
  return map.get(key) ?? hebrew(key);
}

// Committee names: prefer the curated standing-committee translation (gov-terms),
// else the unified cache. `cache` is a localizeData() map for the page's names.
export function committeeLabel(
  he: string | null | undefined,
  locale: string,
  cache: Map<string, Localized>,
): Localized {
  const key = (he ?? "").trim();
  if (!key) return { text: "", translated: false, rtl: false };
  if (locale === "he") return hebrew(key);
  const curated = govCommittee(key, locale);
  if (curated.text && !curated.rtl) return { text: curated.text, translated: true, rtl: false };
  return cache.get(key) ?? hebrew(key);
}

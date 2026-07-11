// Unified data-translation layer. One deduplicated cache (`translations`), keyed
// by the Hebrew source string and shared across ALL data (vote titles, law names,
// committees, budget lines, …). Resolve from cache; translate misses lazily in
// Next's after() and cache them. New data auto-translates on first view — no
// per-table columns, no manual backfill.
//
// Server-only (DB + network). Enumerated UI terms (ministries, duties, vote
// types) stay in gov-terms.ts; this handles free-text names.

import { and, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { govCommittee } from "./gov-terms";
import { gtxTranslate } from "./gtx";

const RTL = /[\u0590-\u06ff]/; // Hebrew or Arabic → render rtl
const T = schema.translations;
const COL = { en: T.en, ar: T.ar, ru: T.ru } as const;
const FIELD = { en: "en", ar: "ar", ru: "ru" } as const;

export type Localized = { text: string; translated: boolean; rtl: boolean };
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
  const found = new Map<string, string>();
  for (let i = 0; i < uniq.length; i += 400) {
    const chunk = uniq.slice(i, i + 400);
    const rows = getDb()
      .select({ he: T.sourceHe, tr: col })
      .from(T)
      .where(inArray(T.sourceHe, chunk))
      .all();
    for (const r of rows) if (r.tr) found.set(r.he, r.tr);
  }
  for (const he of uniq) {
    const tr = found.get(he);
    map.set(he, tr ? { text: tr, translated: true, rtl: RTL.test(tr) } : hebrew(he));
  }
  return map;
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

// ---- on-demand translation (called from after(), post-response) ----

const MAX_PER_REQUEST = 100;
const CONCURRENCY = 8;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const translateOne = (text: string, target: string) =>
  gtxTranslate(text, { sl: "iw", tl: target, timeoutMs: 8000 });

// Translate + cache the Hebrew strings shown on a page that lack the active
// locale. Safe to call from after(); bounded; degrades silently on read-only FS.
export async function queueDataTranslations(
  heList: (string | null | undefined)[],
  locale: string,
): Promise<void> {
  const col = COL[locale as keyof typeof COL];
  const field = FIELD[locale as keyof typeof FIELD];
  if (!col) return;
  const uniq = [...new Set(heList.filter((s): s is string => !!s && s.trim() !== "").map((s) => s.trim()))];
  if (uniq.length === 0) return;

  const db = getDb();
  try {
    db.run(
      sql`CREATE TABLE IF NOT EXISTS translations (source_he text PRIMARY KEY, en text, ar text, ru text)`,
    );
    const have = new Set(
      db
        .select({ he: T.sourceHe })
        .from(T)
        .where(and(inArray(T.sourceHe, uniq), isNotNull(col)))
        .all()
        .map((r) => r.he),
    );
    const missing = uniq.filter((n) => !have.has(n)).slice(0, MAX_PER_REQUEST);
    if (missing.length === 0) return;

    let i = 0;
    const worker = async () => {
      while (i < missing.length) {
        const src = missing[i++];
        const tr = await translateOne(src, locale);
        if (tr) {
          db.insert(T)
            .values({ sourceHe: src, [field]: tr })
            .onConflictDoUpdate({ target: T.sourceHe, set: { [field]: tr } })
            .run();
        }
        await sleep(50);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, missing.length) }, worker));
  } catch {
    /* read-only FS / transient — page already rendered with Hebrew fallback */
  }
}

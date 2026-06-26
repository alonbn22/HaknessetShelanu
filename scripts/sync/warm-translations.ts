// Pre-warm the unified translation cache so non-Hebrew locales ship fully
// translated instead of filling in lazily on first view. Gathers every Hebrew
// free-text string the site renders, and for each target locale translates the
// ones missing from the `translations` cache (gtx, with retry/backoff) and
// stores them. Safe to re-run — only missing strings are translated.
//
//   npm run warm            warm en, ar, ru
//   npm run warm -- en      warm only en
import { and, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb, schema } from "../../src/db";
import { gtxTranslate } from "../../src/lib/gtx";

const ALL_LOCALES = ["en", "ar", "ru"] as const;
type Loc = (typeof ALL_LOCALES)[number];
const COL = { en: schema.translations.en, ar: schema.translations.ar, ru: schema.translations.ru };
const FIELD = { en: "en", ar: "ar", ru: "ru" } as const;
const CONCURRENCY = 8;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function gatherSources(): string[] {
  const db = getDb();
  const set = new Set<string>();
  const add = (s?: string | null) => {
    const t = (s ?? "").trim();
    if (t) set.add(t);
  };
  const addJoined = (s?: string | null) => (s ?? "").split(" · ").forEach(add);

  for (const r of db.select({ a: schema.votes.titleHe, b: schema.votes.itemName }).from(schema.votes).all()) {
    add(r.a);
    add(r.b);
  }
  for (const r of db.select({ a: schema.bills.nameHe }).from(schema.bills).all()) add(r.a);
  for (const r of db.select({ a: schema.queries.nameHe }).from(schema.queries).all()) add(r.a);
  for (const r of db.select({ a: schema.israelLaws.nameHe }).from(schema.israelLaws).all()) add(r.a);
  for (const r of db.select({ a: schema.committees.nameHe }).from(schema.committees).all()) add(r.a);
  for (const r of db
    .select({ a: schema.personPositions.factionNameHe, b: schema.personPositions.committeeNameHe })
    .from(schema.personPositions)
    .all()) {
    add(r.a);
    add(r.b);
  }
  for (const r of db.select().from(schema.personBio).all()) {
    add(r.birthPlaceHe);
    addJoined(r.educationHe);
    addJoined(r.occupationsHe);
    addJoined(r.militaryHe);
    try {
      for (const c of JSON.parse(r.careerJson ?? "[]") as { title: string }[]) add(c.title);
    } catch {
      /* ignore malformed */
    }
  }
  for (const r of db.select({ a: schema.lobbyists.permitType }).from(schema.lobbyists).all()) add(r.a);
  for (const r of db
    .select({
      a: schema.budgetLines.sectionNameHe,
      b: schema.budgetLines.areaNameHe,
      c: schema.budgetLines.programNameHe,
      d: schema.budgetLines.takanaNameHe,
    })
    .from(schema.budgetLines)
    .all()) {
    add(r.a);
    add(r.b);
    add(r.c);
    add(r.d);
  }
  return [...set];
}

async function warmLocale(locale: Loc, all: string[]) {
  const db = getDb();
  const col = COL[locale];
  const field = FIELD[locale];
  // Which sources already have this locale cached?
  const have = new Set<string>();
  for (let i = 0; i < all.length; i += 400) {
    const chunk = all.slice(i, i + 400);
    db.select({ he: schema.translations.sourceHe })
      .from(schema.translations)
      .where(and(inArray(schema.translations.sourceHe, chunk), isNotNull(col)))
      .all()
      .forEach((r) => have.add(r.he));
  }
  const missing = all.filter((s) => !have.has(s));
  console.log(`[${locale}] ${all.length} sources, ${missing.length} to translate`);

  let i = 0;
  let ok = 0;
  const worker = async () => {
    while (i < missing.length) {
      const src = missing[i++];
      let tr = await gtxTranslate(src, { sl: "iw", tl: locale, timeoutMs: 8000 });
      if (!tr) {
        await sleep(600); // backoff once on failure / throttling
        tr = await gtxTranslate(src, { sl: "iw", tl: locale, timeoutMs: 8000 });
      }
      if (tr) {
        db.insert(schema.translations)
          .values({ sourceHe: src, [field]: tr })
          .onConflictDoUpdate({ target: schema.translations.sourceHe, set: { [field]: tr } })
          .run();
        ok++;
      }
      if (i % 200 === 0) console.log(`  [${locale}] ${i}/${missing.length} (${ok} translated)`);
      await sleep(40);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`[${locale}] done — ${ok}/${missing.length} translated`);
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const locales = (args.length ? args : ALL_LOCALES).filter((l): l is Loc =>
    (ALL_LOCALES as readonly string[]).includes(l),
  );
  const started = Date.now();
  const all = gatherSources();
  console.log(`Gathered ${all.length} distinct Hebrew strings; warming ${locales.join(", ")}`);
  for (const loc of locales) await warmLocale(loc, all);
  getDb().run(sql`PRAGMA wal_checkpoint(TRUNCATE)`);
  console.log(`Warm finished in ${Math.round((Date.now() - started) / 1000)}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

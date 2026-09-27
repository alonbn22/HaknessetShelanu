// Pre-warm the unified translation cache so non-Hebrew locales ship fully
// translated: the site itself never translates (a miss shows in Hebrew, marked).
// Gathers every Hebrew free-text string the site renders and translates the
// ones missing per locale (gtx). Safe to re-run. Then `npm run db:clean`.
//
//   npm run warm            warm every locale (en, ar, ru, es, fr)
//   npm run warm -- en      warm only en
import { and, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb, schema } from "../../src/db";
import { gtxTranslate } from "./gtx";
import { getElectionOutlook, getPolls } from "../../src/lib/content";

const ALL_LOCALES = ["en", "ar", "ru", "es", "fr"] as const;
type Loc = (typeof ALL_LOCALES)[number];
const COL = { en: schema.translations.en, ar: schema.translations.ar, ru: schema.translations.ru, es: schema.translations.es, fr: schema.translations.fr };
const FIELD = { en: "en", ar: "ar", ru: "ru", es: "es", fr: "fr" } as const;
// Gentle on the free endpoint: bursts (8 at once) got the IP throttled for hours.
const CONCURRENCY = 2;
const PAUSE_MS = 300;
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
  for (const r of db.select({ a: schema.lobbyists.permitType, b: schema.lobbyists.corporationName, c: schema.lobbyists.practiceFramework }).from(schema.lobbyists).all()) {
    add(r.a);
    add(r.b);
    add(r.c);
  }
  // Every other field a page displays. Not here: document file names (never
  // shown — pages show the document type) and people's names, which machine
  // translation garbles (MK names come from the Knesset's own directory).
  for (const r of db.select({ a: schema.lobbyistClients.clientName, b: schema.lobbyistClients.representation }).from(schema.lobbyistClients).all()) {
    add(r.a);
    add(r.b);
  }
  for (const r of db.select({ a: schema.votes.forDesc, b: schema.votes.againstDesc, c: schema.votes.itemTypeDesc }).from(schema.votes).all()) {
    add(r.a);
    add(r.b);
    add(r.c);
  }
  for (const r of db.select({ a: schema.bills.subTypeDesc, b: schema.bills.statusDesc }).from(schema.bills).all()) {
    add(r.a);
    add(r.b);
  }
  for (const r of db.select({ a: schema.queries.typeDesc }).from(schema.queries).all()) add(r.a);
  for (const r of db.select({ a: schema.israelLaws.validityDesc }).from(schema.israelLaws).all()) add(r.a);
  for (const r of db.select({ a: schema.personPositions.govMinistryNameHe, b: schema.personPositions.positionDescHe }).from(schema.personPositions).all()) {
    add(r.a);
    add(r.b);
  }
  for (const r of db.select({ a: schema.agendas.nameHe, b: schema.agendas.subTypeDesc, c: schema.agendas.classificationDesc }).from(schema.agendas).all()) {
    add(r.a);
    add(r.b);
    add(r.c);
  }
  for (const r of db.select({ a: schema.committeeSessions.typeDesc, b: schema.committeeSessions.statusDesc, c: schema.committeeSessions.location }).from(schema.committeeSessions).all()) {
    add(r.a);
    add(r.b);
    add(r.c);
  }
  for (const r of db.select({ a: schema.committeeSessionItems.nameHe }).from(schema.committeeSessionItems).all()) add(r.a);
  for (const r of db.select({ a: schema.committeeSessionDocs.groupTypeDesc }).from(schema.committeeSessionDocs).all()) add(r.a);
  // The CEC's list and party names in content/election.yaml (data text too).
  const outlook = getElectionOutlook();
  for (const p of outlook?.parties ?? []) {
    add(p.cec?.listName.he);
    (p.cec?.submittedBy ?? []).forEach(add);
  }
  for (const p of getPolls()?.polls ?? []) add(p.belowThresholdNote);
  for (const l of outlook?.submittedLists?.lists ?? []) {
    add(l.name.he);
    (l.submittedBy ?? []).forEach(add);
    (l.candidates ?? []).forEach((c) => add(c.party));
  }
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
  let fails = 0; // in a row — gtx answers 429 for hours once it throttles
  const worker = async () => {
    while (i < missing.length) {
      const src = missing[i++];
      let tr = await gtxTranslate(src, { sl: "iw", tl: locale, timeoutMs: 8000 });
      if (!tr) {
        await sleep(30_000); // back off hard on failure / throttling, then retry once
        tr = await gtxTranslate(src, { sl: "iw", tl: locale, timeoutMs: 8000 });
      }
      if (tr) {
        db.insert(schema.translations)
          .values({ sourceHe: src, [field]: tr })
          .onConflictDoUpdate({ target: schema.translations.sourceHe, set: { [field]: tr } })
          .run();
        ok++;
        fails = 0;
      } else if (++fails >= 10) {
        console.log(`  [${locale}] 10 failures in a row — the endpoint is throttling; stopping (re-run later, it resumes)`);
        i = missing.length;
      }
      if (i % 200 === 0) console.log(`  [${locale}] ${i}/${missing.length} (${ok} translated)`);
      await sleep(PAUSE_MS);
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
  // This batch is the cache's only writer, so it self-heals the table (house
  // rule: the same definition as src/db/schema.ts; ddl-parity.test.ts checks).
  getDb().run(
    sql`CREATE TABLE IF NOT EXISTS translations (source_he text PRIMARY KEY NOT NULL, en text, ar text, ru text, es text, fr text)`,
  );
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

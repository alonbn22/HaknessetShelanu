// The translation cache's two hand tools. Nothing here calls an outside
// service: since 27 Sep 2026 (owner's decision) data text is never machine-
// translated on the fly, and Google's unofficial endpoint, whose terms forbid
// automated use, was removed on 3 Oct 2026. A miss shows in Hebrew, marked.
//
//   npm run translations:export -- <out.json> [en ar ru es fr]
//       every Hebrew string the site shows that lacks one of those languages
//   npm run translations:import -- <batch.json> [--overwrite]
//       write a translated, checked batch into the cache; then `npm run db:clean`
//
// A batch is a JSON array of { he, en?, ar?, ru?, es?, fr? }. Export writes
// `he`, the languages it `needs` and the cached English as a hint; the
// translator fills the needed languages; import writes only empty cells unless
// --overwrite, refuses a "translation" that still holds Hebrew, and adds the
// French no-break spaces.
import fs from "node:fs";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "../../src/db";
import { getElectionOutlook, getPolls } from "../../src/lib/content";

const ALL_LOCALES = ["en", "ar", "ru", "es", "fr"] as const;
type Loc = (typeof ALL_LOCALES)[number];
type Row = { he: string } & Partial<Record<Loc, string>>;

function gatherSources(): string[] {
  const db = getDb();
  const set = new Set<string>();
  const add = (s?: string | null) => {
    const t = (s ?? "").trim();
    if (t) set.add(t);
  };

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
  // Members' background, one item per line: the Knesset serves it in en/ar/ru
  // itself, so these lines fill es/fr and its gaps. Absent before the first sync.
  try {
    for (const r of db.select().from(schema.personKnessetBio).where(eq(schema.personKnessetBio.lang, "he")).all()) {
      for (const s of [r.birthPlace, r.education, r.professions, r.militaryService]) (s ?? "").split("\n").forEach(add);
    }
  } catch {
    /* table not created yet */
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

function cached() {
  return new Map(getDb().select().from(schema.translations).all().map((r) => [r.sourceHe, r]));
}

function exportBatch(out: string, locales: Loc[]) {
  const have = cached();
  const rows = gatherSources().flatMap((he) => {
    const r = have.get(he);
    const needs = locales.filter((l) => !r?.[l]);
    return needs.length ? [{ he, needs, ...(r?.en ? { en: r.en } : {}) }] : [];
  });
  fs.writeFileSync(out, JSON.stringify(rows, null, 1) + "\n");
  console.log(`${rows.length} strings need ${locales.join("/")} -> ${out}`);
}

const HEBREW = /[\u0590-\u05ff]/;
const frenchSpaces = (s: string) => s.replace(/ ([;:!?»])/g, "\u00a0$1").replace(/« /g, "«\u00a0");

function importBatch(file: string, overwrite: boolean) {
  const db = getDb();
  // The cache's only writer, so it self-heals the table (house rule: the same
  // definition as src/db/schema.ts; ddl-parity.test.ts checks).
  db.run(
    sql`CREATE TABLE IF NOT EXISTS translations (source_he text PRIMARY KEY NOT NULL, en text, ar text, ru text, es text, fr text)`,
  );
  const have = cached();
  const rows = JSON.parse(fs.readFileSync(file, "utf8")) as Row[];
  let cells = 0;
  const refused: string[] = [];
  for (const row of rows) {
    const he = row.he?.trim();
    if (!he) continue;
    const cur = have.get(he);
    const set: Partial<Record<Loc, string>> = {};
    for (const l of ALL_LOCALES) {
      const v = row[l]?.trim();
      if (!v || (cur?.[l] && !overwrite)) continue;
      if (HEBREW.test(v)) refused.push(`${he} [${l}]: ${v}`);
      else set[l] = l === "fr" ? frenchSpaces(v) : v;
    }
    if (Object.keys(set).length === 0) continue;
    if (cur) db.update(schema.translations).set(set).where(eq(schema.translations.sourceHe, he)).run();
    else db.insert(schema.translations).values({ sourceHe: he, ...set }).run();
    cells += Object.keys(set).length;
  }
  db.run(sql`PRAGMA wal_checkpoint(TRUNCATE)`);
  console.log(`${rows.length} rows read, ${cells} cells written${overwrite ? " (overwrite)" : ""}.`);
  if (refused.length) console.log(`Refused (still Hebrew):\n  ${refused.join("\n  ")}`);
  console.log("Next: npm run db:clean, check the pages, then npm run db:publish.");
}

const [cmd, file, ...rest] = process.argv.slice(2);
if (cmd === "export" && file) {
  const asked = rest.filter((a): a is Loc => (ALL_LOCALES as readonly string[]).includes(a));
  exportBatch(file, asked.length ? asked : [...ALL_LOCALES]);
} else if (cmd === "import" && file) {
  importBatch(file, rest.includes("--overwrite"));
} else {
  console.error("usage: translations.ts export <out.json> [locales…] | import <batch.json> [--overwrite]");
  process.exit(1);
}

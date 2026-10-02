// Members' background (born, birthplace, education, occupation, military
// service) from the Knesset's own member pages. The page
// main.knesset.gov.il/mk/apps/mk/mk-personal-details/<mkSiteCode> loads it from
//   www.knesset.gov.il/WebSiteApi/knessetapi/MKs/GetMkDetailsContent?mkId=<mkSiteCode>&languageKey=<lang>
// one call per language. mkSiteCode is persons.mk_site_code (KNS_MkSiteCode,
// stored by the members sync). The Knesset serves he/en/ar/ru; es/fr come back
// with every text field empty, and the newest members have only Hebrew so far.
// Each language is stored in the Knesset's own words, only tidied: entities
// decoded, list dashes and blank lines dropped, one item per line. The member
// page reads it (getKnessetBio).
import { eq, isNotNull, sql } from "drizzle-orm";
import { getDb, schema } from "../../src/db";
import { fetchRetry } from "./odata";

const API = "https://www.knesset.gov.il/WebSiteApi/knessetapi/MKs/GetMkDetailsContent";
export const LANGS = ["he", "en", "ar", "ru"] as const;
const USER_AGENT =
  "HaknessetShelanu/1.0 (https://github.com/alonbn22/HaknessetShelanu; civic transparency site)";
const PAUSE_MS = 300; // between requests: one at a time, about two a second
const MAX_FAILURES = 3; // members in a row: the site is down, keep what is stored

// The fields used, as GetMkDetailsContent names them (it also sends residence,
// languages, a long biography essay and more, which the site doesn't show).
// `profession` is always null; ProfessionsDetails carries the occupations.
export type MkDetails = {
  DateOfBirth?: string | null;
  PlaceOfBirth?: string | null;
  Education?: string | null;
  ProfessionsDetails?: string | null;
  MilitaryService?: string | null;
} | null;

type Row = typeof schema.personKnessetBio.$inferInsert;

const NAMED: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };

// The served text, tidied: "&#x0D;"-style entities decoded, one trimmed item per
// line without its leading list dash, blank lines dropped. Null when empty.
export function tidy(s: string | null | undefined): string | null {
  const text = (s ?? "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) =>
      e[0] !== "#"
        ? (NAMED[e.toLowerCase()] ?? m)
        : String.fromCodePoint(/^#x/i.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)),
    )
    .split(/\r\n?|\n/)
    .map((line) => line.replace(/\s+/g, " ").replace(/^[\s,_*•·\-–—]+/, "").trim())
    .filter(Boolean)
    .join("\n");
  return text || null;
}

// "<Hebrew calendar date> , 03/04/1971" → "1971-04-03". Only the Hebrew page
// ends with dd/mm/yyyy; an impossible date is dropped, never rolled over.
export function isoBirthDate(s: string | null | undefined): string | null {
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(s ?? "");
  if (!m) return null;
  const iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(iso) ? iso : null;
}

// One member's responses (by language) → the rows to store. A language the
// Knesset has nothing in (null, or all fields empty) gets no row.
export function toRows(personId: number, byLang: Partial<Record<string, MkDetails>>, now: string): Row[] {
  const dateOfBirth = isoBirthDate(byLang.he?.DateOfBirth);
  return LANGS.flatMap((lang) => {
    const d = byLang[lang];
    if (!d) return [];
    const fields = {
      birthPlace: tidy(d.PlaceOfBirth),
      education: tidy(d.Education),
      professions: tidy(d.ProfessionsDetails),
      militaryService: tidy(d.MilitaryService),
    };
    if (!dateOfBirth && !Object.values(fields).some(Boolean)) return [];
    return [{ personId, lang, dateOfBirth, ...fields, lastUpdated: now }];
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchDetails(siteCode: number, lang: string): Promise<MkDetails> {
  const res = await fetchRetry(
    `${API}?mkId=${siteCode}&languageKey=${lang}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } },
    { retries: 2, timeoutMs: 30_000 },
  );
  return (await res.json()) as MkDetails;
}

export async function syncKnessetBio() {
  const db = getDb();
  // Same definition as src/db/schema.ts (tests/qa/ddl-parity.test.ts checks).
  db.run(sql`CREATE TABLE IF NOT EXISTS person_knesset_bio (
    person_id integer NOT NULL,
    lang text NOT NULL,
    date_of_birth text,
    birth_place text,
    education text,
    professions text,
    military_service text,
    last_updated text,
    PRIMARY KEY (person_id, lang)
  )`);

  const people = db
    .select({ id: schema.persons.id, siteCode: schema.persons.mkSiteCode })
    .from(schema.persons)
    .where(isNotNull(schema.persons.mkSiteCode))
    .all();
  console.log(`Syncing background for ${people.length} members from their Knesset pages…`);

  // Fetch everything first and write once: a run that fails half-way, or finds
  // the endpoint changed, leaves the stored rows as they were.
  const now = new Date().toISOString();
  const fetched = new Map<number, Row[]>();
  let failures = 0;
  for (const p of people) {
    const byLang: Record<string, MkDetails> = {};
    try {
      for (const lang of LANGS) {
        byLang[lang] = await fetchDetails(p.siteCode!, lang);
        await sleep(PAUSE_MS);
      }
      failures = 0;
    } catch (e) {
      console.warn(`  person ${p.id} (site code ${p.siteCode}): ${(e as Error).message}`);
      if (++failures >= MAX_FAILURES) throw new Error(`the Knesset member pages are not answering: ${(e as Error).message}`);
      continue;
    }
    fetched.set(p.id, toRows(p.id, byLang, now));
    if (fetched.size % 40 === 0) console.log(`  ${fetched.size}/${people.length}`);
  }

  const withData = [...fetched.values()].filter((rows) => rows.length > 0).length;
  if (withData < fetched.size / 2) {
    throw new Error(`only ${withData} of ${fetched.size} members came back with any data; the endpoint may have changed`);
  }
  // Replace each fetched member's rows whole, so a field the Knesset removed goes too.
  db.transaction((tx) => {
    for (const [personId, rows] of fetched) {
      tx.delete(schema.personKnessetBio).where(eq(schema.personKnessetBio.personId, personId)).run();
      if (rows.length) tx.insert(schema.personKnessetBio).values(rows).run();
    }
  });
  console.log(`  ${withData} of ${people.length} members have background from the Knesset`);
}

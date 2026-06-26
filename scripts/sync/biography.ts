// Pulls each member's structured biography from Wikidata (the full-history
// backbone): date/place of birth, education, occupations, military service, and
// a dated career timeline (positions held). Keyed by the QID captured during
// the Wikidata enrich step. Free-text values are stored in Hebrew where
// available so they localize via the unified on-the-fly translation cache.
//
// Sourced to the linked Wikidata entity (shown + linked on the member page).
import { sql } from "drizzle-orm";
import { getDb, schema } from "../../src/db";

const USER_AGENT =
  "HaKnessetSheli/1.0 (https://github.com/alonbn22/HaKnessetSheli; civic transparency site)";
const ENDPOINT = "https://query.wikidata.org/sparql";
const BATCH = 40;

type Career = { title: string; start: string | null; end: string | null };

async function runSparql(query: string): Promise<Record<string, { value: string }>[]> {
  const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/sparql-results+json" },
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Wikidata SPARQL HTTP ${res.status}`);
  const data = (await res.json()) as { results: { bindings: Record<string, { value: string }>[] } };
  return data.results.bindings;
}

const values = (qids: string[]) => qids.map((q) => `wd:${q}`).join(" ");
const isoDate = (s?: string) => (s ? s.slice(0, 10) : null);
const splitCap = (s: string | undefined, n: number) =>
  (s ?? "")
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, n)
    .join(" · ");

// Single-valued facts + grouped multi-valued lists (education, occupation,
// military). Labels prefer Hebrew, falling back to English.
const FACTS = (qids: string[]) => `
SELECT ?item ?dob (SAMPLE(?bpHe) AS ?bp_he) (SAMPLE(?bpEn) AS ?bp_en)
  (GROUP_CONCAT(DISTINCT ?eduL; separator="|") AS ?education)
  (GROUP_CONCAT(DISTINCT ?occL; separator="|") AS ?occupations)
  (GROUP_CONCAT(DISTINCT ?milL; separator="|") AS ?military)
WHERE {
  VALUES ?item { ${values(qids)} }
  OPTIONAL { ?item wdt:P569 ?dob. }
  OPTIONAL { ?item wdt:P19 ?bp.
    OPTIONAL { ?bp rdfs:label ?bpHe FILTER(LANG(?bpHe)="he") }
    OPTIONAL { ?bp rdfs:label ?bpEn FILTER(LANG(?bpEn)="en") } }
  OPTIONAL { ?item wdt:P69 ?edu.
    OPTIONAL { ?edu rdfs:label ?eduHe FILTER(LANG(?eduHe)="he") }
    OPTIONAL { ?edu rdfs:label ?eduEn FILTER(LANG(?eduEn)="en") }
    BIND(COALESCE(?eduHe, ?eduEn) AS ?eduL) }
  OPTIONAL { ?item wdt:P106 ?occ.
    OPTIONAL { ?occ rdfs:label ?occHe FILTER(LANG(?occHe)="he") }
    OPTIONAL { ?occ rdfs:label ?occEn FILTER(LANG(?occEn)="en") }
    BIND(COALESCE(?occHe, ?occEn) AS ?occL) }
  OPTIONAL { ?item wdt:P241 ?mil.
    OPTIONAL { ?mil rdfs:label ?milHe FILTER(LANG(?milHe)="he") }
    OPTIONAL { ?mil rdfs:label ?milEn FILTER(LANG(?milEn)="en") }
    BIND(COALESCE(?milHe, ?milEn) AS ?milL) }
}
GROUP BY ?item ?dob`;

// Positions held (P39) with start/end qualifiers — the career timeline.
const CAREER = (qids: string[]) => `
SELECT ?item ?posHe ?posEn ?start ?end WHERE {
  VALUES ?item { ${values(qids)} }
  ?item p:P39 ?st. ?st ps:P39 ?pos.
  OPTIONAL { ?st pq:P580 ?start. }
  OPTIONAL { ?st pq:P582 ?end. }
  OPTIONAL { ?pos rdfs:label ?posHe FILTER(LANG(?posHe)="he") }
  OPTIONAL { ?pos rdfs:label ?posEn FILTER(LANG(?posEn)="en") }
}`;

const qid = (uri: string) => uri.split("/entity/")[1] ?? uri;

export async function syncBiography() {
  const db = getDb();
  console.log("Syncing biographies from Wikidata…");
  db.run(
    sql`CREATE TABLE IF NOT EXISTS person_bio (
      person_id integer PRIMARY KEY,
      wikidata_id text, date_of_birth text, birth_place_he text,
      education_he text, occupations_he text, military_he text,
      career_json text, last_updated text
    )`,
  );

  const people = db
    .select({ id: schema.persons.id, qid: schema.persons.wikidataId })
    .from(schema.persons)
    .all()
    .filter((p): p is { id: number; qid: string } => !!p.qid);
  const byQid = new Map(people.map((p) => [p.qid, p.id]));
  console.log(`  ${people.length} persons with a Wikidata id`);

  const now = new Date().toISOString();
  let written = 0;

  for (let i = 0; i < people.length; i += BATCH) {
    const batch = people.slice(i, i + BATCH).map((p) => p.qid);

    const facts = new Map<string, Record<string, { value: string }>>();
    for (const r of await runSparql(FACTS(batch))) facts.set(qid(r.item.value), r);

    const careers = new Map<string, Career[]>();
    for (const r of await runSparql(CAREER(batch))) {
      const id = qid(r.item.value);
      const title = (r.posHe?.value || r.posEn?.value || "").trim();
      if (!title) continue;
      const list = careers.get(id) ?? [];
      list.push({ title, start: isoDate(r.start?.value), end: isoDate(r.end?.value) });
      careers.set(id, list);
    }

    for (const q of batch) {
      const personId = byQid.get(q);
      if (personId == null) continue;
      const f = facts.get(q);
      // Dedupe + sort the career timeline (most recent first), cap the list.
      const seen = new Set<string>();
      const career = (careers.get(q) ?? [])
        .filter((c) => {
          const k = `${c.title}|${c.start}|${c.end}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .sort((a, b) => (b.start ?? "").localeCompare(a.start ?? ""))
        .slice(0, 14);

      db.run(
        sql`INSERT INTO person_bio
          (person_id, wikidata_id, date_of_birth, birth_place_he, education_he, occupations_he, military_he, career_json, last_updated)
          VALUES (${personId}, ${q}, ${isoDate(f?.dob?.value)}, ${f?.bp_he?.value || f?.bp_en?.value || null},
            ${splitCap(f?.education?.value, 4) || null}, ${splitCap(f?.occupations?.value, 5) || null},
            ${splitCap(f?.military?.value, 3) || null}, ${career.length ? JSON.stringify(career) : null}, ${now})
          ON CONFLICT(person_id) DO UPDATE SET
            wikidata_id=excluded.wikidata_id, date_of_birth=excluded.date_of_birth,
            birth_place_he=excluded.birth_place_he, education_he=excluded.education_he,
            occupations_he=excluded.occupations_he, military_he=excluded.military_he,
            career_json=excluded.career_json, last_updated=excluded.last_updated`,
      );
      written++;
    }
    console.log(`  ${Math.min(i + BATCH, people.length)}/${people.length}`);
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log(`  ${written} biographies written`);
}

import { canonicalCommonsUrl } from "../../src/lib/text";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../../src/db";
import { fetchRetry } from "./odata";

const USER_AGENT =
  "HaKnessetSheli/1.0 (https://github.com/alonbn22/HaKnessetSheli; civic transparency site)";

// One SPARQL query: everyone who ever held the position "Knesset member"
// (plus anyone carrying a Knesset member website ID), with labels in our
// four languages, photo, and Hebrew Wikipedia article.
const SPARQL = `
SELECT ?item ?siteId ?labelHe ?labelEn ?labelAr ?labelRu ?image ?heArticle WHERE {
  { ?item p:P39/ps:P39 wd:Q4047513 . } UNION { ?item wdt:P9770 ?anyId . }
  OPTIONAL { ?item wdt:P9770 ?siteId . }
  OPTIONAL { ?item wdt:P18 ?image . }
  OPTIONAL { ?item rdfs:label ?labelHe FILTER(LANG(?labelHe) = "he") }
  OPTIONAL { ?item rdfs:label ?labelEn FILTER(LANG(?labelEn) = "en") }
  OPTIONAL { ?item rdfs:label ?labelAr FILTER(LANG(?labelAr) = "ar") }
  OPTIONAL { ?item rdfs:label ?labelRu FILTER(LANG(?labelRu) = "ru") }
  OPTIONAL { ?heArticle schema:about ?item ; schema:isPartOf <https://he.wikipedia.org/> . }
}`;

type WikidataRow = {
  qid?: string; // Wikidata entity id, e.g. "Q123"
  siteId: number | null;
  nameHe?: string;
  nameEn?: string;
  nameAr?: string;
  nameRu?: string;
  imageFile?: string; // Commons file name
  wikipediaHe?: string;
};

// Entity URI (…/entity/Q123) -> "Q123". Wikidata returns the identifier with an
// http scheme; we only read the QID after "/entity/", so the scheme is irrelevant.
const qidFromUri = (uri?: string): string | undefined =>
  uri ? uri.split("/entity/")[1] : undefined;

const normalizeName = (s: string) =>
  s.replace(/["'׳״]/g, "").replace(/\s+/g, " ").trim();

async function fetchWikidata(): Promise<WikidataRow[]> {
  const url =
    "https://query.wikidata.org/sparql?format=json&query=" +
    encodeURIComponent(SPARQL);
  const res = await fetchRetry(
    url,
    { headers: { "User-Agent": USER_AGENT, Accept: "application/sparql-results+json" } },
    { timeoutMs: 120_000 },
  );
  const data = (await res.json()) as any;
  return data.results.bindings
    .map((b: any) => {
      const siteId = parseInt(b.siteId?.value, 10);
      const imageUrl: string | undefined = b.image?.value;
      return {
        qid: qidFromUri(b.item?.value),
        siteId: Number.isNaN(siteId) ? null : siteId,
        nameHe: b.labelHe?.value,
        nameEn: b.labelEn?.value,
        nameAr: b.labelAr?.value,
        nameRu: b.labelRu?.value,
        imageFile: imageUrl
          ? decodeURIComponent(imageUrl.split("/Special:FilePath/")[1] ?? "")
          : undefined,
        wikipediaHe: b.heArticle?.value,
      } as WikidataRow;
    })
    .filter(Boolean);
}

// Fallback for people the bulk SPARQL didn't match (middle names, nicknames):
// search Wikidata by name and accept hits that hold the MK position (P39) or
// carry a Knesset member ID (P9770).
async function searchWikidataPerson(
  nameCandidates: string[],
): Promise<WikidataRow | null> {
  const seen = new Set<string>();
  const candidateIds: string[] = [];
  for (const name of nameCandidates) {
    const params = new URLSearchParams({
      action: "wbsearchentities",
      format: "json",
      language: "he",
      type: "item",
      limit: "5",
      search: name,
    });
    const res = await fetch(`https://www.wikidata.org/w/api.php?${params}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) continue;
    const data = (await res.json()) as any;
    for (const hit of data.search ?? []) {
      if (!seen.has(hit.id)) {
        seen.add(hit.id);
        candidateIds.push(hit.id);
      }
    }
    if (candidateIds.length) break; // first candidate name that yields hits
  }
  if (!candidateIds.length) return null;

  const params = new URLSearchParams({
    action: "wbgetentities",
    format: "json",
    ids: candidateIds.join("|"),
    props: "claims|labels|sitelinks",
  });
  const res = await fetch(`https://www.wikidata.org/w/api.php?${params}`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as any;

  for (const id of candidateIds) {
    const entity = data.entities?.[id];
    if (!entity?.claims) continue;
    const isMk =
      entity.claims.P9770 ||
      (entity.claims.P39 ?? []).some(
        (c: any) => c.mainsnak?.datavalue?.value?.id === "Q4047513",
      );
    if (!isMk) continue;
    const label = (lang: string) => entity.labels?.[lang]?.value as string | undefined;
    return {
      qid: id,
      siteId: null,
      nameHe: label("he"),
      nameEn: label("en"),
      nameAr: label("ar"),
      nameRu: label("ru"),
      imageFile: entity.claims.P18?.[0]?.mainsnak?.datavalue?.value as
        | string
        | undefined,
      wikipediaHe: entity.sitelinks?.hewiki?.title
        ? `https://he.wikipedia.org/wiki/${encodeURIComponent(entity.sitelinks.hewiki.title.replace(/ /g, "_"))}`
        : undefined,
    };
  }
  return null;
}

type ImageInfo = { thumbUrl: string; license: string; attribution: string };

// Batched Commons imageinfo lookup: thumbnail URL + license + artist.
async function fetchCommonsInfo(files: string[]): Promise<Map<string, ImageInfo>> {
  const out = new Map<string, ImageInfo>();
  for (let i = 0; i < files.length; i += 50) {
    const batch = files.slice(i, i + 50);
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "400",
      titles: batch.map((f) => `File:${f}`).join("|"),
    });
    let data: any;
    try {
      const res = await fetchRetry(
        `https://commons.wikimedia.org/w/api.php?${params}`,
        { headers: { "User-Agent": USER_AGENT } },
        { timeoutMs: 60_000 },
      );
      data = await res.json();
    } catch (err) {
      // A batch may still fail after retries; skipping is safe because enrich only
      // overwrites photo columns when it HAS a value (COALESCE) — committed photos survive.
      console.warn(`  Commons batch failed after retries, skipping ${batch.length} files: ${err}`);
      continue;
    }
    const normalized = new Map<string, string>(
      (data.query?.normalized ?? []).map((n: any) => [n.to, n.from]),
    );
    for (const page of Object.values<any>(data.query?.pages ?? {})) {
      const info = page.imageinfo?.[0];
      if (!info) continue;
      const meta = info.extmetadata ?? {};
      const title = normalized.get(page.title) ?? page.title;
      out.set(title.replace(/^File:/, ""), {
        thumbUrl: canonicalCommonsUrl(info.thumburl ?? info.url) ?? "",
        license: meta.LicenseShortName?.value ?? "",
        attribution: (meta.Artist?.value ?? "").replace(/<[^>]+>/g, "").trim(),
      });
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return out;
}

export async function enrichFromWikidata() {
  const db = getDb();
  console.log("Enriching from Wikidata…");

  const people = db
    .select({
      id: schema.persons.id,
      siteCode: schema.persons.mkSiteCode,
      firstNameHe: schema.persons.firstNameHe,
      lastNameHe: schema.persons.lastNameHe,
    })
    .from(schema.persons)
    .all();
  const bySiteCode = new Map(
    people.filter((p) => p.siteCode != null).map((p) => [p.siteCode!, p.id]),
  );
  const byHebrewName = new Map(
    people.map((p) => [normalizeName(`${p.firstNameHe} ${p.lastNameHe}`), p.id]),
  );

  const rows = await fetchWikidata();
  console.log(`  ${rows.length} Wikidata rows, ${people.length} local persons`);

  // Match by P9770 site code when present, otherwise by Hebrew name.
  // A person can have several rows (multiple images); prefer one with a photo.
  const matched = new Map<number, WikidataRow>(); // personId -> row
  for (const row of rows) {
    const personId =
      (row.siteId != null ? bySiteCode.get(row.siteId) : undefined) ??
      (row.nameHe ? byHebrewName.get(normalizeName(row.nameHe)) : undefined);
    if (personId == null) continue;
    const existing = matched.get(personId);
    if (!existing || (!existing.imageFile && row.imageFile)) {
      matched.set(personId, row);
    }
  }

  // Per-person search fallback for anyone the bulk query missed.
  for (const p of people) {
    if (matched.has(p.id)) continue;
    const first = normalizeName(p.firstNameHe);
    const last = normalizeName(p.lastNameHe);
    const firstTokens = first.split(" ");
    const lastTokens = last.split(" ");
    const candidates = [
      `${p.firstNameHe.trim()} ${p.lastNameHe.trim()}`, // raw (keeps geresh)
      `${first} ${last}`,
      ...(firstTokens.length > 1
        ? [`${firstTokens[0]} ${last}`, `${firstTokens[1]} ${last}`]
        : []),
      ...(lastTokens.length > 1 ? [`${first} ${lastTokens[0]}`] : []),
    ];
    const row = await searchWikidataPerson(candidates);
    if (row) {
      matched.set(p.id, row);
    } else {
      console.warn(`  no Wikidata match: ${first} ${last} (${p.id})`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  const imageFiles = [...matched.values()]
    .map((r) => r.imageFile)
    .filter((f): f is string => !!f);
  const commons = await fetchCommonsInfo(imageFiles);
  console.log(`  ${matched.size} matched, ${commons.size} photos resolved`);

  let updated = 0;
  for (const [personId, row] of matched) {
    const img = row.imageFile ? commons.get(row.imageFile) : undefined;
    // COALESCE semantics: only overwrite a column when this run produced a value.
    // A partial upstream miss (dropped Commons batch, absent label) must NOT null
    // out already-committed data — unconditional sets once wiped ~50 members' photos.
    const set: Partial<typeof schema.persons.$inferInsert> = {};
    if (row.qid) set.wikidataId = row.qid;
    if (row.nameEn) set.nameEn = row.nameEn;
    if (row.nameAr) set.nameAr = row.nameAr;
    if (row.nameRu) set.nameRu = row.nameRu;
    if (row.wikipediaHe) set.wikipediaHe = row.wikipediaHe;
    if (img?.thumbUrl) {
      set.photoUrl = img.thumbUrl;
      set.photoLicense = img.license || null;
      set.photoAttribution = img.attribution || null;
    }
    if (Object.keys(set).length === 0) continue;
    db.update(schema.persons).set(set).where(eq(schema.persons.id, personId)).run();
    updated++;
  }
  console.log(`  ${updated} persons enriched`);
}

import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "../../src/db";
import { fetchAllRows, entityUrl, fetchRetry } from "./odata";
import { CURRENT_KNESSET } from "../../src/lib/constants";

type Row = Record<string, any>;

export async function syncFactions() {
  const db = getDb();
  console.log("Syncing factions…");
  let n = 0;
  for await (const row of fetchAllRows<Row>(
    entityUrl("KNS_Faction", { $filter: `KnessetNum eq ${CURRENT_KNESSET}` }),
  )) {
    const values = {
      knessetNum: row.KnessetNum,
      nameHe: (row.Name ?? "").trim(),
      isCurrent: !!row.IsCurrent,
      startDate: row.StartDate,
      finishDate: row.FinishDate,
      lastUpdated: row.LastUpdatedDate,
    };
    db.insert(schema.factions)
      .values({ id: row.Id, ...values })
      .onConflictDoUpdate({ target: schema.factions.id, set: values })
      .run();
    n++;
  }
  console.log(`  ${n} factions`);
}

export async function syncPersonPositions(): Promise<Set<number>> {
  const db = getDb();
  console.log("Syncing person positions…");
  const personIds = new Set<number>();
  let n = 0;
  for await (const row of fetchAllRows<Row>(
    entityUrl("KNS_PersonToPosition", {
      $filter: `KnessetNum eq ${CURRENT_KNESSET}`,
    }),
    (fetched) => fetched % 500 === 0 && console.log(`  …${fetched} rows`),
  )) {
    personIds.add(row.PersonID);
    const values = {
      personId: row.PersonID,
      positionId: row.PositionID,
      knessetNum: row.KnessetNum,
      factionId: row.FactionID,
      factionNameHe: row.FactionName?.trim() ?? null,
      govMinistryNameHe: row.GovMinistryName ?? null,
      committeeId: row.CommitteeID ?? null,
      committeeNameHe: row.CommitteeName ?? null,
      startDate: row.StartDate,
      finishDate: row.FinishDate,
      isCurrent: !!row.IsCurrent,
      lastUpdated: row.LastUpdatedDate,
    };
    db.insert(schema.personPositions)
      .values({ id: row.Id, ...values })
      .onConflictDoUpdate({ target: schema.personPositions.id, set: values })
      .run();
    n++;
  }
  console.log(`  ${n} position rows, ${personIds.size} persons`);
  return personIds;
}

// Full position history (all Knessets) for the tracked persons, so a profile
// shows complete role + faction history (not just the current term). Upserts
// into the same table; historical rows carry IsCurrent=false + own KnessetNum.
export async function syncMemberPositionHistory(personIds: Set<number>) {
  const db = getDb();
  console.log("Syncing full position history for current members…");
  const ids = [...personIds];
  let n = 0;
  for (let i = 0; i < ids.length; i += 40) {
    const batch = ids.slice(i, i + 40);
    for await (const row of fetchAllRows<Row>(
      entityUrl("KNS_PersonToPosition", { $filter: `PersonID in (${batch.join(",")})` }),
    )) {
      const values = {
        personId: row.PersonID,
        positionId: row.PositionID,
        knessetNum: row.KnessetNum,
        factionId: row.FactionID,
        factionNameHe: row.FactionName?.trim() ?? null,
        govMinistryNameHe: row.GovMinistryName ?? null,
        committeeId: row.CommitteeID ?? null,
        committeeNameHe: row.CommitteeName ?? null,
        startDate: row.StartDate,
        finishDate: row.FinishDate,
        isCurrent: !!row.IsCurrent,
        lastUpdated: row.LastUpdatedDate,
      };
      db.insert(schema.personPositions)
        .values({ id: row.Id, ...values })
        .onConflictDoUpdate({ target: schema.personPositions.id, set: values })
        .run();
      n++;
    }
  }
  console.log(`  ${n} historical position rows upserted`);
}

// Fill positionDescHe from the KNS_Position lookup table.
export async function syncPositionDescriptions() {
  const db = getDb();
  console.log("Syncing position descriptions…");
  for await (const row of fetchAllRows<Row>(entityUrl("KNS_Position"))) {
    db.update(schema.personPositions)
      .set({ positionDescHe: row.Description })
      .where(eq(schema.personPositions.positionId, row.Id))
      .run();
  }
}

export async function syncPersons(personIds: Set<number>) {
  const db = getDb();
  console.log(`Syncing ${personIds.size} persons…`);
  const ids = [...personIds];
  for (let i = 0; i < ids.length; i += 40) {
    const batch = ids.slice(i, i + 40);
    for await (const row of fetchAllRows<Row>(
      entityUrl("KNS_Person", { $filter: `Id in (${batch.join(",")})` }),
    )) {
      const values = {
        firstNameHe: (row.FirstName ?? "").trim(),
        lastNameHe: (row.LastName ?? "").trim(),
        genderDesc: row.GenderDesc,
        email: row.Email,
        isCurrent: !!row.IsCurrent,
        lastUpdated: row.LastUpdatedDate,
      };
      db.insert(schema.persons)
        .values({ id: row.Id, ...values })
        .onConflictDoUpdate({ target: schema.persons.id, set: values })
        .run();
    }
  }
  console.log("  done");
}

// Map Knesset PersonID -> website MK id (joins to Wikidata P9770).
export async function syncMkSiteCodes(personIds: Set<number>) {
  const db = getDb();
  console.log("Syncing MK site codes…");
  let n = 0;
  for await (const row of fetchAllRows<Row>(entityUrl("KNS_MkSiteCode"))) {
    if (!personIds.has(row.KnsID)) continue;
    db.update(schema.persons)
      .set({ mkSiteCode: row.SiteId })
      .where(eq(schema.persons.id, row.KnsID))
      .run();
    n++;
  }
  console.log(`  ${n} site codes matched`);
}

// Official MK names in English, Arabic and Russian, from the Knesset's own
// directory of every MK (the MkLobby API behind main.knesset.gov.il). Runs after
// the Wikidata step and wins over its labels: the Knesset is the primary source
// for its members' names, and Wikidata misses new MKs and has had wrong labels.
// A person is matched by site code, else by a Hebrew name unique in the
// directory, else by a surname unique in the current Knesset with the same first
// letters (Benny for Binyamin). Only non-empty values are written.
const KNESSET_DIRECTORY = "https://www.knesset.gov.il/WebSiteApi/knessetapi/MkLobby";

type DirectoryMk = { MkId: number; FirstName?: string; LastName?: string; Firstname?: string; Lastname?: string };

async function knessetDirectory(lang: string) {
  const get = async (path: string) =>
    (await (await fetchRetry(`${KNESSET_DIRECTORY}/${path}?lang=${lang}`, {}, { timeoutMs: 120_000 })).json()) as {
      mkPrevious?: DirectoryMk[];
      knessetPrevious?: { MkId: number; Incumbent: number[] }[];
      mks?: DirectoryMk[];
    };
  const [previous, current] = await Promise.all([get("GetMksPrevious"), get("GetMkLobbyData")]);
  const full = (first?: string, last?: string) => `${(first ?? "").trim()} ${(last ?? "").trim()}`.trim();
  const names = new Map<number, string>();
  for (const x of previous.mkPrevious ?? []) names.set(x.MkId, full(x.FirstName, x.LastName));
  // The current Knesset's list spells today's names; it wins.
  for (const x of current.mks ?? []) names.set(x.MkId, full(x.Firstname, x.Lastname));
  const terms = new Map((previous.knessetPrevious ?? []).map((x) => [x.MkId, x.Incumbent] as const));
  return { names, terms };
}

export async function syncOfficialNames() {
  const db = getDb();
  console.log("Syncing official MK names (Knesset directory)…");
  const [he, en, ar, ru] = await Promise.all(["he", "en", "ar", "ru"].map(knessetDirectory));
  const norm = (s: string) => s.replace(/["'\u05f3\u05f4-]/g, " ").replace(/\s+/g, " ").trim().split(" ");
  const index = new Map<string, number[]>();
  const add = (key: string, id: number) => index.set(key, [...(index.get(key) ?? []), id]);
  for (const [id, name] of he.names) {
    const t = norm(name);
    add(`full:${t.join(" ")}`, id);
    add(`first-last:${t[0]} ${t.at(-1)}`, id);
    if (he.terms.get(id)?.includes(CURRENT_KNESSET)) add(`surname:${t.at(-1)}`, id);
  }
  const unique = (key: string) => (index.get(key)?.length === 1 ? index.get(key)![0] : undefined);

  const people = db
    .select({ id: schema.persons.id, siteCode: schema.persons.mkSiteCode, first: schema.persons.firstNameHe, last: schema.persons.lastNameHe })
    .from(schema.persons)
    .all();
  let n = 0;
  for (const p of people) {
    const t = norm(`${p.first} ${p.last}`);
    const bySurname = unique(`surname:${t.at(-1)}`);
    const site =
      (p.siteCode != null && he.names.has(p.siteCode) ? p.siteCode : undefined) ??
      unique(`full:${t.join(" ")}`) ??
      unique(`first-last:${t[0]} ${t.at(-1)}`) ??
      (bySurname != null && norm(he.names.get(bySurname)!)[0].slice(0, 2) === t[0].slice(0, 2) ? bySurname : undefined);
    if (site == null) continue;
    const set: Partial<typeof schema.persons.$inferInsert> = {};
    if (en.names.get(site)) set.nameEn = en.names.get(site);
    if (ar.names.get(site)) set.nameAr = ar.names.get(site);
    if (ru.names.get(site)) set.nameRu = ru.names.get(site);
    if (p.siteCode == null) set.mkSiteCode = site;
    if (Object.keys(set).length === 0) continue;
    db.update(schema.persons).set(set).where(eq(schema.persons.id, p.id)).run();
    n++;
  }
  console.log(`  ${n} of ${people.length} persons named from the Knesset directory`);
}

export function markSyncState(table: string, lastUpdatedDate: string | null) {
  const db = getDb();
  db.insert(schema.syncState)
    .values({
      table,
      lastUpdatedDate,
      lastSyncedAt: sql`datetime('now')`,
    })
    .onConflictDoUpdate({
      target: schema.syncState.table,
      set: { lastUpdatedDate, lastSyncedAt: sql`datetime('now')` },
    })
    .run();
}

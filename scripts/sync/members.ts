import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "../../src/db";
import { fetchAllRows, entityUrl } from "./odata";
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

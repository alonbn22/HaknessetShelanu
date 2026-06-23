import { sql } from "drizzle-orm";
import { getDb, schema } from "../../src/db";
import { fetchAllRows, fetchAll, entityUrl, pool, dateWindows } from "./odata";
import {
  CURRENT_KNESSET,
  CURRENT_KNESSET_START,
  VOTE_FOR,
  VOTE_AGAINST,
  VOTE_ABSTAIN,
  VOTE_DID_NOT_VOTE,
  VOTE_CANCELLED,
} from "../../src/lib/constants";
import { markSyncState } from "./members";

type Row = Record<string, any>;

// The V4 raw ResultCode values are inconsistent across eras; the Hebrew
// description is the stable signal. Map to our canonical codes.
function canonicalResult(desc: string | null): number {
  if (!desc) return VOTE_CANCELLED;
  if (desc.includes("בעד")) return VOTE_FOR;
  if (desc.includes("נגד")) return VOTE_AGAINST;
  if (desc.includes("נמנע")) return VOTE_ABSTAIN;
  if (desc.includes("לא הצביע") || desc.includes("נוכח")) return VOTE_DID_NOT_VOTE;
  return VOTE_CANCELLED;
}

function getSyncCursor(table: string): string | null {
  const db = getDb();
  const row = db
    .select()
    .from(schema.syncState)
    .where(sql`${schema.syncState.table} = ${table}`)
    .get();
  return row?.lastUpdatedDate ?? null;
}

export async function syncVoteHeaders() {
  const db = getDb();
  const cursor = getSyncCursor("KNS_PlenumVote");
  const filter = cursor
    ? `LastUpdatedDate ge ${cursor}`
    : `VoteDateTime ge ${CURRENT_KNESSET_START}`;
  console.log(`Syncing vote headers (${cursor ? "incremental" : "full"})…`);

  let maxUpdated = cursor ?? "";
  let n = 0;
  for await (const row of fetchAllRows<Row>(
    entityUrl("KNS_PlenumVote", {
      $filter: filter,
      $orderby: "LastUpdatedDate",
    }),
    (fetched) => fetched % 1000 === 0 && console.log(`  …${fetched} headers`),
  )) {
    const values = {
      knessetNum: CURRENT_KNESSET,
      dateTime: row.VoteDateTime,
      titleHe: row.VoteTitle ?? row.VoteSubject ?? null,
      forDesc: row.ForOptionDesc ?? null,
      againstDesc: row.AgainstOptionDesc ?? null,
      sessionId: row.SessionID,
      itemId: row.ItemID,
      isElectronic: row.VoteMethodID === 1,
      lastUpdated: row.LastUpdatedDate,
    };
    db.insert(schema.votes)
      .values({ id: row.Id, ...values })
      .onConflictDoUpdate({ target: schema.votes.id, set: values })
      .run();
    if (row.LastUpdatedDate > maxUpdated) maxUpdated = row.LastUpdatedDate;
    n++;
  }
  if (maxUpdated) markSyncState("KNS_PlenumVote", maxUpdated);
  console.log(`  ${n} vote headers`);
}

const insertResult = () => {
  const db = getDb();
  return db
    .insert(schema.voteResults)
    .values({
      voteId: sql.placeholder("voteId"),
      personId: sql.placeholder("personId"),
      resultCode: sql.placeholder("resultCode"),
    })
    .onConflictDoUpdate({
      target: [schema.voteResults.voteId, schema.voteResults.personId],
      set: { resultCode: sql`excluded.result_code` },
    })
    .prepare();
};

// KNS_PlenumVoteResult.MkId is a different id space from KNS_Person.Id for
// newer MKs (see scripts/sync/fix-mkids.ts). Resolve it to the real PersonID
// via the mk_id_map table so vote rows join to persons correctly.
function loadMkIdMap(): Map<number, number> {
  const db = getDb();
  const map = new Map<number, number>();
  try {
    const rows = db.all<{ mk_id: number; person_id: number }>(
      sql`SELECT mk_id, person_id FROM mk_id_map`,
    );
    for (const r of rows) map.set(r.mk_id, r.person_id);
  } catch {
    /* table may not exist yet (run fix-mkids once) */
  }
  return map;
}

export async function syncVoteResults() {
  const cursor = getSyncCursor("KNS_PlenumVoteResult");
  if (cursor) {
    await syncVoteResultsIncremental(cursor);
  } else {
    await syncVoteResultsBackfill();
  }
}

// Incremental: pull rows updated since the cursor (small, sequential).
async function syncVoteResultsIncremental(cursor: string) {
  console.log("Syncing vote results (incremental)…");
  const insert = insertResult();
  const mkMap = loadMkIdMap();
  let maxUpdated = cursor;
  let n = 0;
  for await (const row of fetchAllRows<Row>(
    entityUrl("KNS_PlenumVoteResult", {
      $filter: `LastUpdatedDate ge ${cursor}`,
      $orderby: "LastUpdatedDate",
    }),
  )) {
    insert.run({
      voteId: row.VoteID,
      personId: mkMap.get(row.MkId) ?? row.MkId,
      resultCode: canonicalResult(row.ResultDesc),
    });
    if (row.LastUpdatedDate > maxUpdated) maxUpdated = row.LastUpdatedDate;
    n++;
  }
  if (maxUpdated) markSyncState("KNS_PlenumVoteResult", maxUpdated);
  console.log(`  ${n} result rows (incremental)`);
}

// Full backfill: the server uses offset paging in nextLink, so deep pages get
// very slow. We avoid deep offsets by splitting the term into short fixed date
// windows (so within-window paging stays shallow) and fetching them in
// parallel. 5-day windows keep even budget-marathon periods manageable.
async function syncVoteResultsBackfill() {
  console.log("Syncing vote results (windowed backfill)…");
  const insert = insertResult();
  const mkMap = loadMkIdMap();
  const now = new Date().toISOString();
  const windows = dateWindows(CURRENT_KNESSET_START, now, 5);
  console.log(`  ${windows.length} windows`);

  let total = 0;
  let maxUpdated = "";
  let done = 0;
  await pool(windows, 6, async (w) => {
    const rows = await fetchAll<Row>(
      entityUrl("KNS_PlenumVoteResult", {
        $filter: `VoteDate ge ${w.from} and VoteDate lt ${w.to}`,
        $orderby: "VoteDate",
      }),
    );
    for (const row of rows) {
      insert.run({
        voteId: row.VoteID,
        personId: mkMap.get(row.MkId) ?? row.MkId,
        resultCode: canonicalResult(row.ResultDesc),
      });
      if (row.LastUpdatedDate > maxUpdated) maxUpdated = row.LastUpdatedDate;
    }
    total += rows.length;
    done++;
    if (done % 20 === 0 || done === windows.length)
      console.log(`  ${done}/${windows.length} windows, ${total} rows`);
  });

  if (maxUpdated) markSyncState("KNS_PlenumVoteResult", maxUpdated);
  console.log(`  ${total} result rows (backfill)`);
}

// Fetch the agenda-item subject (KNS_PlmSessionItem.Name + type) for each
// distinct ItemID referenced by our votes. This is the official description of
// what the vote was about — the bill or topic on the agenda.
export async function syncVoteSubjects() {
  const db = getDb();
  console.log("Syncing vote subjects (agenda items)…");
  const itemIds = db
    .selectDistinct({ itemId: schema.votes.itemId })
    .from(schema.votes)
    .where(sql`${schema.votes.itemId} IS NOT NULL AND ${schema.votes.itemName} IS NULL`)
    .all()
    .map((r) => r.itemId as number);

  const update = db
    .update(schema.votes)
    .set({
      itemName: sql.placeholder("name") as any,
      itemTypeDesc: sql.placeholder("type") as any,
    })
    .where(sql`${schema.votes.itemId} = ${sql.placeholder("itemId")}`)
    .prepare();

  let n = 0;
  for (let i = 0; i < itemIds.length; i += 40) {
    const batch = itemIds.slice(i, i + 40);
    for await (const row of fetchAllRows<Row>(
      entityUrl("KNS_PlmSessionItem", {
        $filter: `ItemID in (${batch.join(",")})`,
        $select: "ItemID,Name,ItemTypeDesc",
      }),
    )) {
      update.run({
        itemId: row.ItemID,
        name: row.Name?.trim() ?? null,
        type: row.ItemTypeDesc ?? null,
      });
      n++;
    }
    if (i % 400 === 0 && i > 0) console.log(`  …${i}/${itemIds.length} items`);
  }
  console.log(`  ${n} agenda items resolved for ${itemIds.length} item ids`);
}

// Recompute vote totals on headers from the per-MK results.
export function computeVoteTotals() {
  const db = getDb();
  console.log("Computing vote totals…");
  db.run(sql`
    UPDATE votes SET
      total_for = COALESCE((SELECT COUNT(*) FROM vote_results vr WHERE vr.vote_id = votes.id AND vr.result_code = ${VOTE_FOR}), 0),
      total_against = COALESCE((SELECT COUNT(*) FROM vote_results vr WHERE vr.vote_id = votes.id AND vr.result_code = ${VOTE_AGAINST}), 0),
      total_abstain = COALESCE((SELECT COUNT(*) FROM vote_results vr WHERE vr.vote_id = votes.id AND vr.result_code = ${VOTE_ABSTAIN}), 0)
  `);
  // Heuristic: passed if more for than against. (Special-majority votes
  // aside, this matches the plenum outcome in practice.)
  db.run(sql`UPDATE votes SET is_accepted = (total_for > total_against)`);
  console.log("  done");
}

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

// Re-scan a small overlap before the stored cursor. Offset paging by
// LastUpdatedDate can skip a row updated mid-pagination; re-fetching the boundary
// closes that gap (upserts idempotent). Only the query lower bound moves — the
// stored cursor stays the true high-water mark.
function backoffCursor(iso: string, minutes = 5): string {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? iso : new Date(t - minutes * 60_000).toISOString();
}

export async function syncVoteHeaders() {
  const db = getDb();
  const cursor = getSyncCursor("KNS_PlenumVote");
  // KNS_PlenumVote spans every Knesset; a retro-edit bumps LastUpdatedDate, so
  // the incremental filter MUST also gate on VoteDateTime or an old row gets
  // mislabeled as the current Knesset (we stamp CURRENT_KNESSET below).
  const filter = cursor
    ? `LastUpdatedDate ge ${backoffCursor(cursor)} and VoteDateTime ge ${CURRENT_KNESSET_START}`
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

// KNS_PlenumVoteResult.MkId is a different id space from KNS_Person.Id for newer
// MKs (see fix-mkids.ts). Resolve to the real PersonID via mk_id_map so rows join.
function loadMkIdMap(): Map<number, number> {
  const db = getDb();
  const map = new Map<number, number>();
  try {
    const rows = db.all<{ mk_id: number; person_id: number }>(
      sql`SELECT mk_id, person_id FROM mk_id_map`,
    );
    for (const r of rows) map.set(r.mk_id, r.person_id);
  } catch {
    /* table may not exist yet (first run before db:push declares it) */
  }
  return map;
}

const normName = (s: string | null) =>
  (s ?? "").replace(/["'׳״]/g, "").replace(/\s+/g, " ").trim();

// Rebuild mk_id_map from the denormalized names on the vote feed and move any
// vote_results still under a raw MkId onto the real PersonID. Runs after
// syncVoteResults so freshly-inserted rows are healed before stats. Idempotent.
export async function remapVoteResultMkIds() {
  const db = getDb();
  console.log("Remapping vote_results MkId -> PersonID…");
  const persons = db
    .select({
      id: schema.persons.id,
      first: schema.persons.firstNameHe,
      last: schema.persons.lastNameHe,
    })
    .from(schema.persons)
    .all();
  // Names are the only join key, so two persons with the same normalized name
  // are ambiguous — skip them rather than let one MK absorb another's votes.
  const nameToPerson = new Map<string, number>();
  const ambiguous = new Set<string>();
  for (const p of persons) {
    const key = `${normName(p.first)}|${normName(p.last)}`;
    const prev = nameToPerson.get(key);
    if (prev != null && prev !== p.id) ambiguous.add(key);
    else nameToPerson.set(key, p.id);
  }

  // Newest-first; ~12k rows (~100 recent votes) covers every sitting MK's name.
  const mkToName = new Map<number, string>();
  let fetched = 0;
  for await (const r of fetchAllRows<Row>(
    entityUrl("KNS_PlenumVoteResult", {
      $orderby: "VoteDate desc",
      $select: "MkId,FirstName,LastName",
    }),
  )) {
    if (!mkToName.has(r.MkId)) mkToName.set(r.MkId, `${normName(r.FirstName)}|${normName(r.LastName)}`);
    if (++fetched >= 12000) break;
  }

  const client = db.$client;
  // Self-sufficient: create the table/index if a fresh DB hasn't had db:push
  // yet. Definitions match schema.ts exactly so a later db:push sees them in-sync.
  client.exec(
    "CREATE TABLE IF NOT EXISTS mk_id_map (mk_id integer PRIMARY KEY, person_id integer NOT NULL)",
  );
  client.exec("CREATE INDEX IF NOT EXISTS votes_item_idx ON votes (item_id)");
  const insMap = client.prepare(
    "INSERT OR REPLACE INTO mk_id_map (mk_id, person_id) VALUES (?, ?)",
  );
  const upd = client.prepare(
    "UPDATE OR REPLACE vote_results SET person_id = ? WHERE person_id = ?",
  );
  let remapped = 0;
  const txn = client.transaction(() => {
    for (const [mkId, name] of mkToName) {
      if (ambiguous.has(name)) {
        console.warn(`  skipping ambiguous name (maps to multiple persons): MkId ${mkId}`);
        continue;
      }
      const personId = nameToPerson.get(name);
      if (personId == null || personId === mkId) continue;
      insMap.run(mkId, personId);
      upd.run(personId, mkId);
      remapped++;
    }
  });
  txn();
  console.log(`  mk_id_map: ${mkToName.size} MkIds scanned, ${remapped} mapped to a PersonID`);
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
      $filter: `LastUpdatedDate ge ${backoffCursor(cursor)}`,
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

// Full backfill: the server's offset paging makes deep pages very slow, so we
// split the term into short fixed date windows (shallow within-window paging)
// fetched in parallel. 5-day windows keep even busy periods manageable.
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

// Fetch the agenda-item subject (KNS_PlmSessionItem.Name + type) for each distinct
// ItemID referenced by our votes — the official description of what the vote was about.
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

// Second pass for MkIds the name pass cannot reach: an MK who left the Knesset
// never appears in the recent feed, so vote_results rows still sit under a raw
// MkId that joins to nobody (the vote page shows them as absent; faction
// tallies undercount). Resolve each by elimination: on a vote the orphan took
// part in, the Knesset's own rows minus the persons the record already knows
// are the candidates; the one whose result matches on every sampled vote is
// the person. Nothing is guessed — an orphan with no unique match stays as is
// and is reported.
type OrphanResolution = { mkId: number; personId: number; votes: number };

export async function resolveOrphanMkIds({ dryRun = false, sample = 4 } = {}): Promise<OrphanResolution[]> {
  const db = getDb();
  const client = db.$client;
  const known = new Set(client.prepare("SELECT id FROM persons").all().map((r) => (r as { id: number }).id));
  const orphans = client
    .prepare(
      `SELECT vr.person_id AS id, COUNT(*) AS n FROM vote_results vr
       JOIN votes v ON v.id = vr.vote_id
       WHERE v.knesset_num = ${CURRENT_KNESSET} AND vr.person_id NOT IN (SELECT id FROM persons)
       GROUP BY vr.person_id HAVING n >= 2`,
    )
    .all() as { id: number; n: number }[];
  if (orphans.length === 0) return [];
  console.log(`Resolving ${orphans.length} orphan MkIds by elimination…`);

  const CODE: Record<string, number> = { "בעד": VOTE_FOR, "נגד": VOTE_AGAINST, "נמנע": VOTE_ABSTAIN };
  const remote = new Map<number, Map<number, number>>(); // voteId -> personId -> code
  const fetchVote = async (voteId: number) => {
    if (remote.has(voteId)) return remote.get(voteId)!;
    const m = new Map<number, number>();
    for await (const r of fetchAllRows<{ MkId: number; ResultDesc: string }>(
      entityUrl("KNS_PlenumVoteResult", { $filter: `VoteID eq ${voteId}`, $select: "MkId,ResultDesc" }),
    )) {
      m.set(r.MkId, CODE[r.ResultDesc?.trim()] ?? VOTE_DID_NOT_VOTE);
    }
    remote.set(voteId, m);
    return m;
  };

  const localRows = client.prepare(
    `SELECT vr.vote_id AS voteId, vr.person_id AS personId, vr.result_code AS code
     FROM vote_results vr WHERE vr.vote_id = ?`,
  );
  const orphanVotes = client.prepare(
    `SELECT vr.vote_id AS voteId, vr.result_code AS code FROM vote_results vr
     JOIN votes v ON v.id = vr.vote_id
     WHERE vr.person_id = ? AND vr.result_code IN (${VOTE_FOR}, ${VOTE_AGAINST}, ${VOTE_ABSTAIN})
     ORDER BY v.date_time`,
  );

  const resolved: OrphanResolution[] = [];
  for (const o of orphans) {
    const mine = orphanVotes.all(o.id) as { voteId: number; code: number }[];
    if (mine.length === 0) continue;
    // Spread the sample across the orphan's tenure so a one-off coincidence can't match.
    const picks = Array.from({ length: Math.min(sample, mine.length) }, (_, i) =>
      mine[Math.floor((i * (mine.length - 1)) / Math.max(1, Math.min(sample, mine.length) - 1))],
    );
    // Candidates so far (null before the first sample).
    const state: { candidates: Set<number> | null } = { candidates: null };
    const narrow = async (p: { voteId: number; code: number }) => {
      const theirs = await fetchVote(p.voteId);
      const ours = localRows.all(p.voteId) as { voteId: number; personId: number; code: number }[];
      const placed = new Set(ours.filter((r) => known.has(r.personId)).map((r) => r.personId));
      const here = new Set<number>();
      for (const [pid, code] of theirs) if (!placed.has(pid) && code === p.code) here.add(pid);
      state.candidates = state.candidates ? new Set([...state.candidates].filter((c) => here.has(c))) : here;
    };
    for (const p of picks) {
      await narrow(p);
      if (state.candidates!.size === 0) break;
    }
    // Two members of one faction vote alike on most days; keep sampling votes
    // spread across the orphan's tenure until a vote one of them missed tells
    // them apart (bounded, so a true twin stays open and is reported).
    const extra = 40;
    for (let k = 0; state.candidates && state.candidates.size > 1 && k < extra; k++) {
      const idx = Math.floor(((k + 0.5) * mine.length) / extra);
      await narrow(mine[Math.min(idx, mine.length - 1)]);
    }
    const candidates = state.candidates;
    if (!candidates || candidates.size !== 1) {
      console.warn(`  orphan MkId ${o.id} (${o.n} rows): ${candidates ? candidates.size : 0} candidates — left unresolved`);
      continue;
    }
    const personId = [...candidates][0];
    if (!known.has(personId)) {
      console.warn(`  orphan MkId ${o.id} matches PersonID ${personId}, who is not in persons — left unresolved`);
      continue;
    }
    resolved.push({ mkId: o.id, personId, votes: o.n });
    console.log(`  MkId ${o.id} -> PersonID ${personId} (${o.n} rows)`);
  }

  if (!dryRun && resolved.length > 0) {
    const insMap = client.prepare("INSERT OR REPLACE INTO mk_id_map (mk_id, person_id) VALUES (?, ?)");
    const upd = client.prepare("UPDATE OR REPLACE vote_results SET person_id = ? WHERE person_id = ?");
    client.transaction(() => {
      for (const r of resolved) {
        insMap.run(r.mkId, r.personId);
        upd.run(r.personId, r.mkId);
      }
    })();
    console.log(`  healed ${resolved.length} orphan MkIds`);
  }
  return resolved;
}

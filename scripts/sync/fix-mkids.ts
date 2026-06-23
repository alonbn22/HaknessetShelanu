// Fix: KNS_PlenumVoteResult.MkId is a different identifier space from
// KNS_Person.Id for MKs who entered the Knesset more recently (e.g. Abutbul =
// Person 30749 but MkId 32220). Our vote_results table stored person_id = MkId,
// so those members never join to persons → 0% participation. This script
// resolves MkId↔PersonID by the (denormalized) name on the vote rows, remaps
// vote_results to the real PersonID, and recomputes stats.
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "../../src/db";
import { fetchAllRows, entityUrl } from "./odata";
import { computeVoteTotals } from "./votes";
import { computeMkStats } from "./stats";

type Row = Record<string, any>;
const norm = (s: string) =>
  (s ?? "").replace(/["'׳״]/g, "").replace(/\s+/g, " ").trim();

async function main() {
  const db = getDb();
  const persons = db
    .select({
      id: schema.persons.id,
      first: schema.persons.firstNameHe,
      last: schema.persons.lastNameHe,
    })
    .from(schema.persons)
    .all();
  console.log(`Resolving MkId for ${persons.length} persons by name…`);

  // mkId -> personId, only where they differ (a remap is needed).
  const remap: Array<{ mkId: number; personId: number }> = [];
  let matched = 0;
  let same = 0;

  // Bulk-fetch recent vote rows (ordered newest-first, shallow pages = fast).
  // These carry MkId + denormalized names and cover everyone who voted recently.
  const nameToMk = new Map<string, number>(); // "first|last" -> MkId
  let fetched = 0;
  for await (const r of fetchAllRows<Row>(
    entityUrl("KNS_PlenumVoteResult", {
      $orderby: "VoteDate desc",
      $select: "MkId,FirstName,LastName",
    }),
  )) {
    const key = `${norm(r.FirstName)}|${norm(r.LastName)}`;
    if (!nameToMk.has(key)) nameToMk.set(key, r.MkId);
    if (++fetched >= 12000) break; // ~100 recent votes — covers all sitting MKs
  }
  console.log(`  scanned ${fetched} recent vote rows, ${nameToMk.size} distinct names`);

  for (const p of persons) {
    const mkId = nameToMk.get(`${norm(p.first)}|${norm(p.last)}`);
    if (mkId == null) continue;
    matched++;
    if (mkId !== p.id) remap.push({ mkId, personId: p.id });
    else same++;
  }

  console.log(`  matched ${matched} (already-aligned ${same}, need remap ${remap.length})`);

  // Persist the mapping and remap vote_results. UPDATE OR REPLACE guards the
  // (vote_id, person_id) PK in the unlikely event of a collision.
  const tx = db.$client;
  tx.exec(
    "CREATE TABLE IF NOT EXISTS mk_id_map (mk_id integer PRIMARY KEY, person_id integer)",
  );
  const insMap = tx.prepare(
    "INSERT OR REPLACE INTO mk_id_map (mk_id, person_id) VALUES (?, ?)",
  );
  const upd = tx.prepare(
    "UPDATE OR REPLACE vote_results SET person_id = ? WHERE person_id = ?",
  );
  const remapTx = tx.transaction(() => {
    for (const { mkId, personId } of remap) {
      insMap.run(mkId, personId);
      const info = upd.run(personId, mkId);
      void info;
    }
  });
  remapTx();
  console.log(`  remapped vote_results for ${remap.length} MkIds`);

  computeVoteTotals();
  computeMkStats();
  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

// keep the linter happy about the imported helper used indirectly
void eq;
void sql;

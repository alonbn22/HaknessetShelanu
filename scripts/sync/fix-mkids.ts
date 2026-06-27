// One-time repair for the CURRENT committed DB: KNS_PlenumVoteResult.MkId is a
// different identifier space from KNS_Person.Id for many MKs (e.g. Kallner =
// Person 30710 but MkId 32037), so vote_results stored under raw MkIds never join
// to persons → those votes show "did not vote" for everyone. The durable fix now
// lives in scripts/sync/votes.ts (remapVoteResultMkIds, run every vote sync) and
// the mk_id_map table is declared in the Drizzle schema so db:push keeps it. This
// script just applies that same remap once and recomputes totals/stats.
//
//   npm run db:push          # creates mk_id_map (now in the schema)
//   npx tsx scripts/sync/fix-mkids.ts
import { sql } from "drizzle-orm";
import { getDb } from "../../src/db";
import { remapVoteResultMkIds, computeVoteTotals } from "./votes";
import { computeMkStats } from "./stats";

async function main() {
  await remapVoteResultMkIds();
  computeVoteTotals();
  computeMkStats();
  getDb().run(sql`PRAGMA wal_checkpoint(TRUNCATE)`);
  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

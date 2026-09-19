// Repair: KNS_PlenumVoteResult.MkId is a different id space from KNS_Person.Id
// for many MKs, so vote_results under raw MkIds never join to persons (they
// show as "did not vote"). The durable fixes live in votes.ts
// (remapVoteResultMkIds by name; resolveOrphanMkIds by elimination for MKs who
// have since left); this applies both once + recomputes stats and agreement.
//
//   npm run db:push          # creates mk_id_map (now in the schema)
//   npx tsx scripts/sync/fix-mkids.ts
import { sql } from "drizzle-orm";
import { getDb } from "../../src/db";
import { remapVoteResultMkIds, resolveOrphanMkIds, computeVoteTotals } from "./votes";
import { computeMkStats, computeMkAgreement } from "./stats";

async function main() {
  await remapVoteResultMkIds();
  await resolveOrphanMkIds();
  computeVoteTotals();
  computeMkStats();
  computeMkAgreement();
  getDb().run(sql`PRAGMA wal_checkpoint(TRUNCATE)`);
  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

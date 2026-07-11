// One-off runner: fast windowed results backfill + recompute totals & stats.
import { sql } from "drizzle-orm";
import { getDb } from "../../src/db";
import { syncVoteResults, syncVoteSubjects, computeVoteTotals } from "./votes";
import { computeMkStats } from "./stats";

async function main() {
  const started = Date.now();
  await syncVoteResults();
  await syncVoteSubjects();
  computeVoteTotals();
  computeMkStats();
  // Fold the WAL into the main .db so this standalone run leaves a
  // self-contained file (the committed DB is just data/knesset.db).
  getDb().run(sql`PRAGMA wal_checkpoint(TRUNCATE)`);
  console.log(`Done in ${Math.round((Date.now() - started) / 1000)}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

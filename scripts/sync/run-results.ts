// One-off runner: fast windowed results backfill + recompute totals & stats.
import { syncVoteResults, syncVoteSubjects, computeVoteTotals } from "./votes";
import { computeMkStats } from "./stats";

async function main() {
  const started = Date.now();
  await syncVoteResults();
  await syncVoteSubjects();
  computeVoteTotals();
  computeMkStats();
  console.log(`Done in ${Math.round((Date.now() - started) / 1000)}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

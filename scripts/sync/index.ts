// Sync CLI: pulls Knesset open data + Wikidata into the local SQLite DB.
//
//   npm run sync              full sync (members + votes + stats)
//   npm run sync -- --members only members/factions/positions + Wikidata
//   npm run sync -- --votes   only votes + totals + stats
//   npm run sync -- --stats   only recompute stats/totals
//
// Vote sync is incremental after the first run (cursor in sync_state).

import {
  syncFactions,
  syncPersonPositions,
  syncPositionDescriptions,
  syncPersons,
  syncMkSiteCodes,
  markSyncState,
} from "./members";
import { enrichFromWikidata } from "./wikidata";
import {
  syncVoteHeaders,
  syncVoteResults,
  syncVoteSubjects,
  computeVoteTotals,
} from "./votes";
import { computeMkStats } from "./stats";
import { syncBills } from "./bills";
import {
  syncQueries,
  syncAgendas,
  syncCommittees,
  syncIsraelLaws,
} from "./activity";
import { syncBudget } from "./budget";
import { syncLobbyists } from "./lobbyists";

async function main() {
  const args = new Set(process.argv.slice(2));
  const all =
    !args.has("--members") &&
    !args.has("--votes") &&
    !args.has("--stats") &&
    !args.has("--bills") &&
    !args.has("--activity");
  const started = Date.now();

  if (all || args.has("--members")) {
    await syncFactions();
    const personIds = await syncPersonPositions();
    await syncPositionDescriptions();
    await syncPersons(personIds);
    await syncMkSiteCodes(personIds);
    await enrichFromWikidata();
    markSyncState("members", new Date().toISOString());
  }

  if (all || args.has("--votes")) {
    await syncVoteHeaders();
    await syncVoteResults();
    await syncVoteSubjects();
  }

  if (args.has("--subjects")) {
    await syncVoteSubjects();
  }

  if (all || args.has("--votes") || args.has("--stats")) {
    computeVoteTotals();
    computeMkStats();
  }

  if (all || args.has("--votes") || args.has("--bills")) {
    await syncBills();
  }

  if (all || args.has("--activity")) {
    await syncQueries();
    await syncAgendas();
    await syncCommittees();
    await syncIsraelLaws();
  }

  if (all || args.has("--budget")) {
    await syncBudget();
  }

  if (all || args.has("--lobbyists")) {
    await syncLobbyists();
  }

  // Data text (vote titles, law/committee/budget names) is translated lazily
  // on first view via the unified cache (src/lib/i18n-data.ts) — no batch step.

  console.log(`Sync finished in ${Math.round((Date.now() - started) / 1000)}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

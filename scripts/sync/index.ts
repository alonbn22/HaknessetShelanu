// Sync CLI: pulls Knesset open data + Wikidata into the local SQLite DB.
//
//   npm run update            update EVERYTHING (members, bios, votes, bills,
//                             activity, budget, lobbyists, stats) — same as a
//                             bare `npm run sync`
//   npm run sync -- --members only members/factions/positions + Wikidata + bios
//   npm run sync -- --bio     only refresh Wikidata biographies
//   npm run sync -- --votes   only votes + totals + stats
//   npm run sync -- --stats   only recompute stats/totals
//   npm run sync -- --budget / --activity / --lobbyists  the named section
//
// Vote sync is incremental after the first run (cursor in sync_state).

import {
  syncFactions,
  syncPersonPositions,
  syncMemberPositionHistory,
  syncPositionDescriptions,
  syncPersons,
  syncMkSiteCodes,
  markSyncState,
} from "./members";
import { enrichFromWikidata } from "./wikidata";
import { syncBiography } from "./biography";
import { getDb } from "../../src/db";
import { sql } from "drizzle-orm";
import {
  syncVoteHeaders,
  syncVoteResults,
  syncVoteSubjects,
  remapVoteResultMkIds,
  computeVoteTotals,
} from "./votes";
import { computeMkStats, computeMkAgreement } from "./stats";
import { syncBills } from "./bills";
import {
  syncQueries,
  syncAgendas,
  syncCommittees,
  syncCommitteeSessions,
  syncCommitteeSessionDetails,
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
    await syncMemberPositionHistory(personIds);
    await syncPositionDescriptions();
    await syncPersons(personIds);
    await syncMkSiteCodes(personIds);
    await enrichFromWikidata();
    markSyncState("members", new Date().toISOString());
  }

  // Wikidata biographies (born/education/military/career timeline). Runs with
  // members (uses the QIDs the enrich step just stored) or standalone via --bio.
  if (all || args.has("--members") || args.has("--bio")) {
    await syncBiography();
  }

  if (all || args.has("--votes")) {
    await syncVoteHeaders();
    await syncVoteResults();
    await syncVoteSubjects();
    await remapVoteResultMkIds(); // rebuild mk_id_map + heal raw-MkId rows before stats
  }

  if (args.has("--subjects")) {
    await syncVoteSubjects();
  }

  if (all || args.has("--votes") || args.has("--stats")) {
    computeVoteTotals();
    computeMkStats();
    computeMkAgreement(); // pairwise agreement — feeds "voted most/least similarly"
  }

  if (all || args.has("--votes") || args.has("--bills")) {
    await syncBills();
  }

  if (all || args.has("--activity")) {
    await syncQueries();
    await syncAgendas();
    await syncCommittees();
    await syncCommitteeSessions();
    await syncCommitteeSessionDetails();
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

  // Fold the WAL back into the main DB file so the committed data/knesset.db is
  // self-contained (the deploy/CI commits just that file).
  getDb().run(sql`PRAGMA wal_checkpoint(TRUNCATE)`);

  console.log(`Sync finished in ${Math.round((Date.now() - started) / 1000)}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

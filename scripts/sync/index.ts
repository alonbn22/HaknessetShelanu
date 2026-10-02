// Sync CLI: pulls Knesset open data + Wikidata into the local SQLite DB.
//
//   npm run update / npm run sync   update EVERYTHING
//   npm run sync -- --members       members/factions/positions + Wikidata + bios
//   npm run sync -- --bio           only biographies (Knesset member pages)
//   npm run sync -- --votes         only votes + totals + stats
//   npm run sync -- --stats         only recompute stats/totals
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
  syncOfficialNames,
  markSyncState,
} from "./members";
import { enrichFromWikidata } from "./wikidata";
import { syncKnessetBio } from "./knesset-bio";
import { getDb } from "../../src/db";
import { sql } from "drizzle-orm";
import {
  syncVoteHeaders,
  syncVoteResults,
  syncVoteSubjects,
  remapVoteResultMkIds,
  computeVoteTotals,
  resolveOrphanMkIds,
} from "./votes";
import { computeMkStats, computeMkAgreement } from "./stats";
import { syncBills } from "./bills";
import { syncQueries } from "./queries";
import { syncAgendas } from "./agendas";
import { syncGovMinistries } from "./ministries";
import { syncCommittees } from "./committees";
import { syncCommitteeSessions, syncCommitteeSessionDetails } from "./committee-sessions";
import { syncIsraelLaws } from "./laws";
import { syncBudget } from "./budget";
import { syncLobbyists } from "./lobbyists";

// A slow, slow-moving section (budget, biographies). In a full sync a transient
// failure must NOT discard the whole run (votes/members already synced, old
// values stay valid) — log and continue. Standalone, rethrow for a non-zero exit.
async function softSection(name: string, fn: () => Promise<void>, soft: boolean) {
  try {
    await fn();
  } catch (e) {
    if (!soft) throw e;
    console.error(`  ${name} sync failed (keeping previously-committed data): ${(e as Error).message}`);
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  // Bare `npm run sync` (no flags) runs EVERYTHING; any flag runs only that
  // section. (Enumerating just the "big" flags once left `all` true for the
  // others, silently kicking off a full sync.)
  const all = args.size === 0;
  const started = Date.now();

  if (all || args.has("--members")) {
    await syncFactions();
    const personIds = await syncPersonPositions();
    await syncMemberPositionHistory(personIds);
    await syncPositionDescriptions();
    await syncPersons(personIds);
    await syncMkSiteCodes(personIds);
    await enrichFromWikidata();
    await syncOfficialNames(); // after Wikidata: the Knesset's own spelling wins
    markSyncState("members", new Date().toISOString());
  }

  // Biographies: the Knesset's own, from each member's page on the Knesset
  // website (what the member page shows). Runs with members (uses the site
  // codes just stored) or standalone via --bio. Soft unless run alone: the
  // Knesset website being down must not fail a members sync.
  if (all || args.has("--members") || args.has("--bio")) {
    await softSection("Knesset biography", syncKnessetBio, !args.has("--bio"));
  }

  if (all || args.has("--votes")) {
    await syncVoteHeaders();
    await syncVoteResults();
    await syncVoteSubjects();
    await remapVoteResultMkIds(); // rebuild mk_id_map + heal raw-MkId rows before stats
    await resolveOrphanMkIds(); // MKs who left: raw MkIds the name pass cannot reach
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

  if (all || args.has("--activity") || args.has("--ministries")) {
    // Tiny near-static registry; also standalone via --ministries.
    await syncGovMinistries();
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
    await softSection("budget", syncBudget, all);
  }

  if (all || args.has("--lobbyists")) {
    await syncLobbyists();
  }

  // Data text (vote titles, law/committee/budget names) gets its other
  // languages from checked batches imported into the unified cache
  // (npm run translations:export / translations:import); the site only reads
  // it (src/lib/i18n-data.ts) and shows a miss in Hebrew, marked.

  // Fold the WAL back into the main DB file so the committed data/knesset.db is
  // self-contained (the deploy/CI commits just that file).
  getDb().run(sql`PRAGMA wal_checkpoint(TRUNCATE)`);

  console.log(`Sync finished in ${Math.round((Date.now() - started) / 1000)}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

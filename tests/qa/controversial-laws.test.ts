import { test } from "node:test";
import assert from "node:assert/strict";
import { getControversialLaws } from "../../src/lib/content";
import { sql } from "drizzle-orm";
import { getDb } from "../../src/db";
import { getVote, getFactionTallies, getVoteResults } from "../../src/lib/queries";
import { CURRENT_KNESSET, VOTE_FOR, VOTE_AGAINST } from "../../src/lib/constants";

// The controversial-laws list is editorial and sourced; where a law carries a
// roll-call, that vote must be a real one in the site's record (the 25th
// Knesset), described in Hebrew and English, and the tally the cards show must
// reconcile with the vote's own totals.

const laws = getControversialLaws();

// Wikipedia is an index for finding sources, never a law's source: each law
// cites primary sources only (the Knesset, the law's text, a ruling, IDI, an
// outlet's own report).
test("every controversial law cites primary sources over https and is described in he+en", () => {
  assert.ok(laws.length >= 3);
  for (const law of laws) {
    assert.ok(law.sources.length > 0, `${law.year}: no source`);
    for (const s of law.sources) {
      assert.ok(/^https:\/\//.test(s.url), `${law.year}: source not https: ${s.url}`);
      assert.ok(!/^https:\/\/([a-z]+\.)?(m\.)?wikipedia\.org\//.test(s.url), `${law.year}: Wikipedia is not a source: ${s.url}`);
    }
    assert.ok(law.title.he && law.title.en && law.summary.he && law.summary.en, `${law.year}: missing he/en text`);
  }
});

test("every cited vote is in the Knesset record for the current Knesset and its tallies reconcile", () => {
  for (const law of laws) {
    for (const v of law.votes) {
      const vote = getVote(v.id);
      assert.ok(vote, `${law.year}: vote ${v.id} is not in the record`);
      assert.equal(vote!.knessetNum, CURRENT_KNESSET, `${law.year}: vote ${v.id} is not from the ${CURRENT_KNESSET}th Knesset`);
      assert.ok(v.stage.he && v.stage.en, `${law.year}: vote ${v.id} stage needs he+en`);
      assert.ok(v.source.url.includes(`KNS_PlenumVote(${v.id})`), `${law.year}: vote ${v.id} must cite its own Knesset record`);
      // Faction tallies plus voters the record cannot place in a faction at
      // that moment must equal the vote's own totals — nothing double-counted,
      // nothing invented.
      const tallies = getFactionTallies(v.id);
      let forSum = 0;
      let againstSum = 0;
      for (const t of tallies.values()) {
        forSum += t.for;
        againstSum += t.against;
      }
      // Voters the record knows but cannot place in a faction at that moment…
      const unplaced = getVoteResults(v.id).filter((r) => r.factionId == null);
      forSum += unplaced.filter((r) => r.resultCode === VOTE_FOR).length;
      againstSum += unplaced.filter((r) => r.resultCode === VOTE_AGAINST).length;
      // …and rows still under a raw MkId that joins to nobody (an MK who left;
      // the sync's resolveOrphanMkIds heals these). Counted so the check is exact,
      // and capped so a regression in the sync cannot hide behind it.
      const unmapped = getDb().get<{ f: number; a: number }>(sql`
        SELECT COALESCE(SUM(result_code = ${VOTE_FOR}), 0) AS f, COALESCE(SUM(result_code = ${VOTE_AGAINST}), 0) AS a
        FROM vote_results WHERE vote_id = ${v.id} AND person_id NOT IN (SELECT id FROM persons)`);
      forSum += unmapped?.f ?? 0;
      againstSum += unmapped?.a ?? 0;
      assert.equal(forSum, vote!.totalFor, `${law.year}: vote ${v.id} 'for' tallies (${forSum}) differ from the vote total (${vote!.totalFor})`);
      assert.equal(againstSum, vote!.totalAgainst, `${law.year}: vote ${v.id} 'against' tallies (${againstSum}) differ from the vote total (${vote!.totalAgainst})`);
      assert.equal((unmapped?.f ?? 0) + (unmapped?.a ?? 0), 0, `${law.year}: vote ${v.id} has ${(unmapped?.f ?? 0) + (unmapped?.a ?? 0)} voters the record cannot name — run the vote sync's orphan repair (fix-mkids.ts)`);
    }
  }
});

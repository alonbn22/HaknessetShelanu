import { test } from "node:test";
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { getDb } from "../../src/db";
import {
  getVotingAgreement,
  getPartyDiscipline,
  getBillVotes,
  getAttendanceTable,
  searchAll,
} from "../../src/lib/queries";
import { voteKind } from "../../src/lib/votes-meta";

// Fixtures are picked from the live DB at runtime (no hardcoded ids/names), so
// the tests keep passing as the data refreshes.
const db = getDb();
const topVoters = db.all<{ person_id: number }>(
  sql`SELECT person_id FROM mk_vote_stats WHERE knesset_num = 25
      ORDER BY participated DESC LIMIT 2`,
);
const [mkA, mkB] = topVoters.map((r) => r.person_id);

test("voting agreement is symmetric", () => {
  const ab = getVotingAgreement(mkA, mkB);
  const ba = getVotingAgreement(mkB, mkA);
  assert.deepEqual(ab, ba);
  assert.ok(ab.bothVoted > 0, "two top participants must share votes");
});

test("self-agreement is 100%", () => {
  const self = getVotingAgreement(mkA, mkA);
  assert.ok(self.bothVoted > 0);
  assert.equal(self.agreementPct, 100);
  assert.equal(self.agreed, self.bothVoted);
});

test("agreement percentage stays within 0..100 and agreed <= bothVoted", () => {
  const r = getVotingAgreement(mkA, mkB);
  assert.ok(r.agreementPct >= 0 && r.agreementPct <= 100, `pct=${r.agreementPct}`);
  assert.ok(r.agreed <= r.bothVoted);
});

test("party discipline: sitting MK has data within bounds; unknown person is null", () => {
  const sitting = getAttendanceTable();
  assert.ok(sitting.length > 0);
  const d = getPartyDiscipline(sitting[0].personId);
  assert.ok(d, "a sitting MK must have a discipline figure");
  assert.ok(d!.total > 0);
  assert.ok(d!.withParty <= d!.total);
  assert.ok(d!.pct >= 0 && d!.pct <= 100, `pct=${d!.pct}`);
  assert.equal(getPartyDiscipline(1), null, "person with no faction/votes -> null");
});

test("bill votes are scoped to the bill and ordered by date", () => {
  // The most-voted bill (e.g. a budget law) exercises the join hardest.
  const top = db.get<{ item_id: number; c: number }>(
    sql`SELECT item_id, COUNT(*) AS c FROM votes
        WHERE item_id IS NOT NULL GROUP BY item_id ORDER BY c DESC LIMIT 1`,
  );
  assert.ok(top && top.c >= 3, "expected at least one bill with several votes");
  const votes = getBillVotes(top!.item_id);
  assert.equal(votes.length, top!.c);
  for (const v of votes) assert.equal(v.itemId, top!.item_id);
  for (let i = 1; i < votes.length; i++) {
    assert.ok(
      String(votes[i - 1].dateTime) <= String(votes[i].dateTime),
      "votes must be in ascending date order",
    );
  }
});

test("bill journey: the most-voted bill classifies into at least two milestone stages", () => {
  const top = db.get<{ item_id: number }>(
    sql`SELECT item_id FROM votes WHERE item_id IS NOT NULL
        GROUP BY item_id ORDER BY COUNT(*) DESC LIMIT 1`,
  );
  const milestones = new Set(["preliminary", "committeeReferral", "first", "second", "second_third", "third"]);
  const stages = new Set(
    getBillVotes(top!.item_id)
      .map((v) => voteKind(v.forDesc, v.titleHe))
      .filter((k) => milestones.has(k)),
  );
  assert.ok(stages.size >= 2, `expected >=2 stages, got ${[...stages].join(",")}`);
});

test("searchAll finds a current member by their Hebrew name", () => {
  const person = db.get<{ id: number; name: string }>(
    sql`SELECT p.id, p.first_name_he || ' ' || p.last_name_he AS name
        FROM persons p WHERE p.is_current = 1 LIMIT 1`,
  );
  assert.ok(person);
  const r = searchAll(person!.name, [], "he");
  assert.ok(
    r.members.some((m) => m.id === person!.id),
    `member ${person!.id} not found for own name`,
  );
});

test("searchAll returns empty groups for an empty query", () => {
  const r = searchAll("", [], "he");
  assert.equal(r.members.length, 0);
  assert.equal(r.votes.length, 0);
  assert.equal(r.bills.length, 0);
  assert.deepEqual(r.hasMore, {});
});

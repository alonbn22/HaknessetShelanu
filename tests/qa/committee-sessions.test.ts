import { test } from "node:test";
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { getDb } from "../../src/db";
import { getCommitteeSessions, getCommitteeSessionDetails } from "../../src/lib/queries";

// Committee sessions are the newest feature and had a timezone bug: stored
// start_date carries a local +02:00/+03:00 offset while the caller passes a UTC
// 'Z' now, so a lexical string compare misfiled meetings across the offset window.
// getCommitteeSessions now compares normalized instants (datetime()). These tests
// pin that behaviour + the agenda/doc ordering contracts.

const db = getDb();
const COMMITTEE = 4186; // the committee with the most sittings

test("committee fixtures exist (sanity)", () => {
  const n = db.get<{ n: number }>(
    sql`SELECT COUNT(*) n FROM committee_sessions WHERE committee_id = ${COMMITTEE}`,
  )?.n;
  assert.ok(n && n > 50, "expected a committee with many sessions");
});

test("upcoming/recent split compares instants, not offset strings", () => {
  // Sample real session times spanning both offsets, plus 'now'.
  const sampleTimes = db
    .all<{ s: string }>(
      sql`SELECT start_date s FROM committee_sessions
          WHERE committee_id = ${COMMITTEE} AND start_date IS NOT NULL
          ORDER BY start_date LIMIT 200`,
    )
    .map((r) => r.s);
  assert.ok(sampleTimes.length > 0, "no session start dates");

  // For each candidate 'now' (as a UTC 'Z' instant — the textual form the page
  // passes), every upcoming session must be strictly later and every recent one
  // at-or-earlier, as INSTANTS. The pre-fix lexical compare violated this.
  const nows = [
    new Date().toISOString(),
    ...[0, Math.floor(sampleTimes.length / 2), sampleTimes.length - 1].map((i) =>
      new Date(Date.parse(sampleTimes[i])).toISOString(),
    ),
  ];
  for (const now of nows) {
    const nowMs = Date.parse(now);
    const { upcoming, recent } = getCommitteeSessions(COMMITTEE, now);
    for (const s of upcoming) {
      assert.ok(
        Date.parse(s.startDate!) > nowMs,
        `upcoming session ${s.id} (${s.startDate}) is not after now ${now}`,
      );
    }
    for (const s of recent) {
      assert.ok(
        Date.parse(s.startDate!) <= nowMs,
        `recent session ${s.id} (${s.startDate}) is not at/before now ${now}`,
      );
    }
  }
});

test("getCommitteeSessions returns a total and bounded lists", () => {
  const { upcoming, recent, total } = getCommitteeSessions(COMMITTEE, new Date().toISOString());
  assert.ok(total >= upcoming.length + recent.length - 16, "total should count all sittings");
  assert.ok(upcoming.length <= 8 && recent.length <= 8, "lists are limit-bounded");
});

test("agenda items come back ordered by their agenda ordinal", () => {
  const sid = db.get<{ sid: number }>(
    sql`SELECT session_id sid FROM committee_session_items
        WHERE ordinal IS NOT NULL GROUP BY session_id HAVING COUNT(*) >= 2 LIMIT 1`,
  )?.sid;
  assert.ok(sid, "no session with >=2 ordered items");
  const items = getCommitteeSessionDetails([sid!]).items.get(sid!) ?? [];
  assert.ok(items.length >= 2);
  for (let i = 1; i < items.length; i++) {
    assert.ok(
      (items[i - 1].ordinal ?? 0) <= (items[i].ordinal ?? 0),
      "items not sorted by ordinal",
    );
  }
});

test("the protocol document (group 23) is listed first", () => {
  const sid = db.get<{ sid: number }>(
    sql`SELECT session_id sid FROM committee_session_docs WHERE group_type_id = 23
        AND session_id IN (SELECT session_id FROM committee_session_docs GROUP BY session_id HAVING COUNT(*) >= 2)
        LIMIT 1`,
  )?.sid;
  assert.ok(sid, "no session with a protocol + other docs");
  const docs = getCommitteeSessionDetails([sid!]).docs.get(sid!) ?? [];
  assert.ok(docs.length >= 2);
  assert.equal(docs[0].groupTypeId, 23, "protocol/transcript must sort first");
});

test("empty session id list yields empty maps (no query)", () => {
  const { items, docs } = getCommitteeSessionDetails([]);
  assert.equal(items.size, 0);
  assert.equal(docs.size, 0);
});

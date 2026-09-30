import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isServingMember,
  vacatedSeatAsMinister,
  getMemberQuestionStats,
  getMemberRecentAgendas,
  getMemberRebellions,
  getPartyDiscipline,
  type PositionRow,
} from "../../src/lib/queries";
import { getDb } from "../../src/db";
import { sql } from "drizzle-orm";
import { localizeMemberRecord, type MemberRecord } from "../../src/lib/content";
import {
  CURRENT_KNESSET,
  POSITION_MK_MALE,
  POSITION_FACTION_MEMBER,
} from "../../src/lib/constants";

// isServingMember and localizeMemberRecord were inlined in the 600-line member
// page (untestable there). They carry real contracts: the Norwegian-Law "serving
// vs former" call is legally sensitive, and the record localizer must never lose
// a claim's Hebrew source text.

const pos = (o: Partial<PositionRow>): PositionRow => ({
  id: 1,
  personId: 1,
  positionId: POSITION_MK_MALE,
  positionDescHe: null,
  knessetNum: CURRENT_KNESSET,
  factionId: null,
  factionNameHe: null,
  govMinistryNameHe: null,
  committeeId: null,
  committeeNameHe: null,
  startDate: null,
  finishDate: null,
  isCurrent: false,
  lastUpdated: null,
  ...o,
});

test("a sitting MK is serving", () => {
  assert.equal(isServingMember([pos({ positionId: POSITION_MK_MALE, isCurrent: true })]), true);
});

test("Norwegian-Law minister (vacated seat, still a current minister) is serving", () => {
  // No current MK seat, but a current-Knesset position with a ministry.
  const positions = [
    pos({ positionId: POSITION_MK_MALE, isCurrent: false, finishDate: "2023-01-01" }),
    pos({ positionId: 30, isCurrent: true, govMinistryNameHe: "משרד" }),
  ];
  assert.equal(isServingMember(positions), true);
});

test("a current faction member is serving", () => {
  assert.equal(
    isServingMember([pos({ positionId: POSITION_FACTION_MEMBER, isCurrent: true })]),
    true,
  );
});

test("a former MK with only past positions is NOT serving", () => {
  const positions = [
    pos({ positionId: POSITION_MK_MALE, isCurrent: false, knessetNum: 24 }),
    pos({ positionId: POSITION_FACTION_MEMBER, isCurrent: false, knessetNum: 24 }),
  ];
  assert.equal(isServingMember(positions), false);
});

test("a non-current position in the current Knesset does not count as serving", () => {
  assert.equal(
    isServingMember([pos({ knessetNum: CURRENT_KNESSET, isCurrent: false })]),
    false,
  );
});

// "Vacated the seat under the Norwegian Law" is shown only when the seat ended
// while the person held a ministry — a later portfolio included (Eli Cohen left
// the seat as foreign minister and now holds another ministry).
test("Norwegian-Law label needs the seat to end during a ministry", () => {
  const seatEnded = pos({ positionId: POSITION_MK_MALE, finishDate: "2023-02-15T00:00:00+02:00" });
  const minister = (startDate: string, finishDate: string | null) =>
    pos({ positionId: 39, govMinistryNameHe: "משרד", startDate, finishDate, isCurrent: finishDate == null });
  assert.equal(vacatedSeatAsMinister([seatEnded, minister("2022-12-29T00:00:00+02:00", null)]), true);
  assert.equal(
    vacatedSeatAsMinister([
      seatEnded,
      minister("2022-12-29T00:00:00+02:00", "2024-01-01T00:00:00+02:00"),
      minister("2024-01-01T00:00:00+02:00", null),
    ]),
    true,
  );
  // Appointed after leaving the Knesset, or never held a seat this Knesset.
  assert.equal(vacatedSeatAsMinister([seatEnded, minister("2024-01-01T00:00:00+02:00", null)]), false);
  assert.equal(vacatedSeatAsMinister([minister("2024-01-01T00:00:00+02:00", null)]), false);
});

// --- localizeMemberRecord ---

const rec = (): MemberRecord => ({
  personId: 1,
  claims: [
    {
      kind: "positive",
      category: "achievement",
      title: { he: "כותרת", en: "Headline" },
      sources: [{ url: "https://example.org", title: "src" }],
    },
    {
      kind: "negative",
      category: "controversy",
      title: { he: "מחלוקת" }, // only Hebrew
      sources: [{ url: "https://example.org", title: "src" }],
    },
  ],
});

test("localizeMemberRecord returns the record untouched for he", () => {
  const r = rec();
  assert.equal(localizeMemberRecord(r, "he", new Map()), r);
});

test("localizeMemberRecord prefers curated locale text, then cache, then Hebrew", () => {
  const cache = new Map([["מחלוקת", { text: "Dispute" }]]);
  const out = localizeMemberRecord(rec(), "en", cache)!;
  // claim 1 has a curated en → used as-is
  assert.equal((out.claims[0].title as Record<string, string>).en, "Headline");
  // claim 2 has no en → filled from the cache
  assert.equal((out.claims[1].title as Record<string, string>).en, "Dispute");
});

test("localizeMemberRecord falls back to Hebrew when neither locale nor cache has it", () => {
  const out = localizeMemberRecord(rec(), "ar", new Map())!;
  assert.equal((out.claims[1].title as Record<string, string>).ar, "מחלוקת");
});

test("localizeMemberRecord never drops the Hebrew source text", () => {
  const out = localizeMemberRecord(rec(), "ru", new Map())!;
  for (const c of out.claims) assert.ok(c.title.he, "he text must survive");
});

// --- question accountability + agenda motions (live DB) ---

test("getMemberQuestionStats: answered <= total and sane response times", () => {
  const db = getDb();
  const pid = db.get<{ p: number }>(
    sql`SELECT person_id p FROM queries WHERE reply_date IS NOT NULL GROUP BY person_id ORDER BY COUNT(*) DESC LIMIT 1`,
  )?.p;
  assert.ok(pid, "no MK with answered questions in the DB");
  const s = getMemberQuestionStats(pid!)!;
  assert.ok(s.total > 0 && s.answered > 0);
  assert.ok(s.answered <= s.total, "answered cannot exceed total");
  assert.ok(s.avgResponseDays != null && s.avgResponseDays >= 0, "avg days must be non-negative");
  // No questions → null, not a zero-filled object.
  assert.equal(getMemberQuestionStats(-1), null);
});

test("getMemberRebellions reconciles with the party-discipline metric", () => {
  const db = getDb();
  // A current MK with recorded votes (highest participation → stable fixture).
  const pid = db.get<{ p: number }>(
    sql`SELECT person_id p FROM mk_vote_stats WHERE knesset_num = 25
        ORDER BY participated DESC LIMIT 1`,
  )!.p;
  const d = getPartyDiscipline(pid);
  assert.ok(d, "expected discipline stats for the fixture MK");
  const expectedBreaks = d!.total - d!.withParty;
  const rebels = getMemberRebellions(pid, 100000);
  // Same CTEs on both sides — the list length must equal total - withParty.
  assert.equal(rebels.length, expectedBreaks, "rebellion list must reconcile with the %");
  for (const r of rebels.slice(0, 20)) {
    assert.notEqual(r.mkCode, r.factionCode, "every listed vote must be an actual break");
    assert.ok(r.dateTime, "vote must carry its date");
  }
  // The default limit caps the list.
  assert.ok(getMemberRebellions(pid, 10).length <= 10);
});

test("getMemberRecentAgendas returns the MK's motions with Hebrew names", () => {
  const db = getDb();
  const pid = db.get<{ p: number }>(
    sql`SELECT initiator_person_id p FROM agendas
        WHERE initiator_person_id IS NOT NULL AND name_he != ''
        GROUP BY initiator_person_id ORDER BY COUNT(*) DESC LIMIT 1`,
  )?.p;
  assert.ok(pid, "no agenda motions in the DB");
  const rows = getMemberRecentAgendas(pid!, 6);
  assert.ok(rows.length > 0 && rows.length <= 6);
  for (const r of rows) {
    assert.equal(r.initiatorPersonId, pid);
    assert.ok(r.nameHe, "motion must carry its Hebrew subject");
  }
});

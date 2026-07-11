import { test } from "node:test";
import assert from "node:assert/strict";
import { isServingMember, type PositionRow } from "../../src/lib/queries";
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

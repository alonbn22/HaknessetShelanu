import { cache } from "react";
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getCoalitionConfig, getFactionMeta } from "./content";
import {
  CURRENT_KNESSET,
  MK_POSITION_IDS,
  POSITION_FACTION_MEMBER,
  POSITION_MK_MALE,
  POSITION_MK_FEMALE,
  VOTE_DID_NOT_VOTE,
} from "./constants";

export type Person = typeof schema.persons.$inferSelect;
export type Faction = typeof schema.factions.$inferSelect;
export type Vote = typeof schema.votes.$inferSelect;

// ---------- localized display helpers ----------

export function personName(p: Person, locale: string): string {
  const hebrew = `${p.firstNameHe} ${p.lastNameHe}`;
  if (locale === "he") return hebrew;
  const localized =
    locale === "en" ? p.nameEn : locale === "ar" ? p.nameAr : p.nameRu;
  return localized ?? p.nameEn ?? hebrew;
}

export function factionName(factionId: number, fallbackHe: string, locale: string): string {
  const meta = getFactionMeta().get(factionId);
  if (!meta) return fallbackHe;
  return (meta[locale as "he" | "en" | "ar" | "ru"] as string) ?? meta.he;
}

export function factionColor(factionId: number): string {
  return getFactionMeta().get(factionId)?.color ?? "#999999";
}

// Vote/data titles are localized via the unified cache (src/lib/i18n-data.ts).

// Faction ids whose display name (any language) contains the query —
// lets the member search match by party name across locales.
export function matchFactionIds(query: string): number[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const ids: number[] = [];
  for (const [id, meta] of getFactionMeta()) {
    if (
      [meta.he, meta.en, meta.ar, meta.ru].some((n) =>
        n.toLowerCase().includes(q),
      )
    ) {
      ids.push(id);
    }
  }
  return ids;
}

// ---------- factions ----------

export type FactionWithSeats = Faction & {
  seats: number;
  isCoalition: boolean;
};

export function getCurrentFactionsWithSeats(): FactionWithSeats[] {
  const db = getDb();
  const coalitionIds = new Set(getCoalitionConfig().coalitionFactionIds);
  const rows = db
    .select({
      faction: schema.factions,
      seats: sql<number>`COUNT(DISTINCT ${schema.personPositions.personId})`,
    })
    .from(schema.factions)
    .innerJoin(
      schema.personPositions,
      and(
        eq(schema.personPositions.factionId, schema.factions.id),
        eq(schema.personPositions.positionId, POSITION_FACTION_MEMBER),
        eq(schema.personPositions.isCurrent, true),
      ),
    )
    .where(
      and(
        eq(schema.factions.knessetNum, CURRENT_KNESSET),
        eq(schema.factions.isCurrent, true),
      ),
    )
    .groupBy(schema.factions.id)
    .all();
  return rows
    .map((r) => ({
      ...r.faction,
      seats: r.seats,
      isCoalition: coalitionIds.has(r.faction.id),
    }))
    .filter((f) => f.seats > 0)
    .sort((a, b) => b.seats - a.seats);
}

export function getFaction(id: number): Faction | undefined {
  return getDb().select().from(schema.factions).where(eq(schema.factions.id, id)).get();
}

// ---------- members ----------

export type MemberListItem = Person & {
  factionId: number | null;
  factionNameHe: string | null;
  isSitting: boolean;
  leftDate: string | null; // date they stopped sitting (if not currently sitting)
  ministryHe: string | null; // current ministry, if a serving minister
};

export type SeatStatus = {
  isSitting: boolean;
  leftDate: string | null;
  ministryHe: string | null; // current ministry, if they serve as a minister
};

// Seat status per person for the current Knesset. A minister who vacated their
// seat under the Norwegian Law is NOT a sitting MK, but is a serving minister —
// so we capture the current ministry rather than calling them "former".
function getSeatStatusMap(personIds: number[]): Map<number, SeatStatus> {
  const map = new Map<number, SeatStatus>();
  if (personIds.length === 0) return map;
  const seatPositions = new Set<number>([POSITION_FACTION_MEMBER, ...MK_POSITION_IDS]);
  const rows = getDb()
    .select({
      personId: schema.personPositions.personId,
      positionId: schema.personPositions.positionId,
      isCurrent: schema.personPositions.isCurrent,
      finishDate: schema.personPositions.finishDate,
      ministry: schema.personPositions.govMinistryNameHe,
    })
    .from(schema.personPositions)
    .where(
      and(
        eq(schema.personPositions.knessetNum, CURRENT_KNESSET),
        inArray(schema.personPositions.personId, personIds),
      ),
    )
    .all();
  for (const r of rows) {
    const cur =
      map.get(r.personId) ?? { isSitting: false, leftDate: null, ministryHe: null };
    if (r.isCurrent && seatPositions.has(r.positionId)) cur.isSitting = true;
    if (r.isCurrent && r.ministry) cur.ministryHe = r.ministry;
    if (
      seatPositions.has(r.positionId) &&
      r.finishDate &&
      (!cur.leftDate || r.finishDate > cur.leftDate)
    ) {
      cur.leftDate = r.finishDate;
    }
    map.set(r.personId, cur);
  }
  // Sitting members shouldn't show a "left" date.
  for (const v of map.values()) if (v.isSitting) v.leftDate = null;
  return map;
}

// All people who served in the current Knesset (sitting MKs + those who left
// their seat, e.g. ministers), each with their faction and seat status.
export function getCurrentMembers(filters?: {
  factionId?: number;
  bloc?: "coalition" | "opposition";
  search?: string;
}): MemberListItem[] {
  const db = getDb();
  const coalitionIds = new Set(getCoalitionConfig().coalitionFactionIds);

  const conditions = [
    eq(schema.personPositions.positionId, POSITION_FACTION_MEMBER),
    eq(schema.personPositions.knessetNum, CURRENT_KNESSET),
    eq(schema.persons.isCurrent, true),
  ];
  if (filters?.search) {
    const q = `%${filters.search}%`;
    const factionIds = matchFactionIds(filters.search);
    conditions.push(
      or(
        like(sql`${schema.persons.firstNameHe} || ' ' || ${schema.persons.lastNameHe}`, q),
        like(schema.persons.nameEn, q),
        like(schema.persons.nameAr, q),
        like(schema.persons.nameRu, q),
        like(schema.personPositions.factionNameHe, q),
        factionIds.length
          ? inArray(schema.personPositions.factionId, factionIds)
          : sql`0`,
      )!,
    );
  }

  const persons = db
    .selectDistinct({ person: schema.persons })
    .from(schema.persons)
    .innerJoin(
      schema.personPositions,
      eq(schema.personPositions.personId, schema.persons.id),
    )
    .where(and(...conditions))
    .all()
    .map((r) => r.person);

  const ids = persons.map((p) => p.id);
  const factions = getLatestFactionMap(ids);
  const seatStatus = getSeatStatusMap(ids);

  let items = persons.map((p) => {
    const f = factions.get(p.id);
    const s = seatStatus.get(p.id);
    return {
      ...p,
      factionId: f?.id ?? null,
      factionNameHe: f?.nameHe ?? null,
      isSitting: s?.isSitting ?? false,
      leftDate: s?.leftDate ?? null,
      ministryHe: s?.ministryHe ?? null,
    };
  });

  if (filters?.factionId) {
    items = items.filter((m) => m.factionId === filters.factionId);
  }
  if (filters?.bloc) {
    items = items.filter((m) =>
      m.factionId != null && coalitionIds.has(m.factionId)
        ? filters.bloc === "coalition"
        : filters.bloc === "opposition",
    );
  }

  // Sitting members first, then alphabetical.
  return items.sort(
    (a, b) =>
      Number(b.isSitting) - Number(a.isSitting) ||
      a.lastNameHe.localeCompare(b.lastNameHe, "he"),
  );
}

export function getMember(id: number): Person | undefined {
  return getDb().select().from(schema.persons).where(eq(schema.persons.id, id)).get();
}

type CareerEntry = { title: string; start: string | null; end: string | null };
export type CareerRange = { start: string | null; end: string | null };
export type CareerRole = { title: string; ranges: CareerRange[] };
export type MemberBio = {
  wikidataId: string | null;
  dateOfBirth: string | null;
  birthPlaceHe: string | null;
  educationHe: string | null;
  occupationsHe: string | null;
  militaryHe: string | null;
  career: CareerRole[];
};

// Collapse the raw position tenures into one entry per role, merging contiguous
// terms (e.g. consecutive Knesset terms) but keeping genuinely separate stints
// (e.g. non-consecutive PM terms) as distinct ranges. Most-recent role first.
function groupCareer(entries: CareerEntry[]): CareerRole[] {
  const byTitle = new Map<string, CareerRange[]>();
  for (const e of entries) {
    const arr = byTitle.get(e.title) ?? [];
    arr.push({ start: e.start, end: e.end });
    byTitle.set(e.title, arr);
  }
  const contiguous = (prevEnd: string, nextStart: string) =>
    (Date.parse(nextStart) - Date.parse(prevEnd)) / 86_400_000 <= 45; // election gap
  const roles: CareerRole[] = [];
  for (const [title, raw] of byTitle) {
    raw.sort((a, b) => (a.start ?? "9999").localeCompare(b.start ?? "9999"));
    const ranges: CareerRange[] = [];
    for (const r of raw) {
      const last = ranges[ranges.length - 1];
      if (last && (last.end === null || (r.start && contiguous(last.end, r.start)))) {
        if (r.end === null) last.end = null; // open/"present" wins
        else if (last.end !== null && r.end > last.end) last.end = r.end;
      } else {
        ranges.push({ ...r });
      }
    }
    roles.push({ title, ranges });
  }
  const latest = (r: CareerRole) =>
    r.ranges.reduce((m, x) => (x.start && x.start > m ? x.start : m), "");
  roles.sort((a, b) => latest(b).localeCompare(latest(a)));
  return roles;
}

// Wikidata-sourced biography (born/education/military/career timeline). Returns
// null if the member has no bio yet (or the table predates a sync).
export function getMemberBio(personId: number): MemberBio | null {
  try {
    const row = getDb()
      .select()
      .from(schema.personBio)
      .where(eq(schema.personBio.personId, personId))
      .get();
    if (!row) return null;
    let raw: CareerEntry[] = [];
    try {
      raw = row.careerJson ? (JSON.parse(row.careerJson) as CareerEntry[]) : [];
    } catch {
      raw = [];
    }
    return {
      wikidataId: row.wikidataId,
      dateOfBirth: row.dateOfBirth,
      birthPlaceHe: row.birthPlaceHe,
      educationHe: row.educationHe,
      occupationsHe: row.occupationsHe,
      militaryHe: row.militaryHe,
      career: groupCareer(raw),
    };
  } catch {
    return null; // table not present yet (pre-sync DB)
  }
}

export type PositionRow = typeof schema.personPositions.$inferSelect;

export function getMemberPositions(personId: number): PositionRow[] {
  return getDb()
    .select()
    .from(schema.personPositions)
    .where(
      and(
        eq(schema.personPositions.personId, personId),
        eq(schema.personPositions.knessetNum, CURRENT_KNESSET),
      ),
    )
    .all()
    .sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""));
}

export function isCurrentMk(positions: PositionRow[]): boolean {
  return positions.some(
    (p) => MK_POSITION_IDS.includes(p.positionId) && p.isCurrent,
  );
}

// ---------- vote stats ----------

export type MkStats = typeof schema.mkVoteStats.$inferSelect;

export function getMemberStats(personId: number): MkStats | undefined {
  return getDb()
    .select()
    .from(schema.mkVoteStats)
    .where(
      and(
        eq(schema.mkVoteStats.personId, personId),
        eq(schema.mkVoteStats.knessetNum, CURRENT_KNESSET),
      ),
    )
    .get();
}

export type LeaderboardEntry = MkStats & { person: Person };

// SQL predicate: the person currently holds a Knesset seat (faction-member or
// MK position) — i.e. a serving MK, excluding those who left their seat under
// the Norwegian Law. Shared by every attendance/participation query so all
// stats reflect only currently-serving members.
const isSittingSql = sql`EXISTS (
  SELECT 1 FROM person_positions pp
  WHERE pp.person_id = ${schema.mkVoteStats.personId}
    AND pp.knesset_num = ${CURRENT_KNESSET}
    AND pp.is_current = 1
    AND pp.position_id IN (${POSITION_FACTION_MEMBER}, ${POSITION_MK_MALE}, ${POSITION_MK_FEMALE})
)`;

export function getParticipationLeaderboard(
  order: "top" | "bottom",
  limit = 5,
): LeaderboardEntry[] {
  const db = getDb();
  const rows = db
    .select({ stats: schema.mkVoteStats, person: schema.persons })
    .from(schema.mkVoteStats)
    .innerJoin(schema.persons, eq(schema.persons.id, schema.mkVoteStats.personId))
    .where(
      and(
        eq(schema.mkVoteStats.knessetNum, CURRENT_KNESSET),
        eq(schema.persons.isCurrent, true),
        isSittingSql,
        sql`${schema.mkVoteStats.votesHeld} > 100`,
      ),
    )
    .orderBy(
      order === "top"
        ? desc(schema.mkVoteStats.participationPct)
        : schema.mkVoteStats.participationPct,
    )
    .limit(limit)
    .all();
  return rows.map((r) => ({ ...r.stats, person: r.person }));
}

export type AttendanceRow = MkStats & {
  person: Person;
  factionId: number | null;
  factionNameHe: string | null;
  isSitting: boolean;
  leftDate: string | null;
  ministryHe: string | null;
};

// Full attendance ranking for ALL currently-serving MKs, in one list ordered by
// participation (most present first). Only members who currently hold a seat are
// included — every attendance statistic on the site reflects serving members
// only (members who left their seat, e.g. Norwegian-Law ministers, are excluded).
export function getAttendanceTable(): AttendanceRow[] {
  const db = getDb();
  const rows = db
    .select({ stats: schema.mkVoteStats, person: schema.persons })
    .from(schema.mkVoteStats)
    .innerJoin(schema.persons, eq(schema.persons.id, schema.mkVoteStats.personId))
    .where(
      and(
        eq(schema.mkVoteStats.knessetNum, CURRENT_KNESSET),
        eq(schema.persons.isCurrent, true),
        isSittingSql,
        sql`${schema.mkVoteStats.votesHeld} > 50`,
      ),
    )
    .orderBy(desc(schema.mkVoteStats.participationPct))
    .all();
  // Resolve faction (current seat preferred, else latest) + seat status.
  const ids = rows.map((r) => r.person.id);
  const factions = getLatestFactionMap(ids);
  const seat = getSeatStatusMap(ids);
  return rows.map((r) => ({
    ...r.stats,
    person: r.person,
    factionId: factions.get(r.person.id)?.id ?? null,
    factionNameHe: factions.get(r.person.id)?.nameHe ?? null,
    isSitting: seat.get(r.person.id)?.isSitting ?? false,
    leftDate: seat.get(r.person.id)?.leftDate ?? null,
    ministryHe: seat.get(r.person.id)?.ministryHe ?? null,
  }));
}

// Latest faction (id + Hebrew name) per person for the current Knesset —
// prefers the current faction-member row, else the most recent one.
export function getLatestFactionMap(
  personIds: number[],
): Map<number, { id: number; nameHe: string | null }> {
  const map = new Map<number, { id: number; nameHe: string | null }>();
  if (personIds.length === 0) return map;
  const rows = getDb()
    .select({
      personId: schema.personPositions.personId,
      factionId: schema.personPositions.factionId,
      factionNameHe: schema.personPositions.factionNameHe,
      isCurrent: schema.personPositions.isCurrent,
      startDate: schema.personPositions.startDate,
    })
    .from(schema.personPositions)
    .where(
      and(
        eq(schema.personPositions.positionId, POSITION_FACTION_MEMBER),
        eq(schema.personPositions.knessetNum, CURRENT_KNESSET),
        inArray(schema.personPositions.personId, personIds),
      ),
    )
    .all()
    // current first, then most recent.
    .sort(
      (a, b) =>
        Number(b.isCurrent) - Number(a.isCurrent) ||
        (b.startDate ?? "").localeCompare(a.startDate ?? ""),
    );
  for (const r of rows) {
    if (r.factionId != null && !map.has(r.personId)) {
      map.set(r.personId, { id: r.factionId, nameHe: r.factionNameHe });
    }
  }
  return map;
}

// ---------- votes ----------

export function getMemberRecentVotes(personId: number, limit = 10) {
  return getDb()
    .select({ vote: schema.votes, resultCode: schema.voteResults.resultCode })
    .from(schema.voteResults)
    .innerJoin(schema.votes, eq(schema.votes.id, schema.voteResults.voteId))
    .where(eq(schema.voteResults.personId, personId))
    .orderBy(desc(schema.votes.dateTime))
    .limit(limit)
    .all();
}

const VOTES_PAGE_SIZE = 25;

// Build a vote-title search predicate that works in any language: the user's
// query is translated to Hebrew (searchHe) and matched against the always-present
// titleHe, plus the raw query (for names/numbers that shouldn't be translated).
function titleSearchCondition(search: string, searchHe?: string) {
  const terms = [like(schema.votes.titleHe, `%${searchHe || search}%`)];
  if (searchHe && searchHe !== search) terms.push(like(schema.votes.titleHe, `%${search}%`));
  return or(...terms)!;
}

export function getVotesPage(page: number, search?: string, searchHe?: string) {
  const db = getDb();
  const conditions = [eq(schema.votes.knessetNum, CURRENT_KNESSET)];
  if (search) {
    conditions.push(titleSearchCondition(search, searchHe));
  }
  const where = and(...conditions);
  const total =
    db
      .select({ n: sql<number>`COUNT(*)` })
      .from(schema.votes)
      .where(where)
      .get()?.n ?? 0;
  const items = db
    .select()
    .from(schema.votes)
    .where(where)
    .orderBy(desc(schema.votes.dateTime))
    .limit(VOTES_PAGE_SIZE)
    .offset((page - 1) * VOTES_PAGE_SIZE)
    .all();
  return { items, total, pages: Math.max(1, Math.ceil(total / VOTES_PAGE_SIZE)) };
}

// Cached per-request: the vote-detail page calls this directly and again via
// getVoteResults, so React.cache dedups the identical PK lookup within a render.
export const getVote = cache((id: number): Vote | undefined => {
  return getDb().select().from(schema.votes).where(eq(schema.votes.id, id)).get();
});

// Recent legislation: bill-reading votes (the "for" option mentions a reading
// stage), split into passed and rejected. These are the votes that make law.
export function getRecentLawVotes(limit = 15): { passed: Vote[]; rejected: Vote[] } {
  const db = getDb();
  const isReading = sql`${schema.votes.forDesc} LIKE '%קריאה%'`;
  const base = (accepted: boolean) =>
    db
      .select()
      .from(schema.votes)
      .where(
        and(
          eq(schema.votes.knessetNum, CURRENT_KNESSET),
          isReading,
          eq(schema.votes.isAccepted, accepted),
        ),
      )
      .orderBy(desc(schema.votes.dateTime))
      .limit(limit)
      .all();
  return { passed: base(true), rejected: base(false) };
}

export type LawStatus = "all" | "passed" | "rejected" | "raised" | "final";

const LAWS_PAGE_SIZE = 20;

// Searchable, filterable legislation list.
// status: passed / rejected (outcome), raised (preliminary/first reading),
// final (second/third reading — the bill's final approval stage).
export function getLawVotesPage(opts: {
  search?: string;
  searchHe?: string; // query translated to Hebrew (matches the always-present titleHe)
  status?: LawStatus;
  page?: number;
  locale?: string;
}) {
  const db = getDb();
  const page = Math.max(1, opts.page ?? 1);
  const status = opts.status ?? "all";

  const conditions = [
    eq(schema.votes.knessetNum, CURRENT_KNESSET),
    sql`${schema.votes.forDesc} LIKE '%קריאה%'`, // bill-reading votes = legislation
  ];

  if (status === "passed") conditions.push(eq(schema.votes.isAccepted, true));
  else if (status === "rejected") conditions.push(eq(schema.votes.isAccepted, false));
  else if (status === "raised")
    // "raised": a bill being introduced — preliminary reading.
    conditions.push(
      sql`(${schema.votes.forDesc} LIKE '%טרומית%' OR ${schema.votes.forDesc} LIKE '%להכנה לקריאה ראשונה%' OR ${schema.votes.forDesc} LIKE '%לקריאה ראשונה%')`,
    );
  else if (status === "final")
    conditions.push(sql`${schema.votes.forDesc} LIKE '%קריאה שלישית%'`);

  if (opts.search) {
    conditions.push(titleSearchCondition(opts.search, opts.searchHe));
  }

  const where = and(...conditions);
  const total =
    db.select({ n: sql<number>`COUNT(*)` }).from(schema.votes).where(where).get()?.n ?? 0;
  const items = db
    .select()
    .from(schema.votes)
    .where(where)
    .orderBy(desc(schema.votes.dateTime))
    .limit(LAWS_PAGE_SIZE)
    .offset((page - 1) * LAWS_PAGE_SIZE)
    .all();
  return { items, total, pages: Math.max(1, Math.ceil(total / LAWS_PAGE_SIZE)) };
}

export type VoterRow = {
  person: Person;
  resultCode: number;
  factionId: number | null;
  factionNameHe: string | null;
};

// Everyone serving as an MK at the time of the vote, with how they voted —
// including members who were absent (no recorded result → "did not vote").
// Each voter is tagged with the faction they belonged to at vote time.
export function getVoteResults(voteId: number): VoterRow[] {
  const db = getDb();
  const vote = getVote(voteId);
  if (!vote) return [];

  // Faction membership active at the moment of the vote.
  const factionAtVote = and(
    eq(schema.personPositions.personId, schema.persons.id),
    eq(schema.personPositions.positionId, POSITION_FACTION_MEMBER),
    eq(schema.personPositions.knessetNum, CURRENT_KNESSET),
    sql`${schema.personPositions.startDate} <= ${vote.dateTime}`,
    or(
      sql`${schema.personPositions.finishDate} IS NULL`,
      sql`${schema.personPositions.finishDate} >= ${vote.dateTime}`,
    ),
  );

  // Serving MKs at vote time who have a recorded result.
  const recorded = db
    .select({
      person: schema.persons,
      resultCode: schema.voteResults.resultCode,
      factionId: schema.personPositions.factionId,
      factionNameHe: schema.personPositions.factionNameHe,
    })
    .from(schema.voteResults)
    .innerJoin(schema.persons, eq(schema.persons.id, schema.voteResults.personId))
    .leftJoin(schema.personPositions, factionAtVote)
    .where(eq(schema.voteResults.voteId, voteId))
    .all();

  const recordedIds = new Set(recorded.map((r) => r.person.id));

  // Serving MKs at vote time WITHOUT a recorded result → absent.
  const absent = db
    .select({
      person: schema.persons,
      factionId: schema.personPositions.factionId,
      factionNameHe: schema.personPositions.factionNameHe,
    })
    .from(schema.persons)
    .innerJoin(schema.personPositions, factionAtVote)
    .all()
    .filter((r) => !recordedIds.has(r.person.id));

  return [
    ...recorded.map((r) => ({
      person: r.person,
      resultCode: r.resultCode,
      factionId: r.factionId,
      factionNameHe: r.factionNameHe,
    })),
    ...absent.map((r) => ({
      person: r.person,
      resultCode: VOTE_DID_NOT_VOTE,
      factionId: r.factionId,
      factionNameHe: r.factionNameHe,
    })),
  ];
}

// ---------- bills / legislation ----------

export type Bill = typeof schema.bills.$inferSelect;

// The bill behind a bill-reading vote (votes.itemId === bills.id).
export function getBillForVote(vote: Vote): Bill | undefined {
  if (!vote.itemId) return undefined;
  return getDb().select().from(schema.bills).where(eq(schema.bills.id, vote.itemId)).get();
}

export function getBillSponsors(billId: number): Person[] {
  const db = getDb();
  return db
    .select({ person: schema.persons })
    .from(schema.billInitiators)
    .innerJoin(schema.persons, eq(schema.persons.id, schema.billInitiators.personId))
    .where(
      and(
        eq(schema.billInitiators.billId, billId),
        eq(schema.billInitiators.isInitiator, true),
      ),
    )
    .orderBy(schema.billInitiators.ordinal)
    .all()
    .map((r) => r.person);
}

// Bills an MK sponsored (as primary initiator), most recent first.
export function getMemberSponsoredBills(personId: number, limit = 12): Bill[] {
  const db = getDb();
  return db
    .select({ bill: schema.bills })
    .from(schema.billInitiators)
    .innerJoin(schema.bills, eq(schema.bills.id, schema.billInitiators.billId))
    .where(
      and(
        eq(schema.billInitiators.personId, personId),
        eq(schema.billInitiators.isInitiator, true),
      ),
    )
    .orderBy(desc(schema.bills.lastUpdated))
    .limit(limit)
    .all()
    .map((r) => r.bill);
}

export function getMemberSponsoredCount(personId: number): number {
  return (
    getDb()
      .select({ n: sql<number>`COUNT(*)` })
      .from(schema.billInitiators)
      .where(
        and(
          eq(schema.billInitiators.personId, personId),
          eq(schema.billInitiators.isInitiator, true),
        ),
      )
      .get()?.n ?? 0
  );
}

// ---------- most active legislators ----------

export type LegislatorRow = {
  person: Person;
  factionId: number | null;
  factionNameHe: string | null;
  billCount: number;
};

export function getMostActiveLegislators(limit = 20): LegislatorRow[] {
  const db = getDb();
  const rows = db
    .select({
      person: schema.persons,
      factionId: schema.personPositions.factionId,
      factionNameHe: schema.personPositions.factionNameHe,
      billCount: sql<number>`COUNT(DISTINCT ${schema.billInitiators.billId})`,
    })
    .from(schema.billInitiators)
    .innerJoin(schema.persons, eq(schema.persons.id, schema.billInitiators.personId))
    .leftJoin(
      schema.personPositions,
      and(
        eq(schema.personPositions.personId, schema.persons.id),
        eq(schema.personPositions.positionId, POSITION_FACTION_MEMBER),
        eq(schema.personPositions.isCurrent, true),
      ),
    )
    .where(eq(schema.billInitiators.isInitiator, true))
    .groupBy(schema.persons.id)
    .orderBy(desc(sql`COUNT(DISTINCT ${schema.billInitiators.billId})`))
    .limit(limit)
    .all();
  return rows.map((r) => ({
    person: r.person,
    factionId: r.factionId,
    factionNameHe: r.factionNameHe,
    billCount: r.billCount,
  }));
}

// ---------- member activity (questions, agenda motions, committees) ----------

export function getMemberQuestionCount(personId: number): number {
  return (
    getDb()
      .select({ n: sql<number>`COUNT(*)` })
      .from(schema.queries)
      .where(eq(schema.queries.personId, personId))
      .get()?.n ?? 0
  );
}

export function getMemberRecentQuestions(personId: number, limit = 8) {
  return getDb()
    .select()
    .from(schema.queries)
    .where(eq(schema.queries.personId, personId))
    .orderBy(desc(schema.queries.submitDate))
    .limit(limit)
    .all();
}

export function getMemberAgendaCount(personId: number): number {
  return (
    getDb()
      .select({ n: sql<number>`COUNT(*)` })
      .from(schema.agendas)
      .where(eq(schema.agendas.initiatorPersonId, personId))
      .get()?.n ?? 0
  );
}

export type CommitteeMembership = {
  committeeId: number;
  committeeNameHe: string | null;
  roleHe: string | null;
};

export function getMemberCommittees(personId: number): CommitteeMembership[] {
  const db = getDb();
  const rows = db
    .selectDistinct({
      committeeId: schema.personPositions.committeeId,
      committeeNameHe: schema.personPositions.committeeNameHe,
      roleHe: schema.personPositions.positionDescHe,
    })
    .from(schema.personPositions)
    .where(
      and(
        eq(schema.personPositions.personId, personId),
        eq(schema.personPositions.isCurrent, true),
        sql`${schema.personPositions.committeeId} IS NOT NULL`,
      ),
    )
    .all();
  return rows.filter((r) => r.committeeId != null) as CommitteeMembership[];
}

// ---------- committees ----------

export type Committee = typeof schema.committees.$inferSelect;

export function getCurrentCommittees(): Committee[] {
  return getDb()
    .select()
    .from(schema.committees)
    .where(
      and(
        eq(schema.committees.knessetNum, CURRENT_KNESSET),
        eq(schema.committees.isCurrent, true),
      ),
    )
    .all()
    .sort((a, b) => (a.nameHe ?? "").localeCompare(b.nameHe ?? "", "he"));
}

export function getCommittee(id: number): Committee | undefined {
  return getDb().select().from(schema.committees).where(eq(schema.committees.id, id)).get();
}

export function getCommitteeMembers(committeeId: number) {
  const db = getDb();
  const rows = db
    .selectDistinct({ person: schema.persons, roleHe: schema.personPositions.positionDescHe })
    .from(schema.personPositions)
    .innerJoin(schema.persons, eq(schema.persons.id, schema.personPositions.personId))
    .where(
      and(
        eq(schema.personPositions.committeeId, committeeId),
        eq(schema.personPositions.isCurrent, true),
      ),
    )
    .all();
  return rows.map((r) => ({ person: r.person, roleHe: r.roleHe }));
}

// ---------- Israel law book ----------

export type IsraelLaw = typeof schema.israelLaws.$inferSelect;

const LAWBOOK_PAGE_SIZE = 30;

export function getLawBookPage(opts: {
  search?: string;
  searchHe?: string; // query translated to Hebrew (law-book names are Hebrew-only)
  basicOnly?: boolean;
  page?: number;
}) {
  const db = getDb();
  const page = Math.max(1, opts.page ?? 1);
  const conditions = [sql`${schema.israelLaws.nameHe} IS NOT NULL AND ${schema.israelLaws.nameHe} != ''`];
  if (opts.basicOnly) conditions.push(eq(schema.israelLaws.isBasicLaw, true));
  if (opts.search) {
    const he = opts.searchHe || opts.search;
    conditions.push(
      he !== opts.search
        ? or(like(schema.israelLaws.nameHe, `%${he}%`), like(schema.israelLaws.nameHe, `%${opts.search}%`))!
        : like(schema.israelLaws.nameHe, `%${opts.search}%`),
    );
  }
  const where = and(...conditions);
  const total =
    db.select({ n: sql<number>`COUNT(*)` }).from(schema.israelLaws).where(where).get()?.n ?? 0;
  const items = db
    .select()
    .from(schema.israelLaws)
    .where(where)
    .orderBy(desc(schema.israelLaws.publicationDate))
    .limit(LAWBOOK_PAGE_SIZE)
    .offset((page - 1) * LAWBOOK_PAGE_SIZE)
    .all();
  return { items, total, pages: Math.max(1, Math.ceil(total / LAWBOOK_PAGE_SIZE)) };
}

// ---------- state budget ----------

export type BudgetLine = typeof schema.budgetLines.$inferSelect;
const BUDGET_PAGE_SIZE = 50;

// The 25th Knesset's budget years (budgets passed during this Knesset).
const CURRENT_KNESSET_BUDGET_YEARS = [2023, 2024, 2025];

// Years that have full itemized data (a year selector lists these), newest first.
// Wrapped in React.cache so the several resolveYear() calls in one budget render
// share a single query.
export const getBudgetDetailedYears = cache((): number[] =>
  getDb()
    .selectDistinct({ y: schema.budgetLines.year })
    .from(schema.budgetLines)
    .orderBy(desc(schema.budgetLines.year))
    .all()
    .map((r) => r.y),
);

// Resolve a requested year to one we actually have detailed data for.
function resolveYear(year?: number): number | null {
  const years = getBudgetDetailedYears();
  if (year != null && years.includes(year)) return year;
  return years[0] ?? null;
}

export function getBudgetMeta(year?: number) {
  const db = getDb();
  const y = resolveYear(year);
  if (y == null) return { year: null, totalThousands: 0, lineCount: 0 };
  const agg = db
    .select({
      total: sql<number>`COALESCE(SUM(${schema.budgetLines.netThousands}), 0)`,
      n: sql<number>`COUNT(*)`,
    })
    .from(schema.budgetLines)
    .where(eq(schema.budgetLines.year, y))
    .get();
  return { year: y, totalThousands: agg?.total ?? 0, lineCount: agg?.n ?? 0 };
}

// Budget names are localized via the unified cache (src/lib/i18n-data.ts).

export type BudgetTotal = {
  year: number;
  totalThousands: number;
  basis: string | null;
  detailed: boolean;
};

// All years we have a headline total for (detailed net + recent gross), ascending.
export function getBudgetTimeline(): BudgetTotal[] {
  return getDb()
    .select()
    .from(schema.budgetTotals)
    .orderBy(schema.budgetTotals.year)
    .all()
    .map((r) => ({
      year: r.year,
      totalThousands: r.totalThousands ?? 0,
      basis: r.basis,
      detailed: !!r.detailed,
    }));
}

// The current (25th) Knesset's budgets: per-year totals + their sum.
export function getCurrentKnessetBudget() {
  const rows = getBudgetTimeline().filter((t) =>
    CURRENT_KNESSET_BUDGET_YEARS.includes(t.year),
  );
  const totalThousands = rows.reduce((s, r) => s + r.totalThousands, 0);
  return { years: rows, totalThousands };
}

export type BudgetSection = {
  code: number | null;
  nameHe: string | null;
  totalThousands: number;
  lines: number;
};

// Aggregate net expenditure by budget section (ministry), largest first.
export function getBudgetSections(year?: number): BudgetSection[] {
  const y = resolveYear(year);
  if (y == null) return [];
  return getDb()
    .select({
      code: schema.budgetLines.sectionCode,
      nameHe: schema.budgetLines.sectionNameHe,
      totalThousands: sql<number>`COALESCE(SUM(${schema.budgetLines.netThousands}), 0)`,
      lines: sql<number>`COUNT(*)`,
    })
    .from(schema.budgetLines)
    .where(eq(schema.budgetLines.year, y))
    .groupBy(schema.budgetLines.sectionCode, schema.budgetLines.sectionNameHe)
    .orderBy(desc(sql`SUM(${schema.budgetLines.netThousands})`))
    .all();
}

// Searchable, filterable, sortable, paginated budget lines.
export function getBudgetLines(opts: {
  year?: number;
  search?: string;
  searchHe?: string;
  section?: number;
  sort?: "amount" | "name" | "code";
  page?: number;
}) {
  const db = getDb();
  const year = resolveYear(opts.year);
  if (year == null) return { items: [], total: 0, pages: 1, year: null };
  const page = Math.max(1, opts.page ?? 1);

  const conditions = [eq(schema.budgetLines.year, year)];
  if (opts.section != null) conditions.push(eq(schema.budgetLines.sectionCode, opts.section));
  if (opts.search) {
    const terms: ReturnType<typeof like>[] = [];
    for (const term of [opts.searchHe || opts.search, opts.search]) {
      const q = `%${term}%`;
      terms.push(
        like(schema.budgetLines.takanaNameHe, q),
        like(schema.budgetLines.programNameHe, q),
        like(schema.budgetLines.sectionNameHe, q),
        like(schema.budgetLines.areaNameHe, q),
        like(sql`CAST(${schema.budgetLines.takanaCode} AS TEXT)`, q),
      );
    }
    conditions.push(or(...terms)!);
  }
  const where = and(...conditions);

  const total =
    db.select({ n: sql<number>`COUNT(*)` }).from(schema.budgetLines).where(where).get()?.n ?? 0;

  const order =
    opts.sort === "name"
      ? schema.budgetLines.takanaNameHe
      : opts.sort === "code"
        ? schema.budgetLines.takanaCode
        : desc(schema.budgetLines.netThousands);

  const items = db
    .select()
    .from(schema.budgetLines)
    .where(where)
    .orderBy(order)
    .limit(BUDGET_PAGE_SIZE)
    .offset((page - 1) * BUDGET_PAGE_SIZE)
    .all();

  return { items, total, pages: Math.max(1, Math.ceil(total / BUDGET_PAGE_SIZE)), year };
}

// ---------- lobbyists ----------

export type Lobbyist = typeof schema.lobbyists.$inferSelect;
export type LobbyistClient = { name: string; type: "permanent" | "temporary" };
export type LobbyistWithClients = Lobbyist & { clients: LobbyistClient[] };
const LOBBYIST_PAGE_SIZE = 25;

export function getLobbyistStats() {
  const db = getDb();
  const lobbyists =
    db.select({ n: sql<number>`COUNT(*)` }).from(schema.lobbyists).get()?.n ?? 0;
  const firms =
    db
      .select({ n: sql<number>`COUNT(DISTINCT ${schema.lobbyists.corporationName})` })
      .from(schema.lobbyists)
      .where(sql`${schema.lobbyists.corporationName} IS NOT NULL`)
      .get()?.n ?? 0;
  const clients =
    db
      .select({ n: sql<number>`COUNT(DISTINCT ${schema.lobbyistClients.clientName})` })
      .from(schema.lobbyistClients)
      .get()?.n ?? 0;
  return { lobbyists, firms, clients };
}

// Searchable, paginated lobbyists, each with the clients they represent.
export function getLobbyistsPage(opts: {
  search?: string;
  searchHe?: string;
  page?: number;
}) {
  const db = getDb();
  const page = Math.max(1, opts.page ?? 1);

  const conditions = [];
  if (opts.search) {
    const terms = [];
    for (const term of [opts.searchHe || opts.search, opts.search]) {
      const q = `%${term}%`;
      terms.push(
        like(schema.lobbyists.fullName, q),
        like(schema.lobbyists.corporationName, q),
        sql`EXISTS (SELECT 1 FROM lobbyist_clients lc WHERE lc.lobbyist_id = ${schema.lobbyists.id} AND lc.client_name LIKE ${q})`,
      );
    }
    conditions.push(or(...terms)!);
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const total =
    db.select({ n: sql<number>`COUNT(*)` }).from(schema.lobbyists).where(where).get()?.n ?? 0;

  const items = db
    .select()
    .from(schema.lobbyists)
    .where(where)
    .orderBy(schema.lobbyists.fullName)
    .limit(LOBBYIST_PAGE_SIZE)
    .offset((page - 1) * LOBBYIST_PAGE_SIZE)
    .all();

  // Attach clients per lobbyist.
  const ids = items.map((l) => l.id);
  const clientsByLobbyist = new Map<number, LobbyistClient[]>();
  if (ids.length) {
    const rows = db
      .select({
        lobbyistId: schema.lobbyistClients.lobbyistId,
        name: schema.lobbyistClients.clientName,
        representation: schema.lobbyistClients.representation,
      })
      .from(schema.lobbyistClients)
      .where(inArray(schema.lobbyistClients.lobbyistId, ids))
      .all();
    for (const r of rows) {
      if (r.lobbyistId == null || !r.name) continue;
      const arr = clientsByLobbyist.get(r.lobbyistId) ?? [];
      if (!arr.some((c) => c.name === r.name)) {
        const type: LobbyistClient["type"] = (r.representation ?? "").includes("זמני")
          ? "temporary"
          : "permanent";
        arr.push({ name: r.name, type });
      }
      clientsByLobbyist.set(r.lobbyistId, arr);
    }
  }

  const withClients: LobbyistWithClients[] = items.map((l) => ({
    ...l,
    clients: clientsByLobbyist.get(l.id) ?? [],
  }));

  return {
    items: withClients,
    total,
    pages: Math.max(1, Math.ceil(total / LOBBYIST_PAGE_SIZE)),
  };
}

// ---------- dashboard ----------

export function getDashboardStats() {
  const db = getDb();
  // Sitting MKs = people currently holding an MK seat (constitutionally 120).
  // Note: COUNT(persons.isCurrent) is larger (~132) because it also includes
  // ministers who vacated their seat under the Norwegian Law but remain active
  // in government — see getMinisters().
  const mks =
    db
      .select({ n: sql<number>`COUNT(DISTINCT ${schema.personPositions.personId})` })
      .from(schema.personPositions)
      .where(
        and(
          eq(schema.personPositions.knessetNum, CURRENT_KNESSET),
          eq(schema.personPositions.isCurrent, true),
          inArray(schema.personPositions.positionId, MK_POSITION_IDS),
        ),
      )
      .get()?.n ?? 0;
  const ministers =
    db
      .select({ n: sql<number>`COUNT(DISTINCT ${schema.personPositions.personId})` })
      .from(schema.personPositions)
      .where(
        and(
          eq(schema.personPositions.knessetNum, CURRENT_KNESSET),
          eq(schema.personPositions.isCurrent, true),
          sql`${schema.personPositions.govMinistryNameHe} IS NOT NULL`,
        ),
      )
      .get()?.n ?? 0;
  const factions = getCurrentFactionsWithSeats();
  const voteCount =
    db
      .select({ n: sql<number>`COUNT(*)` })
      .from(schema.votes)
      .where(eq(schema.votes.knessetNum, CURRENT_KNESSET))
      .get()?.n ?? 0;
  return { mks, ministers, factions, voteCount };
}

// ---------- ministers ----------

export type Minister = Person & {
  factionId: number | null;
  factionNameHe: string | null;
  ministriesHe: string[]; // ministries held (a person may hold several)
  dutiesHe: string[]; // duty descriptions (שר / סגן שר / ראש הממשלה …)
  dutyHe: string | null; // duties joined (kept for sorting/back-compat)
  isDeputy: boolean;
  isSitting: boolean; // still holds their Knesset seat (didn't invoke Norwegian Law)
};

// All current ministers and deputy ministers in the sitting government, with
// their ministries and faction. Sorted by Hebrew last name.
export function getMinisters(): Minister[] {
  const db = getDb();
  const rows = db
    .select({
      personId: schema.personPositions.personId,
      ministry: schema.personPositions.govMinistryNameHe,
      duty: schema.personPositions.positionDescHe,
    })
    .from(schema.personPositions)
    .where(
      and(
        eq(schema.personPositions.knessetNum, CURRENT_KNESSET),
        eq(schema.personPositions.isCurrent, true),
        sql`${schema.personPositions.govMinistryNameHe} IS NOT NULL`,
      ),
    )
    .all();

  // Group by person — one row per minister, collecting every ministry/duty.
  const byPerson = new Map<
    number,
    { ministries: Set<string>; duties: Set<string> }
  >();
  for (const r of rows) {
    const cur = byPerson.get(r.personId) ?? {
      ministries: new Set<string>(),
      duties: new Set<string>(),
    };
    if (r.ministry) cur.ministries.add(r.ministry);
    if (r.duty) cur.duties.add(r.duty);
    byPerson.set(r.personId, cur);
  }

  const ids = [...byPerson.keys()];
  if (ids.length === 0) return [];
  const persons = db
    .select()
    .from(schema.persons)
    .where(inArray(schema.persons.id, ids))
    .all();
  const personById = new Map(persons.map((p) => [p.id, p]));
  const factions = getLatestFactionMap(ids);
  const seat = getSeatStatusMap(ids);

  const out: Minister[] = [];
  for (const [id, agg] of byPerson) {
    const p = personById.get(id);
    if (!p) continue;
    const f = factions.get(id);
    const duties = [...agg.duties];
    const dutyHe = duties.join(", ") || null;
    const isDeputy = duties.every((d) => d.includes("סגן")) && duties.length > 0;
    out.push({
      ...p,
      factionId: f?.id ?? null,
      factionNameHe: f?.nameHe ?? null,
      ministriesHe: [...agg.ministries],
      dutiesHe: duties,
      dutyHe,
      isDeputy,
      isSitting: seat.get(id)?.isSitting ?? false,
    });
  }
  // Prime minister first, then full ministers, then deputies; then by name.
  return out.sort((a, b) => {
    const rank = (m: Minister) =>
      m.dutyHe?.includes("ראש הממשלה") && !m.dutyHe?.includes("סגן") ? 0 : m.isDeputy ? 2 : 1;
    return rank(a) - rank(b) || a.lastNameHe.localeCompare(b.lastNameHe, "he");
  });
}

export function getLatestVotes(limit = 6): Vote[] {
  return getDb()
    .select()
    .from(schema.votes)
    .where(eq(schema.votes.knessetNum, CURRENT_KNESSET))
    .orderBy(desc(schema.votes.dateTime))
    .limit(limit)
    .all();
}

export function getLastSyncDate(): string | null {
  try {
    const row = getDb()
      .select()
      .from(schema.syncState)
      .orderBy(desc(schema.syncState.lastSyncedAt))
      .limit(1)
      .get();
    return row?.lastSyncedAt ?? null;
  } catch {
    return null; // DB not initialized yet
  }
}

// Average participation per faction (batched) → Map<factionId, pct>.
export function getAllFactionAvgParticipation(): Map<number, number> {
  const db = getDb();
  const rows = db
    .select({
      factionId: schema.personPositions.factionId,
      avg: sql<number>`ROUND(AVG(${schema.mkVoteStats.participationPct}), 1)`,
    })
    .from(schema.mkVoteStats)
    .innerJoin(
      schema.personPositions,
      and(
        eq(schema.personPositions.personId, schema.mkVoteStats.personId),
        eq(schema.personPositions.positionId, POSITION_FACTION_MEMBER),
        eq(schema.personPositions.isCurrent, true),
      ),
    )
    .where(eq(schema.mkVoteStats.knessetNum, CURRENT_KNESSET))
    .groupBy(schema.personPositions.factionId)
    .all();
  return new Map(
    rows
      .filter((r) => r.factionId != null)
      .map((r) => [r.factionId as number, r.avg]),
  );
}

// Average participation across a faction's current members.
export function getFactionAvgParticipation(factionId: number): number | null {
  const db = getDb();
  const row = db
    .select({ avg: sql<number>`ROUND(AVG(${schema.mkVoteStats.participationPct}), 1)` })
    .from(schema.mkVoteStats)
    .innerJoin(
      schema.personPositions,
      and(
        eq(schema.personPositions.personId, schema.mkVoteStats.personId),
        eq(schema.personPositions.factionId, factionId),
        eq(schema.personPositions.positionId, POSITION_FACTION_MEMBER),
        eq(schema.personPositions.isCurrent, true),
      ),
    )
    .where(eq(schema.mkVoteStats.knessetNum, CURRENT_KNESSET))
    .get();
  return row?.avg ?? null;
}

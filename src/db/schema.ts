import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";

// Knesset member (KNS_Person), enriched from Wikidata.
export const persons = sqliteTable("persons", {
  id: integer("id").primaryKey(), // Knesset PersonID
  firstNameHe: text("first_name_he").notNull(),
  lastNameHe: text("last_name_he").notNull(),
  nameEn: text("name_en"),
  nameAr: text("name_ar"),
  nameRu: text("name_ru"),
  genderDesc: text("gender_desc"),
  email: text("email"),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
  wikidataId: text("wikidata_id"),
  wikipediaHe: text("wikipedia_he"),
  photoUrl: text("photo_url"),
  photoLicense: text("photo_license"),
  photoAttribution: text("photo_attribution"),
  mkSiteCode: integer("mk_site_code"),
  lastUpdated: text("last_updated"),
});

// Structured biography pulled from Wikidata (the member's full history backbone:
// birth, education, occupations, military service, and a dated career timeline).
// Free-text values are stored in Hebrew where available so they localize via the
// unified on-the-fly translation cache. Sourced to the linked Wikidata entity.
export const personBio = sqliteTable("person_bio", {
  personId: integer("person_id").primaryKey(),
  wikidataId: text("wikidata_id"), // QID the facts came from (e.g. Q123)
  dateOfBirth: text("date_of_birth"), // ISO date string
  birthPlaceHe: text("birth_place_he"),
  educationHe: text("education_he"), // "|"-joined institution labels
  occupationsHe: text("occupations_he"), // "|"-joined
  militaryHe: text("military_he"), // "|"-joined branch/unit/rank
  // JSON array of { title (he/en), start, end } position-held tenures, sorted.
  careerJson: text("career_json"),
  lastUpdated: text("last_updated"),
});

// Faction (KNS_Faction) per Knesset.
export const factions = sqliteTable("factions", {
  id: integer("id").primaryKey(), // FactionID
  knessetNum: integer("knesset_num").notNull(),
  nameHe: text("name_he").notNull(),
  nameEn: text("name_en"),
  nameAr: text("name_ar"),
  nameRu: text("name_ru"),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
  startDate: text("start_date"),
  finishDate: text("finish_date"),
  lastUpdated: text("last_updated"),
});

// KNS_PersonToPosition rows (MK seats, ministers, committee roles...).
export const personPositions = sqliteTable(
  "person_positions",
  {
    id: integer("id").primaryKey(), // PersonToPositionID
    personId: integer("person_id").notNull(),
    positionId: integer("position_id").notNull(),
    positionDescHe: text("position_desc_he"),
    knessetNum: integer("knesset_num"),
    factionId: integer("faction_id"),
    factionNameHe: text("faction_name_he"),
    govMinistryNameHe: text("gov_ministry_name_he"),
    committeeId: integer("committee_id"),
    committeeNameHe: text("committee_name_he"),
    startDate: text("start_date"),
    finishDate: text("finish_date"),
    isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
    lastUpdated: text("last_updated"),
  },
  (t) => [
    index("pp_person_idx").on(t.personId),
    index("pp_faction_idx").on(t.factionId),
    index("pp_knesset_idx").on(t.knessetNum),
    // Supports the "members in a faction at a vote's moment" window lookup used by
    // getVoteResults (equality on knesset+position, range on start_date).
    index("pp_member_window_idx").on(t.knessetNum, t.positionId, t.startDate),
  ],
);

// Plenum vote headers (KNS_PlenumVote).
export const votes = sqliteTable(
  "votes",
  {
    id: integer("id").primaryKey(), // VoteID
    knessetNum: integer("knesset_num"),
    dateTime: text("date_time").notNull(),
    titleHe: text("title_he"),
    // The plenum agenda item this vote belongs to (the bill/topic under
    // discussion) — richer context than the vote title alone.
    itemName: text("item_name"),
    itemTypeDesc: text("item_type_desc"),
    // What a "for"/"against" vote does procedurally — also carries the
    // legislative reading stage (e.g. "לקבל את הצעת החוק בקריאה שלישית").
    forDesc: text("for_desc"),
    againstDesc: text("against_desc"),
    sessionId: integer("session_id"),
    itemId: integer("item_id"),
    isElectronic: integer("is_electronic", { mode: "boolean" }),
    totalFor: integer("total_for").notNull().default(0),
    totalAgainst: integer("total_against").notNull().default(0),
    totalAbstain: integer("total_abstain").notNull().default(0),
    isAccepted: integer("is_accepted", { mode: "boolean" }),
    lastUpdated: text("last_updated"),
  },
  // Composite (knesset_num, date_time) serves the hot "current-Knesset votes,
  // newest first" pattern without a temp B-tree sort (SQLite scans it in reverse
  // for ORDER BY date_time DESC).
  (t) => [
    index("votes_date_idx").on(t.dateTime),
    index("votes_knesset_date_idx").on(t.knessetNum, t.dateTime),
  ],
);

// Per-MK vote results (KNS_PlenumVoteResult).
// resultCode: 1 for, 2 against, 3 abstain, 4 did not vote, 0 cancelled.
export const voteResults = sqliteTable(
  "vote_results",
  {
    voteId: integer("vote_id").notNull(),
    personId: integer("person_id").notNull(),
    resultCode: integer("result_code").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.voteId, t.personId] }),
    index("vr_person_idx").on(t.personId),
  ],
);

// Precomputed per-MK voting statistics per Knesset.
export const mkVoteStats = sqliteTable(
  "mk_vote_stats",
  {
    personId: integer("person_id").notNull(),
    knessetNum: integer("knesset_num").notNull(),
    votesHeld: integer("votes_held").notNull().default(0), // votes held while serving
    participated: integer("participated").notNull().default(0),
    votedFor: integer("voted_for").notNull().default(0),
    votedAgainst: integer("voted_against").notNull().default(0),
    abstained: integer("abstained").notNull().default(0),
    missed: integer("missed").notNull().default(0),
    participationPct: real("participation_pct").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.personId, t.knessetNum] })],
);

// Maps KNS_PlenumVoteResult.MkId -> the real KNS_Person.Id for MKs whose vote
// id-space differs from their PersonID (e.g. Kallner MkId 32037 -> Person 30710).
// Rebuilt each vote sync from the denormalized names on the OData vote feed; the
// vote_results.person_id remap depends on this table surviving `db:push`, so it
// MUST stay declared here (drizzle-kit push --force drops any table it doesn't see).
export const mkIdMap = sqliteTable("mk_id_map", {
  mkId: integer("mk_id").primaryKey(),
  personId: integer("person_id").notNull(),
});

// Bills (KNS_Bill). For bill-reading votes, votes.itemId === bills.id.
export const bills = sqliteTable("bills", {
  id: integer("id").primaryKey(), // BillID
  knessetNum: integer("knesset_num"),
  nameHe: text("name_he"),
  subTypeDesc: text("sub_type_desc"), // private / governmental / committee
  statusDesc: text("status_desc"),
  // Source documents (direct PDF/doc links) — "what the law means".
  explanatoryUrl: text("explanatory_url"), // explanatory notes / first-reading text
  firstReadingUrl: text("first_reading_url"),
  finalLawUrl: text("final_law_url"), // published law in Reshumot
  lastUpdated: text("last_updated"),
});

// Bill sponsors (KNS_BillInitiator) — who proposed the bill.
export const billInitiators = sqliteTable(
  "bill_initiators",
  {
    billId: integer("bill_id").notNull(),
    personId: integer("person_id").notNull(),
    isInitiator: integer("is_initiator", { mode: "boolean" }),
    ordinal: integer("ordinal"),
  },
  (t) => [
    primaryKey({ columns: [t.billId, t.personId] }),
    index("bi_person_idx").on(t.personId),
  ],
);

// Parliamentary questions filed by MKs (KNS_Query).
export const queries = sqliteTable(
  "queries",
  {
    id: integer("id").primaryKey(),
    knessetNum: integer("knesset_num"),
    personId: integer("person_id"),
    nameHe: text("name_he"),
    typeDesc: text("type_desc"),
    govMinistryId: integer("gov_ministry_id"),
    submitDate: text("submit_date"),
    replyDate: text("reply_date"),
    lastUpdated: text("last_updated"),
  },
  (t) => [index("q_person_idx").on(t.personId)],
);

// Motions for the agenda raised by MKs (KNS_Agenda).
export const agendas = sqliteTable(
  "agendas",
  {
    id: integer("id").primaryKey(),
    knessetNum: integer("knesset_num"),
    initiatorPersonId: integer("initiator_person_id"),
    nameHe: text("name_he"),
    subTypeDesc: text("sub_type_desc"),
    classificationDesc: text("classification_desc"),
    lastUpdated: text("last_updated"),
  },
  (t) => [index("ag_person_idx").on(t.initiatorPersonId)],
);

// Knesset committees (KNS_Committee).
export const committees = sqliteTable("committees", {
  id: integer("id").primaryKey(),
  knessetNum: integer("knesset_num"),
  nameHe: text("name_he"),
  categoryDesc: text("category_desc"),
  typeDesc: text("type_desc"),
  email: text("email"),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
  lastUpdated: text("last_updated"),
});

// The active laws of Israel (KNS_IsraelLaw) — the consolidated law book.
export const israelLaws = sqliteTable(
  "israel_laws",
  {
    id: integer("id").primaryKey(),
    knessetNum: integer("knesset_num"),
    nameHe: text("name_he"),
    isBasicLaw: integer("is_basic_law", { mode: "boolean" }),
    isBudgetLaw: integer("is_budget_law", { mode: "boolean" }),
    publicationDate: text("publication_date"),
    validityDesc: text("validity_desc"),
    lastUpdated: text("last_updated"),
  },
  (t) => [index("law_name_idx").on(t.nameHe)],
);

// State budget line items (Ministry of Finance open data, via data.gov.il).
// One row per budget line (takana), with its hierarchy and net expenditure.
export const budgetLines = sqliteTable(
  "budget_lines",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    year: integer("year").notNull(),
    sectionCode: integer("section_code"),
    sectionNameHe: text("section_name_he"),
    areaCode: integer("area_code"),
    areaNameHe: text("area_name_he"),
    programCode: integer("program_code"),
    programNameHe: text("program_name_he"),
    takanaCode: integer("takana_code"),
    takanaNameHe: text("takana_name_he"),
    netThousands: integer("net_thousands"), // NIS thousands
  },
  (t) => [
    index("budget_section_idx").on(t.year, t.sectionCode),
    index("budget_year_idx").on(t.year),
  ],
);

// Headline budget total per year (for the timeline + current-Knesset total).
// Detailed years carry a NET total (from budget_lines); recent years carry a
// GROSS approved total (from the Accountant-General execution reports).
export const budgetTotals = sqliteTable("budget_totals", {
  year: integer("year").primaryKey(),
  totalThousands: integer("total_thousands"),
  basis: text("basis"), // "net" | "gross"
  detailed: integer("detailed", { mode: "boolean" }).notNull().default(false),
});

// Registered Knesset lobbyists (V_Lobbyists) and their clients
// (V_LobbyistsClients) — who lobbies, for which firm, on behalf of whom.
export const lobbyists = sqliteTable("lobbyists", {
  id: integer("id").primaryKey(),
  fullName: text("full_name"),
  permitType: text("permit_type"), // permanent / occasional
  corporationName: text("corporation_name"), // the lobbying firm
  isIndependent: integer("is_independent", { mode: "boolean" }),
  practiceFramework: text("practice_framework"),
});

export const lobbyistClients = sqliteTable(
  "lobbyist_clients",
  {
    id: integer("id").primaryKey(),
    lobbyistId: integer("lobbyist_id"),
    clientName: text("client_name"),
    representation: text("representation"),
  },
  (t) => [index("lobbyist_client_idx").on(t.lobbyistId)],
);

// Universal, deduplicated translation cache: one row per unique Hebrew source
// string, shared across ALL data (vote titles, law names, committees, budget
// lines, …). Translated lazily on first view and cached forever. Replaces the
// per-table name_en/ar/ru columns (no more 4 copies of every row). Adding a new
// language = one ALTER ADD COLUMN; new data auto-translates on the fly.
export const translations = sqliteTable("translations", {
  sourceHe: text("source_he").primaryKey(),
  en: text("en"),
  ar: text("ar"),
  ru: text("ru"),
});

// Incremental-sync bookkeeping: last seen LastUpdatedDate per source table.
export const syncState = sqliteTable("sync_state", {
  table: text("table_name").primaryKey(),
  lastUpdatedDate: text("last_updated_date"),
  lastSyncedAt: text("last_synced_at"),
});

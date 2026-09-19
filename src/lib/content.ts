import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { GLOSSARY_CATEGORIES } from "./glossary-categories";

const CONTENT_DIR = path.join(process.cwd(), "content");

// href URLs must be http(s): zod's .url() checks shape not scheme, so block
// javascript:/data: (trim first — browsers tolerate "\tjavascript:…"). Defense-in-depth
// over trusted committed YAML.
const httpUrl = z
  .string()
  .trim()
  .refine((u) => /^https?:\/\//i.test(u), "must be an http(s) URL");

// Kebab-case identity for a running list (content/election.yaml) — polls and
// compass stances key on it, and it survives renames and mergers.
const listSlug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case");

// Hoisted above the coalition schema, which is the first to use it.
const localizedText = z.object({
  he: z.string(),
  en: z.string().optional(),
  ar: z.string().optional(),
  ru: z.string().optional(),
  es: z.string().optional(),
  fr: z.string().optional(),
});
export type LocalizedText = z.infer<typeof localizedText>;

const sourceRef = z.object({ url: httpUrl, title: z.string(), publisher: z.string().optional() });

// One faction's side of the aisle, with the date it took effect and the
// reports it rests on — so a page can say "outside the coalition since
// 14 July 2025 · source" instead of a bare label.
const factionStatusSchema = z.object({
  status: z.enum(["coalition", "opposition"]),
  since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: localizedText.optional(),
  sources: z.array(sourceRef).optional(),
});

const coalitionSchema = z
  .object({
    knesset: z.number(),
    coalitionFactionIds: z.array(z.number()),
    asOf: z.string().optional(), // when this composition was last verified
    caretakerSince: z.string().optional(), // ISO date the Knesset dispersed; the government is a caretaker from then
    governmentSince: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // the government's swearing-in
    sourceUrl: httpUrl.optional(),
    sourceLabel: z.string().optional(),
    statuses: z.record(z.string().regex(/^\d+$/), factionStatusSchema).default({}),
  })
  .superRefine((c, ctx) => {
    // The id list and the per-faction statuses must agree — the pages read
    // one or the other, and a mismatch would label a faction two ways.
    for (const [id, st] of Object.entries(c.statuses)) {
      const listed = c.coalitionFactionIds.includes(Number(id));
      if (listed !== (st.status === "coalition")) {
        ctx.addIssue({
          code: "custom",
          message: `faction ${id}: statuses says ${st.status} but coalitionFactionIds ${listed ? "includes" : "omits"} it`,
        });
      }
    }
  });

export type FactionStatus = z.infer<typeof factionStatusSchema> & {
  // True when the faction changed sides after the government was sworn in —
  // the only case where the date is worth showing next to the label.
  changedMidTerm: boolean;
};

let _coalition: z.infer<typeof coalitionSchema> | null = null;

export function getCoalitionConfig() {
  if (!_coalition) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, "coalition.yaml"), "utf8");
    _coalition = coalitionSchema.parse(parse(raw));
  }
  return _coalition;
}

export function isCoalitionFaction(factionId: number): boolean {
  return getCoalitionConfig().coalitionFactionIds.includes(factionId);
}

// The faction's sourced status, or null when the file has no entry for it
// (older factions the page still labels from the id list).
export function getFactionStatus(factionId: number): FactionStatus | null {
  const cfg = getCoalitionConfig();
  const st = cfg.statuses[String(factionId)];
  if (!st) return null;
  const changedMidTerm = cfg.governmentSince != null && st.since > cfg.governmentSince;
  return { ...st, changedMidTerm };
}

const factionMetaSchema = z.object({
  factions: z.array(
    z.object({
      id: z.number(),
      he: z.string(),
      en: z.string(),
      ar: z.string(),
      ru: z.string(),
      es: z.string().optional(), // Latin-script locales fall back to en
      fr: z.string().optional(),
      color: z.string(),
    }),
  ),
});

export type FactionMeta = z.infer<typeof factionMetaSchema>["factions"][number];

// A faction's curated short name in a locale: the locale's own, else English
// (never Hebrew for a non-Hebrew page — es/fr carry no name of their own yet).
export function localizedMeta(meta: FactionMeta, locale: string): string {
  if (locale === "he") return meta.he;
  return (meta[locale as keyof FactionMeta] as string | undefined) ?? meta.en ?? meta.he;
}

let _factionMeta: Map<number, FactionMeta> | null = null;

export function getFactionMeta(): Map<number, FactionMeta> {
  if (!_factionMeta) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, "factions.yaml"), "utf8");
    const parsed = factionMetaSchema.parse(parse(raw));
    _factionMeta = new Map(parsed.factions.map((f) => [f.id, f]));
  }
  return _factionMeta;
}

// Shared localized-text shapes (one string / a list of strings per language).

// Editorial party profiles — political position + what each faction supports.
export const SPECTRUM_VALUES = [
  "left",
  "center-left",
  "center",
  "center-right",
  "right",
  "far-right",
] as const;
export type Spectrum = (typeof SPECTRUM_VALUES)[number];

const localizedList = z.object({
  he: z.array(z.string()),
  en: z.array(z.string()).optional(),
  ar: z.array(z.string()).optional(),
  ru: z.array(z.string()).optional(),
  es: z.array(z.string()).optional(),
  fr: z.array(z.string()).optional(),
});

const partyProfileSchema = z.object({
  id: z.number(),
  spectrum: z.enum(SPECTRUM_VALUES),
  leaderHe: z.string().optional(),
  leaderEn: z.string().optional(),
  founded: z.number().optional(),
  website: httpUrl.optional(),
  wikipediaEn: httpUrl.optional(),
  tags: z.array(z.string()).optional(),
  summary: localizedText,
  positions: localizedList.optional(),
  // Ballot-slip letters assigned per election list.
  ballotLetters: z.string().optional(),
  ballotNote: localizedText.optional(),
  // Where a profile states a 2026 fact (leader, merger, running status).
  sources: z.array(z.object({ url: httpUrl, title: z.string(), publisher: z.string().optional() })).optional(),
  // How the faction goes into the 2026 election, read from the CEC's list
  // pages: on its own list, inside a joint list, merged into another party,
  // or not at all. `slug` points at the registry card (content/election.yaml);
  // `listNumber` at a row of the full submitted-lists table for lists the
  // registry does not carry.
  election2026: z
    .object({
      runsAs: z.enum(["own", "within", "merged", "none"]),
      slug: listSlug.optional(),
      listNumber: z.number().int().positive().optional(),
      note: localizedText.optional(),
      sources: z.array(sourceRef).optional(),
    })
    .optional(),
  // Dated, sourced developments — the faction's "latest news", newest first
  // on the page. Every item cites at least one report.
  updates: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        text: localizedText,
        sources: z.array(sourceRef).min(1, "every update must cite a source"),
      }),
    )
    .optional(),
  // When the profile was last checked against its sources (rendered).
  verified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type PartyProfile = z.infer<typeof partyProfileSchema>;

let _partyProfiles: Map<number, PartyProfile> | null = null;

export function getPartyProfile(id: number): PartyProfile | undefined {
  if (!_partyProfiles) {
    const raw = fs.readFileSync(
      path.join(CONTENT_DIR, "party-profiles.yaml"),
      "utf8",
    );
    const parsed = z
      .object({ profiles: z.array(partyProfileSchema) })
      .parse(parse(raw));
    _partyProfiles = new Map(parsed.profiles.map((p) => [p.id, p]));
  }
  return _partyProfiles.get(id);
}

// Text fallback for party content: requested locale -> English -> Hebrew.
export function partyText(
  text: LocalizedText | undefined,
  locale: string,
): string {
  if (!text) return "";
  return (
    (text[locale as keyof typeof text] as string | undefined) ?? text.en ?? text.he
  );
}

// Direction/lang attributes for an editorial string that may have fallen back to
// another language (ar/ru pages fall back to en, then he). An English sentence
// inside an RTL layout needs dir="ltr" or its punctuation lands at the wrong
// end; Hebrew inside an LTR layout needs dir="rtl".
export function partyTextAttrs(
  text: LocalizedText | undefined,
  locale: string,
): { dir?: "ltr" | "rtl"; lang?: string } {
  if (!text) return {};
  const resolved = (text[locale as keyof typeof text] as string | undefined) != null ? locale : text.en != null ? "en" : "he";
  if (resolved === locale) return {};
  // `dir` only when the fallback's direction differs from the page's: English
  // on a Russian, Spanish or French page is a language change, not a
  // direction change, and must not be re-aligned.
  const rtl = (l: string) => l === "he" || l === "ar";
  const lang = resolved;
  return rtl(resolved) === rtl(locale) ? { lang } : rtl(resolved) ? { dir: "rtl", lang } : { dir: "ltr", lang };
}

// Class to pair with partyTextAttrs: a run whose direction differs from the
// page must still hug the page's start edge when it wraps. text-align:end is
// the right side of an LTR run (an RTL page's start) and the left side of an
// RTL run (an LTR page's start), so one class serves both cases.
export function partyTextClass(
  text: LocalizedText | undefined,
  locale: string,
): string {
  return partyTextAttrs(text, locale).dir ? "text-end" : "";
}

export function partyList(
  list: { he: string[]; en?: string[]; ar?: string[]; ru?: string[]; es?: string[]; fr?: string[] } | undefined,
  locale: string,
): string[] {
  if (!list) return [];
  return (
    (list[locale as keyof typeof list] as string[] | undefined) ?? list.en ?? list.he
  );
}

// Curated per-member public record (phase 3): one YAML file per person,
// every claim must cite at least one source.
const claimSchema = z.object({
  // "neutral" is for dated news items that are neither to the member's credit
  // nor against them (a new role, a bill, a public stance) — shown in a third
  // list so "for/against" stays a judgement the sources support.
  kind: z.enum(["positive", "negative", "neutral"]),
  category: z.enum([
    "award",
    "volunteering",
    "achievement",
    "conviction",
    "investigation",
    "controversy",
    "news",
    "role",
  ]),
  // Legal status, so a matter is never implied to be more than it is
  // (presumption of innocence for anything not finally adjudicated).
  // "closed": a probe closed without charges (not an acquittal — no charge was
  // ever tried); "ruled": a court gave a final ruling on the matter (an
  // annulled decision, a rejected petition) — not a plea deal or settlement.
  status: z
    .enum(["ongoing", "indicted", "convicted", "acquitted", "overturned", "settled", "closed", "ruled"])
    .optional(),
  title: localizedText,
  description: localizedText.optional(),
  date: z.string().optional(),
  // Every claim must cite at least one reputable, verifiable source (valid URL).
  sources: z
    .array(z.object({ url: httpUrl, title: z.string(), publisher: z.string().optional() }))
    .min(1, "every claim must cite at least one source"),
});

const memberRecordSchema = z.object({
  personId: z.number(),
  // When the record was last editorially verified (YYYY-MM-DD). Shown to the
  // reader — for ongoing legal matters, "as of when" is part of being accurate.
  lastReviewed: z.string().optional(),
  claims: z.array(claimSchema),
});

export type MemberRecord = z.infer<typeof memberRecordSchema>;
export type MemberClaim = z.infer<typeof claimSchema>;

export function getMemberRecord(personId: number): MemberRecord | null {
  const file = path.join(CONTENT_DIR, "members", `${personId}.yaml`);
  if (!fs.existsSync(file)) return null;
  return memberRecordSchema.parse(parse(fs.readFileSync(file, "utf8")));
}

// The Hebrew claim strings a record renders — the caller passes these to
// localizeData / queueDataTranslations before calling localizeMemberRecord.
export function memberRecordHeStrings(record: MemberRecord | null): string[] {
  if (!record) return [];
  return record.claims.flatMap((c) =>
    [c.title.he, c.description?.he].filter((s): s is string => Boolean(s)),
  );
}

// Localize a record's claim text: curated locale text wins, else the unified
// translation cache (so a he/en-only record still reaches ar/ru). Pure transform;
// caller supplies the resolved cache and queues misses in after(). Kept beside
// getMemberRecord so this legally-sensitive text handling is testable.
export function localizeMemberRecord(
  record: MemberRecord | null,
  locale: string,
  cache: Map<string, { text: string }>,
): MemberRecord | null {
  if (!record || locale === "he") return record;
  const resolve = (txt: LocalizedText) =>
    txt[locale as keyof LocalizedText] ?? cache.get(txt.he.trim())?.text ?? txt.he;
  return {
    ...record,
    claims: record.claims.map((c) => ({
      ...c,
      title: { ...c.title, [locale]: resolve(c.title) },
      description: c.description
        ? { ...c.description, [locale]: resolve(c.description) }
        : undefined,
    })),
  };
}

// ---------- elections history ----------

// A notable event during a Knesset term, tagged so the UI can colour it.
const electionEventSchema = z.object({
  kind: z.enum(["good", "bad", "neutral"]).default("neutral"),
  date: z.string().optional(),
  text: localizedText,
});
export type ElectionEvent = z.infer<typeof electionEventSchema>;

const electionSchema = z.object({
  knesset: z.number(),
  date: z.string(),
  turnout: z.number().optional(),
  winner: localizedText,
  winnerSeats: z.number().optional(),
  pm: localizedText.optional(),
  note: localizedText.optional(),
  summary: localizedText.optional(), // longer "read more" description of the term
  events: z.array(electionEventSchema).optional(), // good/bad/neutral milestones
  ended: localizedText.optional(), // how/why the term (or its government) ended
});
export type Election = z.infer<typeof electionSchema>;

let _elections: Election[] | null = null;

export function getElectionsHistory(): Election[] {
  if (!_elections) {
    const raw = fs.readFileSync(
      path.join(CONTENT_DIR, "elections-history.yaml"),
      "utf8",
    );
    _elections = z
      .object({ elections: z.array(electionSchema) })
      .parse(parse(raw))
      .elections.sort((a, b) => b.knesset - a.knesset);
  }
  return _elections;
}

// ---------- political dictionary (glossary) ----------

export { GLOSSARY_CATEGORIES } from "./glossary-categories";
export type { GlossaryCategory } from "./glossary-categories";

const glossaryTermSchema = z.object({
  category: z.enum(GLOSSARY_CATEGORIES),
  term: localizedText,
  def: localizedText,
  sourceUrl: httpUrl.optional(), // for entries stating specific legal figures/rules
});
export type GlossaryTerm = z.infer<typeof glossaryTermSchema>;

let _glossary: GlossaryTerm[] | null = null;

export function getGlossary(): GlossaryTerm[] {
  if (!_glossary) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, "glossary.yaml"), "utf8");
    _glossary = z
      .object({ terms: z.array(glossaryTermSchema) })
      .parse(parse(raw)).terms;
  }
  return _glossary;
}

// ---------- party-fit quiz ----------

// A list's stance on one statement: the value on the reader's own scale, and
// where it comes from — a roll-call vote (cited to the Knesset record, with the
// vote id for the site's own page), the list's platform, or a leader's
// statement in a major outlet. A slug that is absent has no sourced position
// and is shown as such; nothing is inferred.
const quizStanceSchema = z.object({
  value: z.number().int().min(-2).max(2),
  basis: z.enum(["vote", "platform", "statement"]),
  voteId: z.number().int().positive().optional(),
  // When the vote was cast by a predecessor faction (Yesh Atid for Together,
  // National Unity for Blue and White, Labor for the Democrats), say whose.
  recordOf: localizedText.optional(),
  source: z.object({ url: httpUrl, title: z.string(), publisher: z.string().optional() }),
  quote: localizedText,
});

const quizQuestionSchema = z.object({
  id: listSlug,
  topic: z.enum(["institutions", "religion-state", "security", "government", "education", "economy", "society"]),
  // Which side of the aisle agrees with the statement as worded. The set is
  // balanced and alternates (tests/qa/quiz.test.ts), so answering "agree" to
  // everything cannot favour one camp.
  lean: z.enum(["right", "left"]),
  text: localizedText,
  stances: z.record(listSlug, quizStanceSchema),
});
const quizFileSchema = z.object({
  lastReviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  questions: z.array(quizQuestionSchema),
});
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type QuizStance = z.infer<typeof quizStanceSchema>;
export type QuizFile = z.infer<typeof quizFileSchema>;

let _quiz: QuizFile | null = null;

export function getQuizFile(): QuizFile {
  if (!_quiz) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, "quiz.yaml"), "utf8");
    _quiz = quizFileSchema.parse(parse(raw));
  }
  return _quiz;
}

export function getQuiz(): QuizQuestion[] {
  return getQuizFile().questions;
}

// Budget figures come from Ministry of Finance open data in the DB (sync/budget.ts,
// getBudget* in queries.ts). The outlook/news for not-yet-published budgets is editorial:

const budgetOutlookSchema = z.object({
  year: z.number(),
  status: z.enum(["pending", "proposed", "in-knesset", "approved"]),
  headline: localizedText,
  timing: localizedText,
  news: z
    .array(z.object({ date: z.string().optional(), text: localizedText }))
    .optional(),
  links: z
    .array(z.object({ label: localizedText, url: httpUrl }))
    .optional(),
});
export type BudgetOutlook = z.infer<typeof budgetOutlookSchema>;

let _budgetOutlook: BudgetOutlook[] | null = null;

export function getBudgetOutlook(): BudgetOutlook[] {
  if (!_budgetOutlook) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, "budget-outlook.yaml"), "utf8");
    _budgetOutlook = z
      .object({ entries: z.array(budgetOutlookSchema) })
      .parse(parse(raw))
      .entries.sort((a, b) => b.year - a.year);
  }
  return _budgetOutlook;
}

// ---------- upcoming election (editorial) ----------

// A sourced editorial "fact" line: label + value/detail + >=1 citation. Reused for
// facts, rules, and stats. `status` marks certainty (confirmed vs. by-law vs. reported).
const electionFactSchema = z.object({
  key: z.string(),
  label: localizedText,
  value: localizedText.optional(),
  detail: localizedText.optional(),
  date: z.string().optional(), // ISO date — set on keyDates timeline entries
  status: z.enum(["confirmed", "scheduled-by-law", "reported"]).optional(),
  sources: z
    .array(z.object({ url: httpUrl, title: z.string(), publisher: z.string().optional() }))
    .min(1, "every election fact must cite at least one source"),
});

// A party expected to run. Lists are only final once submitted to the Central
// Elections Committee — `note` carries that framing; every entry is sourced.
// Every running list has a stable kebab-case slug. It is THE identity a list
// carries across content: polls and compass stances key on it, and it survives
// name changes, mergers and the absence of a Knesset faction id (new lists).

// A candidate list as the Central Elections Committee publishes it.
const cecListSchema = z.object({
  url: httpUrl,
  listNumber: z.number().int().positive(), // the CEC's own numbering on its index page
  listName: localizedText, // the list's registered name (kinui) as submitted, verbatim
  letters: z.string().min(1), // one string; several requested letters are joined with " / "
  lettersStatus: z.enum(["requested", "approved"]),
  submittedBy: z.array(z.string()).min(1), // registered parties behind the list
  published: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type CecList = z.infer<typeof cecListSchema>;

// One row of the "every list that submitted" table: the CEC index entry plus
// the list head where the list's own page was read.
const submittedListSchema = z.object({
  listNumber: z.number().int().positive(),
  letters: z.string().min(1),
  name: localizedText,
  url: httpUrl,
  head: localizedText.optional(),
  submittedBy: z.array(z.string()).optional(),
  slug: listSlug.optional(), // links the row to a registry card when the list is one of them
});
export type SubmittedList = z.infer<typeof submittedListSchema>;

const electionPartySchema = z.object({
  slug: listSlug,
  name: localizedText,
  leader: localizedText.optional(),
  // Links leader to their member page when in the persons DB. Set only after
  // verifying the id is the RIGHT person — a QA test cross-checks id + name.
  leaderPersonId: z.number().optional(),
  // Fallback link for leaders NOT in the persons DB (the table only holds
  // 25th-Knesset members): their Wikipedia article.
  leaderWiki: httpUrl.optional(),
  note: localizedText.optional(),
  // What the list has said about blocs and partners, as reported by the entry's
  // sources — never inferred from ideology.
  stance: localizedText.optional(),
  // The submitted candidate list in ballot order, as published. Hebrew is the
  // record; `en` is optional and never machine-generated. `personId` links a
  // 25th-Knesset member to their page and is set only on an exact name match
  // (a QA test cross-checks every id against the registry name).
  candidates: z
    .array(z.object({ he: z.string(), en: z.string().optional(), personId: z.number().optional() }))
    .optional(),
  factionId: z.number().optional(), // links to /parties/<id> when it maps to a sitting faction
  // The Central Elections Committee's page for the list: the official name,
  // the letters (requested until the CEC approves the lists, then approved),
  // the parties that submitted it. The one primary source for these facts.
  cec: cecListSchema.optional(),
  // Chart colour for lists with no sitting faction (sitting factions use
  // content/factions.yaml). Party colour appears only where a list is the subject.
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  sources: z
    .array(z.object({ url: httpUrl, title: z.string(), publisher: z.string().optional() }))
    .min(1, "every party entry must cite at least one source"),
});

const electionOutlookSchema = z.object({
  knesset: z.number(), // the Knesset being elected (26)
  expectedDate: z.string().optional(), // ISO date when known
  dateStatus: z.enum(["set", "scheduled-by-law", "reported"]),
  lastReviewed: z.string(), // YYYY-MM-DD editorial verification date
  headline: localizedText,
  intro: localizedText,
  // The road to election day and beyond, in order — each entry dated + sourced.
  keyDates: z.array(electionFactSchema).optional(),
  facts: z.array(electionFactSchema),
  // Practical voting information, every item sourced to the CEC or the law.
  howToVote: z.array(electionFactSchema).default([]),
  parties: z.array(electionPartySchema),
  rules: z.array(electionFactSchema),
  stats: z.array(electionFactSchema),
  news: z
    .array(z.object({ date: z.string().optional(), text: localizedText }))
    .optional(),
  // Every list that submitted, from the CEC's index page — so no list is
  // invisible just because pollsters do not name it.
  submittedLists: z
    .object({
      source: z.object({ url: httpUrl, title: z.string(), publisher: z.string().optional() }),
      asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // the index page's own update date
      lists: z.array(submittedListSchema),
    })
    .optional(),
  // Surplus-vote agreements between two running lists, as
  // reported or as filed with the CEC; a list can be in at most one.
  surplusAgreements: z
    .array(
      z.object({
        between: z.tuple([listSlug, listSlug]),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        status: z.enum(["confirmed", "reported"]).default("reported"),
        sources: z
          .array(z.object({ url: httpUrl, title: z.string(), publisher: z.string().optional() }))
          .min(1, "every agreement must cite at least one source"),
      }),
    )
    .default([]),
  links: z.array(z.object({ label: localizedText, url: httpUrl })),
  disclaimer: localizedText.optional(),
});
export type ElectionOutlook = z.infer<typeof electionOutlookSchema>;
export type ElectionFact = z.infer<typeof electionFactSchema>;
export type ElectionParty = z.infer<typeof electionPartySchema>;

// The registry: slug → running list, in the file's (registry) order. Empty when
// election.yaml is absent or invalid, like getElectionOutlook().
export function getRunningLists(): Map<string, ElectionParty> {
  const outlook = getElectionOutlook();
  return new Map((outlook?.parties ?? []).map((p) => [p.slug, p]));
}

// A running list's display name: the registry's text for the locale, else the
// sitting faction's curated name (content/factions.yaml carries ar/ru), else
// the registry's en/he fallback.
export function listName(list: ElectionParty | undefined, locale: string): string {
  if (!list) return "";
  const own = list.name[locale as keyof typeof list.name];
  if (own) return own;
  if (list.factionId != null) {
    const meta = getFactionMeta().get(list.factionId);
    const curated = meta?.[locale as keyof FactionMeta] as string | undefined;
    if (curated) return curated;
  }
  return partyText(list.name, locale);
}

// Direction attributes to pair with listName(): none when the name resolved in
// the page's locale, else the fallback language's.
export function listNameAttrs(list: ElectionParty | undefined, locale: string): { dir?: "ltr" | "rtl"; lang?: string } {
  if (!list) return {};
  if (list.name[locale as keyof typeof list.name]) return {};
  if (list.factionId != null && getFactionMeta().get(list.factionId)?.[locale as keyof FactionMeta]) return {};
  return partyTextAttrs(list.name, locale);
}

let _electionOutlook: ElectionOutlook | null | undefined;

// null when the file is absent or invalid — the section simply doesn't render,
// so a not-yet-written or mid-edit YAML can never break the site.
export function getElectionOutlook(): ElectionOutlook | null {
  if (_electionOutlook === undefined) {
    try {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, "election.yaml"), "utf8");
      _electionOutlook = electionOutlookSchema.parse(parse(raw));
    } catch {
      _electionOutlook = null;
    }
  }
  return _electionOutlook;
}

// ---------- foreign aid & funding (editorial) ----------

const foreignAidSchema = z.object({
  kind: z.enum(["aid-to-state", "ngo-donations"]),
  donor: localizedText,
  recipient: localizedText,
  amount: localizedText,
  period: localizedText,
  purpose: localizedText,
  source: z.object({ label: localizedText, url: httpUrl }),
});
export type ForeignAidFlow = z.infer<typeof foreignAidSchema>;

const usMilitaryAidSchema = z.object({
  source: z.object({ label: localizedText, url: httpUrl }),
  note: localizedText,
  years: z.array(
    z.object({
      year: z.number(),
      billion: z.number(),
      note: localizedText.optional(),
    }),
  ),
});
const foreignAidFileSchema = z.object({
  usMilitaryAid: usMilitaryAidSchema,
  flows: z.array(foreignAidSchema),
});
export type ForeignAid = z.infer<typeof foreignAidFileSchema>;

let _foreignAid: ForeignAid | null = null;

export function getForeignAid(): ForeignAid {
  if (!_foreignAid) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, "foreign-aid.yaml"), "utf8");
    const parsed = foreignAidFileSchema.parse(parse(raw));
    // Newest year first.
    parsed.usMilitaryAid.years.sort((a, b) => b.year - a.year);
    _foreignAid = parsed;
  }
  return _foreignAid;
}

// ---------- controversial laws (editorial, sourced) ----------

const controversialLawSchema = z.object({
  year: z.number(),
  title: localizedText,
  summary: localizedText,
  sourceUrl: httpUrl,
  // The roll-call(s) behind the law where it falls inside the site's vote
  // record (the 25th Knesset): the election cards show how each sitting
  // faction voted. Laws that predate the record simply have none.
  votes: z
    .array(
      z.object({
        id: z.number().int().positive(),
        stage: localizedText,
        note: localizedText.optional(),
        source: z.object({ url: httpUrl, title: z.string(), publisher: z.string().optional() }),
      }),
    )
    .default([]),
});
export type ControversialLaw = z.infer<typeof controversialLawSchema>;

let _controversialLaws: ControversialLaw[] | null = null;

export function getControversialLaws(): ControversialLaw[] {
  if (!_controversialLaws) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, "controversial-laws.yaml"), "utf8");
    _controversialLaws = z
      .object({ laws: z.array(controversialLawSchema) })
      .parse(parse(raw))
      .laws.sort((a, b) => b.year - a.year);
  }
  return _controversialLaws;
}

// ---------- seat polls (editorial, verified poll by poll) ----------

// One published seat poll. Every figure was checked against the outlet's own
// article (the `verification` line says how); seats are keyed by registry slug
// so a list keeps its identity across name changes; blocs are exactly what the
// outlet counted — the site never assigns a list to a bloc.
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");

const pollSchema = z.object({
  id: z.string().regex(/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/, "id is <published>-<outlet>-<institute>"),
  published: isoDate,
  fieldwork: z.object({ from: isoDate, to: isoDate }).optional(),
  outlet: localizedText,
  // Dedupe key for the poll of polls (latest poll per institute counts once).
  instituteId: listSlug,
  institute: localizedText,
  sample: z.number().int().positive(),
  marginOfError: z.number().positive().optional(), // percentage points, when reported
  seats: z.record(listSlug, z.number().int().nonnegative()),
  belowThreshold: z.array(listSlug).default([]),
  belowThresholdNote: z.string().optional(), // the outlet's own wording/percentages
  blocs: z
    .array(z.object({ label: localizedText, seats: z.number().int().positive() }))
    .default([]),
  note: z.string().optional(),
  verification: z.string().optional(),
  sources: z
    .array(z.object({ url: httpUrl, title: z.string(), publisher: z.string().optional() }))
    .min(1, "every poll must cite the outlet's own article"),
});

const pollsFileSchema = z.object({
  lastReviewed: isoDate,
  cutoff: isoDate, // polls published before this day are out of scope
  threshold: z.number().positive(), // % of valid votes
  thresholdSources: z
    .array(z.object({ url: httpUrl, title: z.string(), publisher: z.string().optional() }))
    .min(1, "the threshold is a legal fact — cite it"),
  // Polls known to exist that could not be verified from a text source.
  notEntered: z
    .array(
      z.object({
        published: isoDate,
        outlet: localizedText,
        institute: localizedText,
        url: httpUrl,
        reason: localizedText,
      }),
    )
    .default([]),
  // Averages published elsewhere, shown for comparison under their own name.
  externalAverages: z
    .array(
      z.object({
        name: localizedText,
        publisher: localizedText,
        url: httpUrl,
        asOf: isoDate,
        method: localizedText,
        values: z.record(listSlug, z.number().nonnegative()),
      }),
    )
    .default([]),
  polls: z.array(pollSchema),
});
export type Poll = z.infer<typeof pollSchema>;
export type PollsFile = z.infer<typeof pollsFileSchema>;

let _polls: PollsFile | null | undefined;

// null when the file is absent or invalid — the polls section simply doesn't
// render. Polls come back newest first regardless of file order.
export function getPolls(): PollsFile | null {
  if (_polls === undefined) {
    try {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, "polls.yaml"), "utf8");
      const parsed = pollsFileSchema.parse(parse(raw));
      parsed.polls.sort((a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id));
      _polls = parsed;
    } catch {
      _polls = null;
    }
  }
  return _polls;
}

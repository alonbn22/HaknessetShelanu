import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { GLOSSARY_CATEGORIES } from "./glossary-categories";

const CONTENT_DIR = path.join(process.cwd(), "content");

// Any URL rendered into an href must be http(s). zod's .url() validates shape
// but not scheme, so it would let javascript:/data: through; this trims first to
// block a leading-whitespace bypass (browsers tolerate "\tjavascript:…"). The
// data is trusted committed YAML, so this is defense-in-depth, applied uniformly.
const httpUrl = z
  .string()
  .trim()
  .refine((u) => /^https?:\/\//i.test(u), "must be an http(s) URL");

const coalitionSchema = z.object({
  knesset: z.number(),
  coalitionFactionIds: z.array(z.number()),
  asOf: z.string().optional(), // when this composition was last verified
  sourceUrl: httpUrl.optional(),
  sourceLabel: z.string().optional(),
});

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

const factionMetaSchema = z.object({
  factions: z.array(
    z.object({
      id: z.number(),
      he: z.string(),
      en: z.string(),
      ar: z.string(),
      ru: z.string(),
      color: z.string(),
    }),
  ),
});

export type FactionMeta = z.infer<typeof factionMetaSchema>["factions"][number];

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
const localizedText = z.object({
  he: z.string(),
  en: z.string().optional(),
  ar: z.string().optional(),
  ru: z.string().optional(),
});

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
});

const partyProfileSchema = z.object({
  id: z.number(),
  spectrum: z.enum(SPECTRUM_VALUES),
  leaderHe: z.string().optional(),
  leaderEn: z.string().optional(),
  founded: z.number().optional(),
  website: z.string().url().optional(),
  wikipediaEn: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  summary: localizedText,
  positions: localizedList.optional(),
  // Ballot-slip letters (אות הפתק) assigned per election list.
  ballotLetters: z.string().optional(),
  ballotNote: localizedText.optional(),
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
  text: { he: string; en?: string; ar?: string; ru?: string } | undefined,
  locale: string,
): string {
  if (!text) return "";
  return (
    (text[locale as keyof typeof text] as string | undefined) ?? text.en ?? text.he
  );
}

export function partyList(
  list: { he: string[]; en?: string[]; ar?: string[]; ru?: string[] } | undefined,
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
  kind: z.enum(["positive", "negative"]),
  category: z.enum([
    "award",
    "volunteering",
    "achievement",
    "conviction",
    "investigation",
    "controversy",
  ]),
  // Legal status, so a matter is never implied to be more than it is
  // (presumption of innocence for anything not finally adjudicated).
  status: z
    .enum(["ongoing", "indicted", "convicted", "acquitted", "overturned", "settled"])
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

const quizQuestionSchema = z.object({
  id: z.string(),
  text: localizedText,
  // stance per faction id (-2..+2). YAML keys are strings → coerce to number.
  stances: z.record(z.string(), z.number()),
});
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

let _quiz: QuizQuestion[] | null = null;

export function getQuiz(): QuizQuestion[] {
  if (!_quiz) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, "quiz.yaml"), "utf8");
    _quiz = z
      .object({ questions: z.array(quizQuestionSchema) })
      .parse(parse(raw)).questions;
  }
  return _quiz;
}

// State budget figures are sourced from the Ministry of Finance open data and
// live in the DB (see scripts/sync/budget.ts and getBudget* in queries.ts).
// The outlook/news for budgets not yet in the open data is editorial:

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

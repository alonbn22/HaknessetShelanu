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

// A party's official logo — a Wikimedia Commons file (the one image host the
// CSP allows) or a copy in /public — always credited to where it came from.
const logoSchema = z.object({
  src: z.string().regex(/^(https:\/\/upload\.wikimedia\.org\/|\/assets\/)/, "logo src: Commons or /assets"),
  plate: z.literal("dark").optional(), // a mark drawn for a dark background
  source: sourceRef,
});

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
    sourcePublisher: z.string().optional(), // shown in the page's language (publishers.yaml)
    statuses: z.record(z.string().regex(/^\d+$/), factionStatusSchema).default({}),
    // The majority the law asks for, with the law itself as the source — so
    // a count under it can be shown as a minority government, not a mistake.
    majority: z.object({ needed: z.number().int().min(1).max(120).default(61), sources: z.array(sourceRef).min(1) }).optional(),
    // The coalition's size at each dated change during the term, each step
    // sourced — so "wasn't it 68?" has a dated answer on the page.
    timeline: z
      .array(
        z.object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          size: z.number().int().min(0).max(120),
          change: z.number().int(),
          note: localizedText,
          sources: z.array(sourceRef).min(1),
        }),
      )
      .default([]),
  })
  .superRefine((c, ctx) => {
    // The timeline must be in date order and add up step by step.
    let prev: number | null = null;
    for (const [i, t] of c.timeline.entries()) {
      if (i > 0 && t.date < c.timeline[i - 1].date) ctx.addIssue({ code: "custom", message: `timeline out of order at ${t.date}` });
      if (prev != null && prev + t.change !== t.size) ctx.addIssue({ code: "custom", message: `timeline ${t.date}: ${prev} + ${t.change} ≠ ${t.size}` });
      prev = t.size;
    }
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

export type MajorityStatus = {
  needed: number;
  // The coalition's size at the timeline's last step, or null without one.
  size: number | null;
  // True when the coalition has been under `needed` since `since`.
  minority: boolean;
  since: string | null;
  sources: { url: string; title: string; publisher?: string }[];
};

// "60 against 60 can't be right — you need 61": the count is right, and the
// pages say why. The trailing run of timeline steps under `needed` gives the
// date the minority government began.
export function getMajorityStatus(): MajorityStatus {
  const cfg = getCoalitionConfig();
  const needed = cfg.majority?.needed ?? 61;
  const sources = cfg.majority?.sources ?? [];
  const last = cfg.timeline.at(-1);
  if (!last || last.size >= needed) return { needed, size: last?.size ?? null, minority: false, since: null, sources };
  let since = last.date;
  for (let i = cfg.timeline.length - 2; i >= 0 && cfg.timeline[i].size < needed; i--) since = cfg.timeline[i].date;
  return { needed, size: last.size, minority: true, since, sources };
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
  foundedSource: sourceRef.optional(), // shown under the year
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
  // The faction's own logo, for a faction no 2026 list continues (the lists'
  // logos live in content/election.yaml and win when both exist).
  logo: logoSchema.optional(),
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

function partyProfiles(): Map<number, PartyProfile> {
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
  return _partyProfiles;
}

export function getPartyProfile(id: number): PartyProfile | undefined {
  return partyProfiles().get(id);
}

// Sitting factions that run inside another party's list — a joint run or a
// merger into it — by that list's slug (each faction's election2026 record).
export function partnerFactionIds(slug: string): number[] {
  const own = getRunningLists().get(slug)?.factionId;
  return [...partyProfiles().values()].filter((p) => p.election2026?.slug === slug && p.id !== own).map((p) => p.id);
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
  // "settled" is a plea deal or settlement only. "ethics": a decision of the
  // Knesset Ethics Committee (a parliamentary sanction or finding, not a court);
  // "nonparty": a court's words about someone who was not a party to the case;
  // "unconfirmed": a proceeding known only from statements or reports that the
  // body said to be conducting it has not confirmed.
  status: z
    .enum([
      "ongoing", "indicted", "convicted", "acquitted", "overturned", "settled", "closed", "ruled",
      "ethics", "nonparty", "unconfirmed",
    ])
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
// localizeData before calling localizeMemberRecord.
export function memberRecordHeStrings(record: MemberRecord | null): string[] {
  if (!record) return [];
  return record.claims.flatMap((c) =>
    [c.title.he, c.description?.he].filter((s): s is string => Boolean(s)),
  );
}

// Localize a record's claim text: curated locale text wins, else the unified
// translation cache (so a he/en-only record still reaches ar/ru). Pure transform;
// caller supplies the resolved cache. Kept beside
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
  sources: z.array(sourceRef).optional(), // cited beside the term's Wikipedia and Knesset links
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
  sourceUrl: httpUrl, // every term cites a trusted source — Wikipedia is an index, never the source
  moreSources: z.array(httpUrl).optional(), // for a clause the first source doesn't cover
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
const stanceSourceSchema = z.object({ url: httpUrl, title: z.string(), publisher: z.string().optional() });
const quizStanceSchema = z.object({
  value: z.number().int().min(-2).max(2),
  basis: z.enum(["vote", "platform", "statement"]),
  voteId: z.number().int().positive().optional(),
  // When the vote was cast by a predecessor faction (Yesh Atid for Together,
  // National Unity for Blue and White, Labor for the Democrats), say whose.
  recordOf: localizedText.optional(),
  source: stanceSourceSchema,
  // Further sources for what the recordOf note says beyond the quote (e.g. the
  // list head's own words when a candidate is quoted), listed after `source`.
  moreSources: z.array(stanceSourceSchema).optional(),
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
  // A two-to-four-word label for the result summaries ("agree on: judicial
  // reform, the draft law…"), and a plain-words explainer of what the
  // statement is about and what each side argues — neutral, no verdict.
  short: localizedText,
  explainer: localizedText,
  // The sources for what the explainer states as fact (a law, a ruling, a
  // vote, official figures); the stances cite their own below.
  explainerSources: z.array(stanceSourceSchema).optional(),
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

// ---------- self-descriptions (the lists' own words) ----------

// What a running list calls itself, only where the list itself uses the words:
// its site, platform or charter, its registered name at the CEC, or its leader
// quoted in a major outlet — never a reporter's description or an inference.
// No tag on a dimension = the list didn't say. Dimensions and values in
// display order; there is no "center": no list calls itself that.
export const SELF_DESCRIPTION_VALUES = {
  camp: ["right", "left"],
  religion: ["religious", "religious-zionist", "haredi", "liberal-on-religion"],
  community: ["arab", "jewish-arab", "sephardi"],
  economy: ["free-market", "social-democratic", "socialist", "communist"],
  national: ["zionist", "national"],
} as const;
export type SelfDescriptionDimension = keyof typeof SELF_DESCRIPTION_VALUES;

const allLanguages = localizedText.required();
const selfDescriptionTagSchema = z
  .object({
    dimension: z.enum(Object.keys(SELF_DESCRIPTION_VALUES) as SelfDescriptionDimension[]),
    value: z.string(),
    quote: allLanguages, // he verbatim; the other five translate it
    note: allLanguages.optional(), // shown in parentheses after the quote
    source: z.object({
      url: z.string().trim().refine((u) => /^https:\/\//.test(u), "must be an https URL"),
      title: z.string().min(1),
      publisher: z.string().min(1),
    }),
  })
  .superRefine((t, ctx) => {
    if (!(SELF_DESCRIPTION_VALUES[t.dimension] as readonly string[]).includes(t.value)) {
      ctx.addIssue({ code: "custom", message: `"${t.value}" is not a ${t.dimension} value` });
    }
  });
const selfDescriptionsFileSchema = z.object({
  lastReviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lists: z.record(listSlug, z.array(selfDescriptionTagSchema).min(1)),
});
export type SelfDescriptionTag = z.infer<typeof selfDescriptionTagSchema>;
export type SelfDescriptions = z.infer<typeof selfDescriptionsFileSchema>;

let _selfDescriptions: SelfDescriptions | null = null;

// Registry membership is checked in tests/qa/self-descriptions.test.ts, not
// here: a mid-edit election.yaml empties the registry, and that must not take
// the finder down with it.
export function getSelfDescriptions(): SelfDescriptions {
  if (!_selfDescriptions) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, "self-descriptions.yaml"), "utf8");
    _selfDescriptions = selfDescriptionsFileSchema.parse(parse(raw));
  }
  return _selfDescriptions;
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

// A candidate as the CEC prints the name (Hebrew, the record). en/ar/ru are the
// Knesset's own spellings (its MK directory) for current and former MKs and
// their exact namesakes — never machine-generated; otherwise the Hebrew shows.
const candidateSchema = z.object({
  he: z.string().min(1),
  en: z.string().optional(),
  ar: z.string().optional(),
  ru: z.string().optional(),
});

// Official spelling, else the site's transliteration (the translations cache,
// passed in from localizeData — never machine-translated), else the Hebrew.
export function candidateName(
  c: { he: string; en?: string; ar?: string; ru?: string },
  locale: string,
  transliterated?: Map<string, { text: string }>,
): string {
  if (locale === "he") return c.he;
  const official = (locale === "ar" ? c.ar : locale === "ru" ? c.ru : undefined) ?? c.en;
  return official ?? transliterated?.get(c.he.trim())?.text ?? c.he;
}

// A running list's page: its faction's page when it continues a sitting
// faction (one combined page per party), else its own election page.
export function listHref(list: { slug: string; factionId?: number }): string {
  return list.factionId != null ? `/parties/${list.factionId}` : `/elections/${list.slug}`;
}

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
  // The CEC page's "updated" date, and the roster exactly as the committee
  // prints it (surname first); `party` is the submitting party the candidate
  // was recorded under, given only on joint lists.
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  candidates: z.array(candidateSchema.extend({ party: z.string().optional() })).optional(),
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
  // The submitted candidate list in ballot order, as published (see
  // candidateSchema for the names). `personId` links a 25th-Knesset member to
  // their page and is set only on an exact name match (a QA test cross-checks
  // every id against the registry name).
  candidates: z.array(candidateSchema.extend({ personId: z.number().optional() })).optional(),
  factionId: z.number().optional(), // links to /parties/<id> when it maps to a sitting faction
  // The Central Elections Committee's page for the list: the official name,
  // the letters (requested until the CEC approves the lists, then approved),
  // the parties that submitted it. The one primary source for these facts.
  cec: cecListSchema.optional(),
  // Chart colour for lists with no sitting faction (sitting factions use
  // content/factions.yaml). Party colour appears only where a list is the subject.
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  // The list's own website, and what it promises: the first commitments it
  // headlines there or in its platform, in its own order — chosen by that rule,
  // never by us. Absent = none published.
  website: httpUrl.optional(),
  logo: logoSchema.optional(), // the list's official logo
  promises: z
    .object({
      items: z.array(localizedText).min(1).max(4),
      // What kind of document the items come from, when it is not a 2026 platform.
      note: localizedText.optional(),
      sources: z.array(z.object({ url: httpUrl, title: z.string(), publisher: z.string().optional() })).min(1),
    })
    .optional(),
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
  // Primary sources for the summary: the Knesset's record of the law, its
  // text, a court ruling, IDI, an outlet's report. Never Wikipedia (a test).
  sources: z.array(sourceRef).min(1),
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

// The pollster's own filing with the Central Elections Committee — the
// disclosure the Elections (Propaganda Methods) Law s. 16e(b)–(c) asks of a
// published poll. Shown beside the article's figures, never in their place;
// `note` says where the two differ. No filing date: the committee's list runs
// a day off.
const cecFilingRef = z.object({ ref: z.string().min(1), url: httpUrl });
const pollFilingSchema = cecFilingRef.extend({
  commissionedBy: localizedText,
  conductedBy: localizedText,
  population: localizedText.optional(),
  asked: z.number().int().positive().optional(),
  answered: z.number().int().positive().optional(),
  marginOfError: z.number().positive().optional(),
  question: localizedText.optional(), // the vote-intention question, verbatim in he
  note: localizedText.optional(),
  refiled: z.array(cecFilingRef).optional(),
});

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
  note: localizedText.optional(),
  verification: z.string().optional(),
  sources: z
    .array(z.object({ url: httpUrl, title: z.string(), publisher: z.string().optional() }))
    .min(1, "every poll must cite the outlet's own article"),
  filing: pollFilingSchema.optional(),
});

const pollsFileSchema = z.object({
  lastReviewed: isoDate,
  cutoff: isoDate, // polls published before this day are out of scope
  filingsCheckedAt: isoDate.optional(), // the day the committee's filings were last searched
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

// Publisher names in the six languages (content/publishers.yaml), keyed by the
// exact `publisher:` string the content cites, so a source credit reads in the
// page's language. Unknown names pass through unchanged (Latin-script brands).
const publishersFileSchema = z.object({
  publishers: z.array(
    z.object({ key: z.string(), en: z.string(), ar: z.string(), ru: z.string(), es: z.string(), fr: z.string() }),
  ),
});

let _publishers: Map<string, Record<string, string>> | null = null;

export function getPublisherNames(): Map<string, Record<string, string>> {
  if (!_publishers) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, "publishers.yaml"), "utf8");
    _publishers = new Map(publishersFileSchema.parse(parse(raw)).publishers.map(({ key, ...names }) => [key, names]));
  }
  return _publishers;
}

export function publisherName(name: string | undefined, locale: string): string | undefined {
  if (!name || locale === "he") return name;
  return getPublisherNames().get(name)?.[locale] ?? name;
}

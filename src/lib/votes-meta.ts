// Classify a plenum vote from its "for" option description (Hebrew, from the
// Knesset API): the kind of vote and, for bills, the reading stage. The "for"
// text is the reliable signal for what passing does.

export type VoteKind =
  | "preliminary"
  | "first"
  | "second"
  | "third"
  | "second_third"
  | "agenda"
  | "noConfidence"
  | "reservation"
  | "secondaryLegislation"
  | "continuity"
  | "committeeReferral"
  | "decision"
  | "other";

// Bill-reading kinds (these have a "which reading" answer).
const READING_KINDS = new Set<VoteKind>([
  "preliminary",
  "first",
  "second",
  "third",
  "second_third",
]);

export function isReading(kind: VoteKind): boolean {
  return READING_KINDS.has(kind);
}

// Where each kind's plain-words explanation (reading.explain_*) comes from: the
// Knesset's Lexicon, read on 28 Sep 2026. "decision" only names a kind of vote.
const LEXICON = "https://main.knesset.gov.il/EN/About/Lexicon/Pages/";
// Publisher keys are Hebrew (content/publishers.yaml names them per language).
export const KNESSET_LEXICON = "\u05dc\u05e7\u05e1\u05d9\u05e7\u05d5\u05df \u05d4\u05db\u05e0\u05e1\u05ea";
const ATTORNEY_GENERAL = "\u05d4\u05d9\u05d5\u05e2\u05e5 \u05d4\u05de\u05e9\u05e4\u05d8\u05d9 \u05dc\u05de\u05de\u05e9\u05dc\u05d4";
const LEGISLATION = { url: `${LEXICON}Legislation.aspx`, title: "Legislation", publisher: KNESSET_LEXICON };
export const KIND_SOURCES: Partial<Record<VoteKind, { url: string; title: string; publisher: string }>> = {
  preliminary: LEGISLATION,
  first: LEGISLATION,
  second: LEGISLATION,
  third: LEGISLATION,
  second_third: LEGISLATION,
  reservation: LEGISLATION,
  committeeReferral: LEGISLATION,
  agenda: { url: `${LEXICON}MotionsForTheAgenda.aspx`, title: "Motions for the Agenda", publisher: KNESSET_LEXICON },
  noConfidence: { url: `${LEXICON}NoConfidence.aspx`, title: "Motion of No-Confidence in the Government", publisher: KNESSET_LEXICON },
  continuity: { url: `${LEXICON}RuleOfContinuity.aspx`, title: "Rule of Continuity", publisher: KNESSET_LEXICON },
  secondaryLegislation: {
    url: "https://m.knesset.gov.il/Activity/Legislation/Documents/regulation_explanation.pdf",
    title: "Attorney General's Guideline 2.3100: Secondary legislation, procedure and guidelines (Hebrew)",
    publisher: ATTORNEY_GENERAL,
  },
};

export function voteKind(
  forDesc: string | null | undefined,
  titleHe?: string | null,
): VoteKind {
  const s = `${forDesc ?? ""} ${titleHe ?? ""}`;

  // Non-reading kinds first where they would otherwise collide.
  if (s.includes("אי-אמון") || s.includes("אי אמון")) return "noConfidence";

  // Bill readings. Order matters: "להכנה לקריאה ראשונה" is a *preliminary*
  // reading vote even though it contains "קריאה ראשונה".
  if (s.includes("טרומית") || s.includes("להכנה לקריאה ראשונה")) return "preliminary";
  if (s.includes("שנייה ושלישית") || s.includes("שניה ושלישית")) return "second_third";
  if (s.includes("קריאה שלישית")) return "third";
  if (s.includes("קריאה שנייה") || s.includes("קריאה שניה")) return "second";
  if (s.includes("קריאה ראשונה")) return "first";

  if (s.includes("הסתייגות")) return "reservation";
  if (s.includes("דין רציפות")) return "continuity";
  if (s.includes("חקיקת משנה") || s.includes("חקיקת המשנה")) return "secondaryLegislation";
  if (s.includes("לסדר היום") || s.includes("להעביר את הנושא")) return "agenda";
  if (s.includes("הצעת החוק") && s.includes("לוועדה")) return "committeeReferral";
  if (
    s.includes("לקבל את הודעת") ||
    s.includes("לקבל את ההחלטה") ||
    s.includes("לקבל את המלצת") ||
    s.includes("לאשר את ההצעה") ||
    s.includes("לקבל את הצעת")
  )
    return "decision";
  return "other";
}

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

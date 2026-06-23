import { useTranslations } from "next-intl";
import { voteKind, isReading, type VoteKind } from "@/lib/votes-meta";

const kindStyles: Record<VoteKind, string> = {
  preliminary: "bg-sky-100 text-sky-800",
  first: "bg-indigo-100 text-indigo-800",
  second: "bg-violet-100 text-violet-800",
  third: "bg-emerald-100 text-emerald-800",
  second_third: "bg-emerald-100 text-emerald-800",
  agenda: "bg-amber-100 text-amber-800",
  noConfidence: "bg-rose-100 text-rose-800",
  reservation: "bg-orange-100 text-orange-800",
  secondaryLegislation: "bg-teal-100 text-teal-800",
  continuity: "bg-cyan-100 text-cyan-800",
  committeeReferral: "bg-gray-100 text-gray-700",
  decision: "bg-slate-100 text-slate-700",
  other: "bg-gray-100 text-gray-600",
};

// A badge naming the kind of vote (bill reading, agenda motion, no-confidence…).
export function ReadingBadge({
  forDesc,
  titleHe,
}: {
  forDesc: string | null;
  titleHe?: string | null;
}) {
  const t = useTranslations("reading");
  const kind = voteKind(forDesc, titleHe);
  if (kind === "other") return null;
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${kindStyles[kind]}`}
    >
      {t(`kind_${kind}`)}
    </span>
  );
}

// Plain-language meaning of a "for" vote, derived from the official option text.
export function VoteMeaning({
  forDesc,
  titleHe,
}: {
  forDesc: string | null;
  titleHe?: string | null;
}) {
  const t = useTranslations("reading");
  const kind = voteKind(forDesc, titleHe);
  if (kind === "other" && !forDesc) return null;
  return (
    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-emerald-800">{t("meaning")}</div>
        <span className="text-xs text-emerald-700">
          {isReading(kind) ? t("isBillReading") : t("notBillReading")}
        </span>
      </div>
      {kind !== "other" && <p className="text-sm">{t(`explain_${kind}`)}</p>}
      {forDesc && (
        <p className="text-xs text-muted" dir="rtl" lang="he">
          {forDesc}
        </p>
      )}
    </div>
  );
}

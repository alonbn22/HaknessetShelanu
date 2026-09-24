import { getTranslations, getLocale } from "next-intl/server";
import { getMajorityStatus } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { SourceLinks } from "@/components/SourceLinks";

// "60 against 60 can't be right — you need 61." The count is right, and this
// is the paragraph that says why, shown beside it only while the coalition is
// under the majority the law asks for. The law itself is the source.
export async function MinorityNote({ coalitionSeats, className = "" }: { coalitionSeats: number; className?: string }) {
  const majority = getMajorityStatus();
  if (coalitionSeats >= majority.needed) return null;
  const t = await getTranslations();
  const locale = await getLocale();
  // The date comes from the sourced timeline; without one, the head stays dateless.
  const since = majority.minority && majority.since ? formatDate(majority.since, locale) : null;
  return (
    <div className={`space-y-1 text-sm ${className}`.trim()}>
      <p className="font-semibold">{since ? t("common.minorityHeadSince", { date: since }) : t("common.minorityHead")}</p>
      <p className="text-muted">{t("common.minorityNote", { coalition: coalitionSeats, majority: majority.needed })}</p>
      <SourceLinks sources={majority.sources} label={t("common.source")} />
    </div>
  );
}

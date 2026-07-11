import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { personName, factionName, type MemberListItem } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { govMinistry } from "@/lib/gov-terms";
import { rtlAttrs } from "@/lib/text";
import { MemberAvatar } from "./MemberAvatar";

// Re-exported so existing server-side imports of MemberAvatar via MemberCard keep working.
export { MemberAvatar };

export function MemberCard({
  member,
  locale,
}: {
  member: MemberListItem;
  locale: string;
}) {
  const t = useTranslations("members");
  return (
    <Link
      href={`/members/${member.id}`}
      className={`flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm hover:shadow-md transition-shadow ${
        member.isSitting ? "" : "opacity-90"
      }`}
    >
      <MemberAvatar person={member} alt={personName(member, locale)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate" {...rtlAttrs(personName(member, locale))}>
            {personName(member, locale)}
          </span>
          {!member.isSitting && member.ministryHe && (
            <span className="shrink-0 rounded-full bg-accent/15 text-accent px-2 py-0.5 text-[11px] font-medium">
              {t("minister")}
            </span>
          )}
          {!member.isSitting && !member.ministryHe && (
            <span className="shrink-0 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[11px] font-medium">
              {t("former")}
            </span>
          )}
        </div>
        {member.factionId != null && (
          <div className="text-sm text-muted truncate">
            {factionName(member.factionId, member.factionNameHe ?? "", locale)}
          </div>
        )}
        {!member.isSitting && member.ministryHe ? (
          (() => {
            const g = govMinistry(member.ministryHe, locale);
            return (
              <div
                className="text-xs text-muted truncate"
                dir={g.rtl ? "rtl" : undefined}
                lang={g.rtl ? "he" : undefined}
              >
                {g.text}
              </div>
            );
          })()
        ) : !member.isSitting && member.leftDate ? (
          <div className="text-xs text-muted truncate">
            {t("servedUntil", { date: formatDate(member.leftDate, locale) })}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { govVoteItemType } from "@/lib/gov-terms";
import { ReadingBadge } from "./ReadingBadge";
import { BADGE_BASE, BADGE_PASS, BADGE_FAIL } from "@/lib/badge";
import type { Vote } from "@/lib/queries";

// `title` is resolved on the server (unified translation cache) and passed in.
export function VoteCard({
  vote,
  title,
}: {
  vote: Vote;
  title: { text: string; translated: boolean };
}) {
  const t = useTranslations("votes");
  const locale = useLocale();

  return (
    <Link
      href={`/votes/${vote.id}`}
      className="block rounded-xl bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between gap-2 text-sm text-muted">
        <span>{formatDate(vote.dateTime, locale)}</span>
        {vote.isAccepted != null && (
          <span className={`${BADGE_BASE} ${vote.isAccepted ? BADGE_PASS : BADGE_FAIL}`}>
            {vote.isAccepted ? t("accepted") : t("rejected")}
          </span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <ReadingBadge forDesc={vote.forDesc} titleHe={vote.titleHe} />
        {vote.itemTypeDesc &&
          (() => {
            const g = govVoteItemType(vote.itemTypeDesc, locale);
            return (
              <span
                className="inline-block rounded bg-accent/10 px-2 py-0.5 text-xs text-accent"
                dir={g.rtl ? "rtl" : undefined}
                lang={g.rtl ? "he" : undefined}
              >
                {g.text}
              </span>
            );
          })()}
      </div>
      <div
        className="mt-1 font-medium leading-snug line-clamp-3"
        dir={title.translated ? undefined : "rtl"}
        lang={title.translated ? locale : "he"}
      >
        {title.text}
      </div>
      {title.translated && (
        <div className="mt-0.5 text-[10px] text-muted">{t("autoTranslated")}</div>
      )}
      <div className="mt-2 flex gap-4 text-sm" dir="ltr">
        <span className="text-green-700">✓ {vote.totalFor}</span>
        <span className="text-red-700">✗ {vote.totalAgainst}</span>
        <span className="text-yellow-700">− {vote.totalAbstain}</span>
      </div>
    </Link>
  );
}

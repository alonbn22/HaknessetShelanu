import { useTranslations, useLocale } from "next-intl";
import { localizedAttrs } from "@/lib/text";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { govVoteItemType } from "@/lib/gov-terms";
import { ReadingBadge } from "./ReadingBadge";
import { Badge } from "./ui/Badge";
import { interactiveCardClass } from "./ui/Card";
import type { Vote } from "@/lib/queries";

// `title` is resolved on the server (unified translation cache) and passed in.
export function VoteCard({
  vote,
  title,
}: {
  vote: Vote;
  title: { text: string; translated: boolean; rtl: boolean; lang?: string };
}) {
  const t = useTranslations("votes");
  const locale = useLocale();

  return (
    <Link
      href={`/votes/${vote.id}`}
      className={interactiveCardClass("sm", "block")}
    >
      <div className="flex items-center justify-between gap-2 text-sm text-muted">
        <span>{formatDate(vote.dateTime, locale)}</span>
        {vote.isAccepted != null && (
          <Badge tone={vote.isAccepted ? "pass" : "fail"}>
            {vote.isAccepted ? t("accepted") : t("rejected")}
          </Badge>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <ReadingBadge forDesc={vote.forDesc} titleHe={vote.titleHe} />
        {vote.itemTypeDesc &&
          (() => {
            const g = govVoteItemType(vote.itemTypeDesc, locale);
            return (
              <span
                className="inline-block rounded-chip bg-accent-soft px-2 py-0.5 text-xs text-accent-ink"
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
        {...localizedAttrs(title)}
      >
        {title.text}
      </div>
      {title.translated && (
        <div className="mt-0.5 text-[10px] text-muted">{t("autoTranslated")}</div>
      )}
      <div className="mt-2 flex gap-4 text-sm" dir="ltr">
        <span className="text-pass-ink">✓ {vote.totalFor}</span>
        <span className="text-fail-ink">✗ {vote.totalAgainst}</span>
        <span className="text-warn-ink">− {vote.totalAbstain}</span>
      </div>
    </Link>
  );
}

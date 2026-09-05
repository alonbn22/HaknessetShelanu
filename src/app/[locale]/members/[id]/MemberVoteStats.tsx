import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { VoteResultBadge } from "@/components/VoteResultBadge";
import { formatDate } from "@/lib/format";
import { localizedAttrs } from "@/lib/text";
import type { Localized } from "@/lib/i18n-data";
import type {
  getMemberStats,
  getPartyDiscipline,
  getMemberRebellions,
} from "@/lib/queries";

// Participation stats + party-discipline % with the rebellion drill-down. Pure
// presentation: the page fetches the data and passes it in.
export async function MemberVoteStats({
  personId,
  stats,
  discipline,
  rebellions,
  locale,
  localOf,
}: {
  personId: number;
  stats: NonNullable<ReturnType<typeof getMemberStats>>;
  discipline: ReturnType<typeof getPartyDiscipline>;
  rebellions: ReturnType<typeof getMemberRebellions>;
  locale: string;
  localOf: (he: string | null | undefined) => Localized;
}) {
  const t = await getTranslations();
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{t("member.voteStats")}</h2>
        <Link
          href={`/compare?a=${personId}`}
          className="whitespace-nowrap text-sm text-accent hover:underline"
        >
          {t("compare.title")} →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold tabular-nums text-accent">{stats.participationPct}%</div>
          <div className="text-sm text-muted">{t("member.participated")}</div>
        </div>
        <div>
          <div className="text-2xl font-bold tabular-nums text-green-700">{stats.votedFor}</div>
          <div className="text-sm text-muted">{t("member.votesFor")}</div>
        </div>
        <div>
          <div className="text-2xl font-bold tabular-nums text-red-700">{stats.votedAgainst}</div>
          <div className="text-sm text-muted">{t("member.votesAgainst")}</div>
        </div>
        <div>
          <div className="text-2xl font-bold tabular-nums text-yellow-700">{stats.abstained}</div>
          <div className="text-sm text-muted">{t("member.abstained")}</div>
        </div>
        <div>
          <div className="text-2xl font-bold tabular-nums text-muted">{stats.missed}</div>
          <div className="text-sm text-muted">{t("member.missed")}</div>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex h-3 w-full overflow-hidden rounded-full" dir="ltr">
          <div
            className="bg-accent"
            style={{ width: `${stats.participationPct}%` }}
            title={`${t("member.participated")} ${stats.participationPct}%`}
          />
          <div
            className="bg-black/15"
            style={{ width: `${100 - stats.participationPct}%` }}
            title={`${t("member.missed")} ${stats.missed}`}
          />
        </div>
        <div className="flex justify-between text-xs text-muted">
          <span>
            {t("member.participated")}: {stats.participated.toLocaleString(locale)}
          </span>
          <span>
            {t("member.missed")}: {stats.missed.toLocaleString(locale)}
          </span>
        </div>
      </div>
      <p className="text-sm text-muted">
        {t("member.ofVotesHeld", { total: stats.votesHeld.toLocaleString(locale) })}
      </p>
      {discipline && (
        <div className="rounded-lg bg-black/3 px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-accent">{discipline.pct}%</span>
            <span className="text-sm font-semibold">{t("member.partyLine")}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {t("member.partyLineDetail", {
              withParty: discipline.withParty.toLocaleString(locale),
              total: discipline.total.toLocaleString(locale),
            })}
          </p>
          {/* The receipts: which votes broke with the faction majority. */}
          {rebellions.length > 0 && (
            <details className="group mt-2">
              <summary className="cursor-pointer list-none text-sm font-medium text-accent hover:underline [&::-webkit-details-marker]:hidden">
                <span aria-hidden className="select-none">
                  <span className="group-open:hidden">+</span>
                  <span className="hidden group-open:inline">&minus;</span>
                </span>{" "}
                {t("member.rebellions", { count: discipline.total - discipline.withParty })}
              </summary>
              <ul className="mt-2 divide-y divide-black/5">
                {rebellions.map((r) => {
                  const rt = localOf(r.titleHe);
                  return (
                    <li key={r.voteId} className="space-y-1 py-2 text-sm">
                      <Link href={`/votes/${r.voteId}`} className="hover:underline" {...localizedAttrs(rt)}>
                        {rt.text}
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                        <span className="whitespace-nowrap">{formatDate(r.dateTime, locale)}</span>
                        <span className="flex items-center gap-1">
                          {t("member.mkVoted")} <VoteResultBadge code={r.mkCode} />
                        </span>
                        <span className="flex items-center gap-1">
                          {t("member.factionVoted")} <VoteResultBadge code={r.factionCode} />
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {discipline.total - discipline.withParty > rebellions.length && (
                <p className="mt-1 text-xs text-muted">
                  {t("member.rebellionsShowing", { shown: rebellions.length })}
                </p>
              )}
            </details>
          )}
        </div>
      )}
    </section>
  );
}

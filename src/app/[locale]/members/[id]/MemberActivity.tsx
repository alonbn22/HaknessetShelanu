import { getTranslations } from "next-intl/server";
import { govMinistry } from "@/lib/gov-terms";
import { localizedAttrs } from "@/lib/text";
import type { Localized } from "@/lib/i18n-data";
import type {
  getMemberRecentQuestions,
  getMemberQuestionStats,
  getMemberRecentAgendas,
} from "@/lib/queries";

// Bills/questions/agenda-motions counts, question-response accountability, and
// the recent-question + recent-agenda lists. Pure presentation.
export async function MemberActivity({
  sponsoredCount,
  questionCount,
  agendaCount,
  questionStats,
  recentQuestions,
  recentAgendas,
  ministryNames,
  locale,
  localOf,
}: {
  sponsoredCount: number;
  questionCount: number;
  agendaCount: number;
  questionStats: ReturnType<typeof getMemberQuestionStats>;
  recentQuestions: ReturnType<typeof getMemberRecentQuestions>;
  recentAgendas: ReturnType<typeof getMemberRecentAgendas>;
  ministryNames: Map<number, string>;
  locale: string;
  localOf: (he: string | null | undefined) => Localized;
}) {
  const t = await getTranslations();
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm space-y-4">
      <h2 className="text-xl font-semibold">{t("member.activity")}</h2>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-accent">{sponsoredCount}</div>
          <div className="text-sm text-muted">{t("member.billsProposed")}</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-accent">{questionCount}</div>
          <div className="text-sm text-muted">{t("member.questions")}</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-accent">{agendaCount}</div>
          <div className="text-sm text-muted">{t("member.agendaMotions")}</div>
        </div>
      </div>
      {/* Question accountability: answered rate + ministry response time,
          straight from the official submit/reply dates. */}
      {questionStats && (
        <p className="text-center text-sm text-muted">
          {t("member.questionsAnswered", {
            answered: questionStats.answered,
            total: questionStats.total,
          })}
          {questionStats.avgResponseDays != null && (
            <> · {t("member.avgResponse", { days: questionStats.avgResponseDays })}</>
          )}
        </p>
      )}
      {recentQuestions.length > 0 && (
        <ul className="divide-y divide-black/5 pt-2">
          {recentQuestions.map((q) => {
            const qt = localOf(q.nameHe);
            const ministryHe = q.govMinistryId != null ? ministryNames.get(q.govMinistryId) : undefined;
            const ministry = ministryHe ? govMinistry(ministryHe, locale) : null;
            return (
              <li key={q.id} className="flex items-start gap-2 py-2 text-sm">
                <span className="min-w-0 flex-1" {...localizedAttrs(qt)}>
                  {qt.text}
                  {ministry && (
                    <span
                      className="ms-2 whitespace-nowrap rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-muted"
                      dir={ministry.rtl ? "rtl" : undefined}
                      lang={ministry.rtl ? "he" : undefined}
                    >
                      {ministry.text}
                    </span>
                  )}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    q.replyDate ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {q.replyDate ? t("member.answered") : t("member.unanswered")}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {recentAgendas.length > 0 && (
        <div className="pt-2">
          <h3 className="mb-1 text-sm font-semibold text-muted">{t("member.agendaMotions")}</h3>
          <ul className="divide-y divide-black/5">
            {recentAgendas.map((a) => {
              const at = localOf(a.nameHe);
              return (
                <li key={a.id} className="py-2 text-sm" {...localizedAttrs(at)}>
                  {at.text}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MemberAvatar } from "@/components/MemberCard";
import { getMinisters, getMinistryQuestionStats, getSeatTurnover, personName, factionName } from "@/lib/queries";
import { govDuty, govMinistry } from "@/lib/gov-terms";
import { rtlAttrs } from "@/lib/text";

export const dynamic = "force-dynamic";

export default async function MinistersPage() {
  const t = await getTranslations("ministers");
  const locale = await getLocale();
  const ministers = getMinisters();
  // Per-ministry question accountability (empty until gov_ministries is synced).
  const qaStats = getMinistryQuestionStats();
  const turnover = getSeatTurnover();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted">{t("subtitle", { count: ministers.length })}</p>
      </div>

      {/* Explainer: why the government list and the 120 seats don't line up,
          with the counts from the Knesset's own position records. */}
      <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm leading-relaxed">
        {t("norwegianNote")}
        {turnover.departed > 0 && <> {t("seatTurnover", turnover)}</>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {ministers.map((m) => (
          <Link
            key={m.id}
            href={`/members/${m.id}`}
            className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <MemberAvatar person={m} name={personName(m, locale)} size={48} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate" {...rtlAttrs(personName(m, locale))}>
                  {personName(m, locale)}
                </span>
                {!m.isSitting && (
                  <span
                    className="shrink-0 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[11px] font-medium"
                    title={t("norwegianTag")}
                  >
                    {t("norwegianBadge")}
                  </span>
                )}
              </div>
              {m.factionId != null && (
                <div className="text-sm text-muted truncate">
                  {factionName(m.factionId, m.factionNameHe ?? "", locale)}
                </div>
              )}
              <ul className="mt-1.5 space-y-0.5">
                {m.ministriesHe.map((ministry) => {
                  const g = govMinistry(ministry, locale);
                  return (
                    <li
                      key={ministry}
                      className="text-sm font-medium text-accent-deep"
                      dir={g.rtl ? "rtl" : undefined}
                      lang={g.rtl ? "he" : undefined}
                    >
                      {g.text}
                    </li>
                  );
                })}
              </ul>
              {m.dutiesHe.length > 0 && (
                <div className="mt-0.5 text-xs text-muted">
                  {/* Per-duty dir/lang: an untranslated duty stays Hebrew RTL. */}
                  {m.dutiesHe.map((d, i) => {
                    const g = govDuty(d, locale);
                    return (
                      <span key={d} dir={g.rtl ? "rtl" : undefined} lang={g.rtl ? "he" : undefined}>
                        {i > 0 ? ", " : ""}
                        {g.text}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Which ministries answer parliamentary questions — and how fast. From
          the official submit/reply dates on every question this Knesset. */}
      {qaStats.length > 0 && (
        <section className="rounded-xl bg-white p-6 shadow-sm space-y-3">
          <div>
            <h2 className="text-xl font-semibold">{t("qaTitle")}</h2>
            <p className="text-sm text-muted">{t("qaSubtitle")}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-start text-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("qaMinistry")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("qaQuestions")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("qaAnswered")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("qaAvgDays")}</th>
                </tr>
              </thead>
              <tbody>
                {qaStats.map((s) => {
                  const g = govMinistry(s.ministryHe, locale);
                  return (
                    <tr key={s.ministryHe} className="border-b border-black/5 last:border-0">
                      <td
                        className="px-3 py-2"
                        dir={g.rtl ? "rtl" : undefined}
                        lang={g.rtl ? "he" : undefined}
                      >
                        {g.text}
                      </td>
                      <td className="px-3 py-2 text-end tabular-nums">{s.total}</td>
                      <td className="px-3 py-2 text-end tabular-nums">
                        {s.answered}
                        <span className="text-muted"> ({Math.round((100 * s.answered) / s.total)}%)</span>
                      </td>
                      <td className="px-3 py-2 text-end tabular-nums">
                        {s.avgResponseDays ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="text-xs text-muted">{t("note")}</p>
    </div>
  );
}

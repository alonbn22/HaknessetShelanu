import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MemberAvatar } from "@/components/MemberCard";
import { getMinisters, personName, factionName } from "@/lib/queries";
import { govDuty, govMinistry } from "@/lib/gov-terms";
import { rtlAttrs } from "@/lib/text";

export const dynamic = "force-dynamic";

export default async function MinistersPage() {
  const t = await getTranslations("ministers");
  const locale = await getLocale();
  const ministers = getMinisters();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted">{t("subtitle", { count: ministers.length })}</p>
      </div>

      {/* Explainer: why the government list and the 120 seats don't line up. */}
      <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm leading-relaxed">
        {t("norwegianNote")}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {ministers.map((m) => (
          <Link
            key={m.id}
            href={`/members/${m.id}`}
            className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <MemberAvatar person={m} size={48} />
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

      <p className="text-xs text-muted">{t("note")}</p>
    </div>
  );
}

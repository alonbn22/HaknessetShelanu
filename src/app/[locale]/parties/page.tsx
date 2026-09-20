import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getCurrentFactionsWithSeats,
  getAllFactionAvgParticipation,
  factionName,
  factionColor,
} from "@/lib/queries";
import { getPartyProfile, getCoalitionConfig, partyText, partyTextAttrs } from "@/lib/content";
import { SourceLinks } from "@/components/SourceLinks";
import { MinorityNote } from "@/components/MinorityNote";
import { formatDate } from "@/lib/format";
import { PartyEmblem } from "@/components/PartyEmblem";

export const dynamic = "force-dynamic";

export default async function PartiesPage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const factions = getCurrentFactionsWithSeats();
  const participation = getAllFactionAvgParticipation();
  const coalition = getCoalitionConfig();
  const coalitionSeats = factions.filter((f) => f.isCoalition).reduce((sum, f) => sum + f.seats, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("parties.title")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {factions.map((f) => (
          <Link
            key={f.id}
            href={`/parties/${f.id}`}
            className="rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition-shadow border-s-4"
            style={{ borderInlineStartColor: factionColor(f.id) }}
          >
            <div className="flex items-center gap-3">
              <PartyEmblem
                factionId={f.id}
                nameHe={f.nameHe}
                color={factionColor(f.id)}
                size={44}
                alt={factionName(f.id, f.nameHe, locale)}
              />
              <h2 className="text-lg font-semibold flex-1">
                {factionName(f.id, f.nameHe, locale)}
              </h2>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  f.isCoalition ? "bg-coalition text-on-coalition" : "bg-opposition text-on-opposition"
                }`}
              >
                {f.isCoalition ? t("common.coalition") : t("common.opposition")}
              </span>
            </div>
            {locale !== "he" && (
              <div className="text-sm text-muted mt-1" dir="rtl" lang="he">
                {factionName(f.id, f.nameHe, "he")}
              </div>
            )}
            {getPartyProfile(f.id)?.spectrum && (
              <div className="mt-2 inline-block rounded-full bg-black/5 px-2.5 py-0.5 text-xs text-black/70">
                {t(`spectrum.${getPartyProfile(f.id)!.spectrum}`)}
              </div>
            )}
            <div className="mt-3 flex items-end justify-between">
              <div className="text-accent font-bold text-xl">
                {t("common.mandates", { count: f.seats })}
              </div>
              {participation.has(f.id) && (
                <div className="text-end">
                  <div className="font-semibold">{participation.get(f.id)}%</div>
                  <div className="text-xs text-muted">
                    {t("party.avgParticipation")}
                  </div>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
      {coalition.sourceUrl && (
        <p className="text-xs text-muted">
          {t("parties.coalitionNote", { asOf: formatDate(coalition.caretakerSince ?? coalition.asOf, locale) })}{" "}
          <a
            className="underline hover:text-accent"
            href={coalition.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {coalition.sourceLabel ?? t("common.source")}
          </a>
          {coalition.asOf && <> · {t("common.lastChecked", { date: formatDate(coalition.asOf, locale) })}</>}
        </p>
      )}

      {/* The count's history — the dated, sourced answer to "wasn't it 68?" */}
      {coalition.timeline.length > 0 && (
        <section id="count" aria-labelledby="count-title" className="space-y-3 scroll-mt-24">
          <h2 id="count-title" className="text-xl font-semibold">{t("parties.timelineTitle")}</h2>
          <p className="text-sm text-muted">{t("parties.timelineIntro")}</p>
          <MinorityNote coalitionSeats={coalitionSeats} className="rounded-card border border-line bg-surface-sunken px-4 py-3" />
          <ol className="divide-y divide-line rounded-card border border-line bg-surface">
            {coalition.timeline.map((step) => (
              <li key={step.date} className="grid gap-x-4 gap-y-1 px-4 py-3 text-sm sm:grid-cols-[7rem_5rem_minmax(0,1fr)]">
                <time dateTime={step.date} className="tabular-nums text-muted">
                  {formatDate(step.date, locale)}
                </time>
                <span className="font-semibold tabular-nums">
                  {step.size}
                  {step.change !== 0 && (
                    <span className="ms-1 text-xs font-normal text-muted">({step.change > 0 ? "+" : "−"}{Math.abs(step.change)})</span>
                  )}
                </span>
                <span className="space-y-0.5">
                  <span className="block leading-relaxed" {...partyTextAttrs(step.note, locale)}>
                    {partyText(step.note, locale)}
                  </span>
                  <SourceLinks sources={step.sources} label={t("common.source")} />
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

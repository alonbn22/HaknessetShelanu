import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getCurrentFactionsWithSeats,
  getAllFactionAvgParticipation,
  factionName,
  factionColor,
} from "@/lib/queries";
import { getPartyProfile } from "@/lib/content";
import { PartyEmblem } from "@/components/PartyEmblem";

export const dynamic = "force-dynamic";

export default async function PartiesPage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const factions = getCurrentFactionsWithSeats();
  const participation = getAllFactionAvgParticipation();

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
                className={`rounded-full px-2 py-0.5 text-xs font-medium text-white ${
                  f.isCoalition ? "bg-coalition" : "bg-opposition"
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
    </div>
  );
}

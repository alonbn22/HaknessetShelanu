import { getTranslations, getLocale } from "next-intl/server";
import { MemberCard } from "@/components/MemberCard";
import { MemberFilters } from "./MemberFilters";
import {
  getCurrentMembers,
  getCurrentFactionsWithSeats,
  factionName,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; faction?: string; bloc?: string }>;
}) {
  const t = await getTranslations();
  const locale = await getLocale();
  const params = await searchParams;

  const factionId = params.faction ? parseInt(params.faction, 10) : undefined;
  const bloc =
    params.bloc === "coalition" || params.bloc === "opposition"
      ? params.bloc
      : undefined;

  const factions = getCurrentFactionsWithSeats();
  const members = getCurrentMembers({
    factionId: Number.isNaN(factionId) ? undefined : factionId,
    bloc,
    search: params.q,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("members.title")}</h1>

      <MemberFilters
        factions={factions.map((f) => ({
          id: f.id,
          name: factionName(f.id, f.nameHe, locale),
        }))}
      />

      <p className="text-sm text-muted">
        {t("members.count", { count: members.length })}
      </p>

      {members.length === 0 ? (
        <p className="text-black/60">{t("members.noResults")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <MemberCard key={m.id} member={m} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}

import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MemberAvatar } from "@/components/MemberCard";
import { KnessetDataSource } from "@/components/KnessetDataSource";
import { ComparePicker, type CompareOption } from "./ComparePicker";
import {
  getCurrentMembers,
  getMember,
  getMemberStats,
  getMemberSponsoredCount,
  getMemberCommittees,
  getMemberPositions,
  getVotingAgreement,
  getPartyDiscipline,
  personName,
  factionName,
  factionColor,
} from "@/lib/queries";
import { POSITION_FACTION_MEMBER } from "@/lib/constants";
import { isHebrew } from "@/lib/text";

export const dynamic = "force-dynamic";

function loadMember(id: number, locale: string) {
  const person = getMember(id);
  if (!person) return null;
  const positions = getMemberPositions(id);
  const faction =
    positions.find((p) => p.positionId === POSITION_FACTION_MEMBER && p.isCurrent) ??
    positions.find((p) => p.positionId === POSITION_FACTION_MEMBER);
  const name = personName(person, locale);
  return {
    id,
    person,
    name,
    nameRtl: isHebrew(name),
    factionId: faction?.factionId ?? null,
    factionLabel: faction?.factionId
      ? factionName(faction.factionId, faction.factionNameHe ?? "", locale)
      : "",
    stats: getMemberStats(id),
    discipline: getPartyDiscipline(id),
    bills: getMemberSponsoredCount(id),
    committees: getMemberCommittees(id).length,
  };
}

type MemberData = NonNullable<ReturnType<typeof loadMember>>;

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const t = await getTranslations();
  const locale = await getLocale();
  const params = await searchParams;

  const members = getCurrentMembers();
  const options: CompareOption[] = members.map((m) => ({
    id: m.id,
    name: personName(m, locale),
    faction: m.factionId != null ? factionName(m.factionId, m.factionNameHe ?? "", locale) : "",
  }));

  const parse = (s?: string) => {
    const n = s ? parseInt(s, 10) : NaN;
    return Number.isNaN(n) ? null : n;
  };
  const idA = parse(params.a);
  const idB = parse(params.b);
  const dataA = idA ? loadMember(idA, locale) : null;
  const dataB = idB ? loadMember(idB, locale) : null;
  const agreement = dataA && dataB ? getVotingAgreement(dataA.id, dataB.id) : null;

  const headerCard = (data: MemberData) => (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-white p-5 text-center shadow-sm">
      <MemberAvatar person={data.person} name={data.name} size={88} />
      <Link
        href={`/members/${data.id}`}
        className="text-lg font-bold leading-tight hover:underline"
        dir={data.nameRtl ? "rtl" : undefined}
        lang={data.nameRtl ? "he" : undefined}
      >
        {data.name}
      </Link>
      {data.factionLabel && data.factionId != null && (
        <Link
          href={`/parties/${data.factionId}`}
          className="inline-flex items-center gap-1.5 text-sm hover:underline"
        >
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: factionColor(data.factionId) }}
          />
          {data.factionLabel}
        </Link>
      )}
    </div>
  );

  const placeholder = (label: string) => (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-black/15 p-5 text-center text-sm text-muted">
      {label}
    </div>
  );

  const rows: { label: string; a: number; b: number; suffix?: string }[] =
    dataA && dataB
      ? [
          {
            label: t("member.participated"),
            a: dataA.stats?.participationPct ?? 0,
            b: dataB.stats?.participationPct ?? 0,
            suffix: "%",
          },
          { label: t("member.votesFor"), a: dataA.stats?.votedFor ?? 0, b: dataB.stats?.votedFor ?? 0 },
          {
            label: t("member.votesAgainst"),
            a: dataA.stats?.votedAgainst ?? 0,
            b: dataB.stats?.votedAgainst ?? 0,
          },
          { label: t("member.abstained"), a: dataA.stats?.abstained ?? 0, b: dataB.stats?.abstained ?? 0 },
          { label: t("member.missed"), a: dataA.stats?.missed ?? 0, b: dataB.stats?.missed ?? 0 },
          {
            label: t("member.partyLine"),
            a: dataA.discipline?.pct ?? 0,
            b: dataB.discipline?.pct ?? 0,
            suffix: "%",
          },
          { label: t("member.billsProposed"), a: dataA.bills, b: dataB.bills },
          { label: t("member.committees"), a: dataA.committees, b: dataB.committees },
        ]
      : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("compare.title")}</h1>
        <p className="text-sm text-muted">{t("compare.subtitle")}</p>
      </div>

      <ComparePicker members={options} a={idA} b={idB} />

      <div className="grid grid-cols-2 gap-4">
        {dataA ? headerCard(dataA) : placeholder(t("compare.selectMember"))}
        {dataB ? headerCard(dataB) : placeholder(t("compare.selectMember"))}
      </div>

      {dataA && dataB && agreement && (
        <>
          <section className="rounded-xl border border-accent/15 bg-accent/5 p-6 text-center">
            {agreement.bothVoted > 0 ? (
              <>
                <div className="text-5xl font-extrabold text-accent">{agreement.agreementPct}%</div>
                <div className="mt-1 font-semibold">{t("compare.agreementTitle")}</div>
                <p className="mt-1 text-sm text-muted">
                  {t("compare.agreementDetail", {
                    agreed: agreement.agreed,
                    total: agreement.bothVoted,
                  })}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted">{t("compare.notEnough")}</p>
            )}
          </section>

          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-black/5 px-4 py-2 text-xs font-semibold text-muted">
              <span
                className="truncate text-end"
                dir={dataA.nameRtl ? "rtl" : undefined}
                lang={dataA.nameRtl ? "he" : undefined}
              >
                {dataA.name}
              </span>
              <span />
              <span
                className="truncate text-start"
                dir={dataB.nameRtl ? "rtl" : undefined}
                lang={dataB.nameRtl ? "he" : undefined}
              >
                {dataB.name}
              </span>
            </div>
            <div className="divide-y divide-black/5">
              {rows.map((r) => (
                <div
                  key={r.label}
                  className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 text-sm"
                >
                  <span className="text-end font-bold tabular-nums">
                    {r.a.toLocaleString(locale)}
                    {r.suffix}
                  </span>
                  <span className="text-center text-xs text-muted">{r.label}</span>
                  <span className="text-start font-bold tabular-nums">
                    {r.b.toLocaleString(locale)}
                    {r.suffix}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted">{t("attendance.note")}</p>
          <KnessetDataSource data={["votes", "bills", "positions"]} />
        </>
      )}

      {!(dataA && dataB) && <p className="text-sm text-muted">{t("compare.prompt")}</p>}
    </div>
  );
}

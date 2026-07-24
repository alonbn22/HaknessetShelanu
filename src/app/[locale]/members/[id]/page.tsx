import { Fragment } from "react";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MemberAvatar } from "@/components/MemberCard";
import { VoteResultBadge } from "@/components/VoteResultBadge";
import { FeedbackActions } from "@/components/FeedbackActions";
import { RecordSection } from "./RecordSection";
import { MemberVoteStats } from "./MemberVoteStats";
import { MemberActivity } from "./MemberActivity";
import { formatDate } from "@/lib/format";
import { govDuty, govMinistry } from "@/lib/gov-terms";
import { getMemberRecord, memberRecordHeStrings, localizeMemberRecord } from "@/lib/content";
import { isCoalitionFaction } from "@/lib/content";
import {
  getMember,
  getMemberPositions,
  getMemberStats,
  getPartyDiscipline,
  getTopAgreements,
  getMemberRecentVotes,
  getMemberSponsoredBills,
  getMemberSponsoredCount,
  getMemberQuestionCount,
  getMemberRecentQuestions,
  getMemberQuestionStats,
  getMemberAgendaCount,
  getMemberRecentAgendas,
  getMemberRebellions,
  getMinistryNames,
  getMemberCommittees,
  getMemberBio,
  personName,
  factionName,
  isServingMember,
} from "@/lib/queries";
import { localizePage, committeeLabel } from "@/lib/i18n-data";
import { localizedAttrs, rtlAttrs, safeHttpUrl } from "@/lib/text";
import { POSITION_FACTION_MEMBER, MK_POSITION_IDS, LEADERSHIP_POSITION_IDS } from "@/lib/constants";

export const dynamic = "force-dynamic";

// getMember is cache()-wrapped, so metadata + page body share one lookup.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const personId = parseInt(id, 10);
  const member = Number.isNaN(personId) ? undefined : getMember(personId);
  if (!member) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  const name = personName(member, locale);
  const description = t("member", { name });
  return {
    title: name,
    description,
    openGraph: {
      title: name,
      description,
      ...(member.photoUrl ? { images: [member.photoUrl] } : {}),
    },
  };
}

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const personId = parseInt(id, 10);
  const member = Number.isNaN(personId) ? undefined : getMember(personId);
  if (!member) notFound();

  const t = await getTranslations();
  const locale = await getLocale();
  const positions = getMemberPositions(personId);
  const stats = getMemberStats(personId);
  const discipline = getPartyDiscipline(personId);
  // The receipts behind the discipline %: recent votes against the faction line.
  const rebellions = discipline ? getMemberRebellions(personId, 10) : [];
  const mostAligned = getTopAgreements(personId, "top", 5);
  const leastAligned = getTopAgreements(personId, "bottom", 5);
  const recentVotes = getMemberRecentVotes(personId, 10);
  const { loc: voteTitleOf } = localizePage(recentVotes.map((r) => r.vote.titleHe), locale);
  // Record claims: curated locale text wins, else the unified cache.
  const rawRecord = getMemberRecord(personId);
  const recordHe = locale === "he" ? [] : memberRecordHeStrings(rawRecord);
  const { cache: recMap } = localizePage(recordHe, locale);
  const record = localizeMemberRecord(rawRecord, locale, recMap);
  const sponsoredBills = getMemberSponsoredBills(personId, 12);
  const sponsoredCount = getMemberSponsoredCount(personId);
  const questionCount = getMemberQuestionCount(personId);
  const recentQuestions = getMemberRecentQuestions(personId, 6);
  const questionStats = getMemberQuestionStats(personId);
  // Which ministry each question went to (empty until gov_ministries syncs).
  const ministryNames = getMinistryNames(recentQuestions.map((q) => q.govMinistryId));
  const agendaCount = getMemberAgendaCount(personId);
  const recentAgendas = getMemberRecentAgendas(personId, 6);
  const committees = getMemberCommittees(personId);

  const factionRows = positions.filter((p) => p.positionId === POSITION_FACTION_MEMBER);
  const currentFaction = factionRows.find((p) => p.isCurrent);
  const roleRows = positions.filter(
    (p) => !MK_POSITION_IDS.includes(p.positionId) && p.positionId !== POSITION_FACTION_MEMBER,
  );
  const serving = isServingMember(positions);

  // Leadership roles (Speaker, opposition leader, committee/faction chair, deputy
  // Speaker) as at-a-glance header badges, most-prominent first, deduped by label.
  const leaderSeen = new Set<string>();
  const leadershipBadges = positions
    .filter((p) => p.isCurrent && LEADERSHIP_POSITION_IDS.includes(p.positionId))
    .sort(
      (a, b) =>
        LEADERSHIP_POSITION_IDS.indexOf(a.positionId) -
        LEADERSHIP_POSITION_IDS.indexOf(b.positionId),
    )
    .map((p) => govDuty(p.positionDescHe ?? "", locale))
    .filter((g) => {
      if (!g.text || leaderSeen.has(g.text)) return false;
      leaderSeen.add(g.text);
      return true;
    });

  const bio = getMemberBio(personId);
  // Roles section already shows career/positions, so bio keeps only background:
  // born, education, occupation, military.
  const bioParts = bio
    ? [
        bio.birthPlaceHe,
        ...(bio.educationHe?.split(" · ") ?? []),
        ...(bio.occupationsHe?.split(" · ") ?? []),
        ...(bio.militaryHe?.split(" · ") ?? []),
      ]
    : [];

  // Resolve the page's free-text Hebrew from the unified cache; misses translate
  // post-response (localizePage owns the after() queue).
  const dataHe = [
    ...bioParts,
    ...sponsoredBills.map((b) => b.nameHe),
    ...recentQuestions.map((q) => q.nameHe),
    ...recentAgendas.map((a) => a.nameHe),
    ...rebellions.map((r) => r.titleHe),
    ...committees.map((c) => c.committeeNameHe),
    ...roleRows.map((p) => p.committeeNameHe),
    ...factionRows.map((p) => p.factionNameHe),
  ];
  const { cache: dataMap, loc: localOf } = localizePage(dataHe, locale);
  // Localize a " · "-joined Hebrew list into per-item localized chunks.
  const localList = (joined: string | null) =>
    (joined ?? "")
      .split(" · ")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(localOf);

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-center gap-6 rounded-xl bg-white p-6 shadow-sm">
        <MemberAvatar person={member} size={112} alt={personName(member, locale)} />
        <div className="space-y-1 min-w-0">
          <h1 className="text-3xl font-bold" {...rtlAttrs(personName(member, locale))}>
            {personName(member, locale)}
          </h1>
          {locale !== "he" && (
            <div className="text-muted" dir="rtl" lang="he">
              {member.firstNameHe} {member.lastNameHe}
            </div>
          )}
          {currentFaction?.factionId != null && (
            <Link
              href={`/parties/${currentFaction.factionId}`}
              className="text-accent hover:underline block"
            >
              {factionName(currentFaction.factionId, currentFaction.factionNameHe ?? "", locale)}
              {" · "}
              {isCoalitionFaction(currentFaction.factionId)
                ? t("common.coalition")
                : t("common.opposition")}
            </Link>
          )}
          <div className="text-sm text-muted">
            {serving ? t("member.currentMk") : t("member.formerMk")}
          </div>
          {leadershipBadges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {leadershipBadges.map((g, i) => (
                <span
                  key={i}
                  className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent"
                  dir={g.rtl ? "rtl" : undefined}
                  lang={g.rtl ? "he" : undefined}
                >
                  {g.text}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-3 pt-1 text-sm">
            {member.mkSiteCode && (
              <a
                className="text-accent hover:underline"
                href={`https://m.knesset.gov.il/mk/Apps/mk/mk-individual/${member.mkSiteCode}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("member.knessetSite")}
              </a>
            )}
            {safeHttpUrl(member.wikipediaHe) && (
              <a
                className="text-accent hover:underline"
                href={safeHttpUrl(member.wikipediaHe)!}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("member.wikipedia")}
              </a>
            )}
            {member.email && (
              <a className="text-accent hover:underline" href={`mailto:${member.email}`}>
                {t("member.contact")}
              </a>
            )}
          </div>
          {member.photoAttribution && (
            <div className="text-xs text-muted pt-1">
              {t("common.photoBy", {
                attribution: `${member.photoAttribution}${member.photoLicense ? ` (${member.photoLicense})` : ""}`,
              })}
            </div>
          )}
        </div>
      </section>

      {bio && (bio.dateOfBirth || bio.educationHe || bio.occupationsHe || bio.militaryHe) && (
        <section className="rounded-xl bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">{t("member.bioTitle")}</h2>
          <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
            {(bio.dateOfBirth || bio.birthPlaceHe) && (
              <>
                <dt className="font-medium text-muted">{t("member.born")}</dt>
                <dd className="flex flex-wrap gap-x-2">
                  {bio.dateOfBirth && <span>{formatDate(bio.dateOfBirth, locale)}</span>}
                  {bio.birthPlaceHe &&
                    (() => {
                      const b = localOf(bio.birthPlaceHe);
                      return (
                        <span dir={b.rtl ? "rtl" : undefined} lang={b.rtl ? "he" : undefined}>
                          {bio.dateOfBirth ? "· " : ""}
                          {b.text}
                        </span>
                      );
                    })()}
                </dd>
              </>
            )}
            {[
              { label: t("member.education"), items: localList(bio.educationHe) },
              { label: t("member.occupation"), items: localList(bio.occupationsHe) },
              { label: t("member.military"), items: localList(bio.militaryHe) },
            ]
              .filter((row) => row.items.length > 0)
              .map((row) => (
                <Fragment key={row.label}>
                  <dt className="font-medium text-muted">{row.label}</dt>
                  <dd className="flex flex-wrap gap-x-1.5">
                    {row.items.map((it, i) => (
                      <span key={i} dir={it.rtl ? "rtl" : undefined} lang={it.rtl ? "he" : undefined}>
                        {i > 0 ? "· " : ""}
                        {it.text}
                      </span>
                    ))}
                  </dd>
                </Fragment>
              ))}
          </dl>

          {bio.wikidataId && (
            <p className="text-xs text-muted">
              <a
                className="text-accent hover:underline"
                href={`https://www.wikidata.org/wiki/${bio.wikidataId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("member.bioSource")}
              </a>
            </p>
          )}
        </section>
      )}

      {stats && stats.votesHeld > 0 && (
        <MemberVoteStats
          personId={personId}
          stats={stats}
          discipline={discipline}
          rebellions={rebellions}
          locale={locale}
          localOf={localOf}
        />
      )}

      {(mostAligned.length > 0 || leastAligned.length > 0) && (
        <section className="rounded-xl bg-white p-6 shadow-sm space-y-4">
          <div className="grid gap-6 sm:grid-cols-2">
            {(
              [
                { key: "member.mostAligned", rows: mostAligned },
                { key: "member.leastAligned", rows: leastAligned },
              ] as const
            ).map(
              ({ key, rows }) =>
                rows.length > 0 && (
                  <div key={key} className="space-y-2">
                    <h2 className="text-lg font-semibold">{t(key)}</h2>
                    <ul className="space-y-1">
                      {rows.map((a) => (
                        <li key={a.person.id}>
                          <Link
                            href={`/compare?a=${personId}&b=${a.person.id}`}
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-black/[.03]"
                          >
                            <MemberAvatar person={a.person} size={28} alt={personName(a.person, locale)} />
                            <span className="min-w-0 flex-1 truncate" {...rtlAttrs(personName(a.person, locale))}>
                              {personName(a.person, locale)}
                            </span>
                            <span className="font-bold tabular-nums text-accent">{a.pct}%</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ),
            )}
          </div>
          <p className="text-xs text-muted">{t("member.alignmentNote")}</p>
        </section>
      )}

      {record && record.claims.length > 0 && <RecordSection record={record} locale={locale} />}

      {sponsoredCount > 0 && (
        <section className="rounded-xl bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold">
            {t("member.billsProposed")}{" "}
            <span className="text-base font-normal text-muted">
              ({t("member.billsProposedCount", { count: sponsoredCount })})
            </span>
          </h2>
          <ul className="space-y-1.5">
            {sponsoredBills.map((b) => {
              const bt = localOf(b.nameHe);
              return (
                <li key={b.id} className="text-sm" {...localizedAttrs(bt)}>
                  <Link href={`/laws/${b.id}`} className="text-accent hover:underline">
                    {bt.text}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(questionCount > 0 || agendaCount > 0) && (
        <MemberActivity
          sponsoredCount={sponsoredCount}
          questionCount={questionCount}
          agendaCount={agendaCount}
          questionStats={questionStats}
          recentQuestions={recentQuestions}
          recentAgendas={recentAgendas}
          ministryNames={ministryNames}
          locale={locale}
          localOf={localOf}
        />
      )}

      {committees.length > 0 && (
        <section className="rounded-xl bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold">{t("member.committees")}</h2>
          <div className="flex flex-wrap gap-2">
            {committees.map((c) => {
              const g = committeeLabel(c.committeeNameHe, locale, dataMap);
              return (
                <Link
                  key={c.committeeId}
                  href={`/committees/${c.committeeId}`}
                  className="rounded-full bg-black/5 px-3 py-1 text-sm hover:bg-black/10"
                  {...localizedAttrs(g)}
                >
                  {g.text}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {roleRows.length > 0 && (
        <section className="rounded-xl bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold">{t("member.roles")}</h2>
          <ul className="space-y-2">
            {roleRows.map((p) => {
              const parts = [
                p.positionDescHe ? govDuty(p.positionDescHe, locale) : null,
                p.govMinistryNameHe ? govMinistry(p.govMinistryNameHe, locale) : null,
                p.committeeNameHe ? committeeLabel(p.committeeNameHe, locale, dataMap) : null,
              ].filter((x): x is NonNullable<typeof x> => x != null && x.text !== "");
              return (
                <li key={p.id} className="flex flex-wrap gap-x-2 text-sm">
                  <span className={p.isCurrent ? "font-medium" : "text-muted"}>
                    {parts.map((g, i) => (
                      <span key={i} dir={g.rtl ? "rtl" : undefined} lang={g.rtl ? "he" : undefined}>
                        {i > 0 ? " — " : ""}
                        {g.text}
                      </span>
                    ))}
                  </span>
                  <span className="text-muted">
                    {formatDate(p.startDate, locale)}
                    {" – "}
                    {p.finishDate ? formatDate(p.finishDate, locale) : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {factionRows.length > 0 && (
        <section className="rounded-xl bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold">{t("member.factionHistory")}</h2>
          <ul className="space-y-2">
            {factionRows.map((p) => {
              // Curated faction name first; else the unified cache, so non-he
              // users don't see raw Hebrew.
              const fhe = (p.factionNameHe ?? "").trim();
              const curated = p.factionId != null ? factionName(p.factionId, fhe, locale) : null;
              const fl =
                locale === "he"
                  ? { text: curated ?? fhe, rtl: true }
                  : curated && curated !== fhe
                    ? { text: curated, rtl: false }
                    : localOf(fhe);
              return (
                <li key={p.id} className="flex flex-wrap gap-x-2 text-sm">
                  <span className={p.isCurrent ? "font-medium" : "text-muted"} {...localizedAttrs(fl)}>
                    {fl.text}
                  </span>
                  <span className="text-muted">
                    {formatDate(p.startDate, locale)}
                    {" – "}
                    {p.finishDate ? formatDate(p.finishDate, locale) : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {recentVotes.length > 0 && (
        <section className="rounded-xl bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold">{t("member.recentVotes")}</h2>
          <ul className="divide-y divide-black/5">
            {recentVotes.map(({ vote, resultCode }) => {
              const vt = voteTitleOf(vote.titleHe);
              return (
                <li key={vote.id} className="py-2 flex items-center gap-3">
                  <span className="text-sm text-muted whitespace-nowrap">
                    {formatDate(vote.dateTime, locale)}
                  </span>
                  <Link
                    href={`/votes/${vote.id}`}
                    className="flex-1 min-w-0 truncate hover:underline text-sm"
                    dir={vt.translated ? undefined : "rtl"}
                    lang={vt.translated ? locale : "he"}
                  >
                    {vt.text}
                  </Link>
                  <VoteResultBadge code={resultCode} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="pt-2">
        <FeedbackActions context={personName(member, locale)} subject="member" />
      </div>
    </div>
  );
}

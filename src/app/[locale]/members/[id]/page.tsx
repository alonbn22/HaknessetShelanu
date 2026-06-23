import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MemberAvatar } from "@/components/MemberCard";
import { VoteResultBadge } from "@/components/VoteResultBadge";
import { ReportButton } from "@/components/ReportButton";
import { RecordSection } from "./RecordSection";
import { formatDate } from "@/lib/format";
import { govDuty, govMinistry } from "@/lib/gov-terms";
import { getMemberRecord } from "@/lib/content";
import { isCoalitionFaction } from "@/lib/content";
import {
  getMember,
  getMemberPositions,
  getMemberStats,
  getMemberRecentVotes,
  getMemberSponsoredBills,
  getMemberSponsoredCount,
  getMemberQuestionCount,
  getMemberRecentQuestions,
  getMemberAgendaCount,
  getMemberCommittees,
  personName,
  factionName,
  isCurrentMk,
} from "@/lib/queries";
import {
  localizeData,
  queueDataTranslations,
  committeeLabel,
  type Localized,
} from "@/lib/i18n-data";
import { POSITION_FACTION_MEMBER, MK_POSITION_IDS } from "@/lib/constants";
import { after } from "next/server";

export const dynamic = "force-dynamic";

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
  const recentVotes = getMemberRecentVotes(personId, 10);
  const voteTitles = localizeData(recentVotes.map((r) => r.vote.titleHe), locale);
  const voteTitleOf = (he: string | null) =>
    (he && voteTitles.get(he.trim())) || { text: he ?? "", translated: false };
  if (locale !== "he")
    after(() => queueDataTranslations(recentVotes.map((r) => r.vote.titleHe), locale));
  const rawRecord = getMemberRecord(personId);
  // Translate record claims on the fly: curated locale text wins, otherwise we
  // fall back to the unified translation cache so newly-added records (which may
  // only carry he/en) still localize to ar/ru without per-record hand-editing.
  let record = rawRecord;
  if (rawRecord && locale !== "he") {
    const heStrings = rawRecord.claims.flatMap((c) =>
      [c.title.he, c.description?.he].filter((s): s is string => Boolean(s)),
    );
    const recMap = localizeData(heStrings, locale);
    after(() => queueDataTranslations(heStrings, locale));
    const resolve = (txt: { he: string; en?: string; ar?: string; ru?: string }) =>
      (txt[locale as "en" | "ar" | "ru"] ?? recMap.get(txt.he.trim())?.text ?? txt.he);
    record = {
      ...rawRecord,
      claims: rawRecord.claims.map((c) => ({
        ...c,
        title: { ...c.title, [locale]: resolve(c.title) },
        description: c.description
          ? { ...c.description, [locale]: resolve(c.description) }
          : undefined,
      })),
    };
  }
  const sponsoredBills = getMemberSponsoredBills(personId, 12);
  const sponsoredCount = getMemberSponsoredCount(personId);
  const questionCount = getMemberQuestionCount(personId);
  const recentQuestions = getMemberRecentQuestions(personId, 6);
  const agendaCount = getMemberAgendaCount(personId);
  const committees = getMemberCommittees(personId);

  const factionRows = positions.filter(
    (p) => p.positionId === POSITION_FACTION_MEMBER,
  );
  const currentFaction = factionRows.find((p) => p.isCurrent);
  const roleRows = positions.filter(
    (p) =>
      !MK_POSITION_IDS.includes(p.positionId) &&
      p.positionId !== POSITION_FACTION_MEMBER,
  );
  const serving = isCurrentMk(positions);

  // Translate the page's free-text Hebrew (bill names, question subjects, and the
  // committee long-tail not covered by the curated gov-terms map) on the fly:
  // resolve from the unified cache now, translate misses post-response.
  const dataHe = [
    ...sponsoredBills.map((b) => b.nameHe),
    ...recentQuestions.map((q) => q.nameHe),
    ...committees.map((c) => c.committeeNameHe),
    ...roleRows.map((p) => p.committeeNameHe),
    ...factionRows.map((p) => p.factionNameHe),
  ];
  const dataMap = localizeData(dataHe, locale);
  if (locale !== "he") after(() => queueDataTranslations(dataHe, locale));
  const localOf = (he: string | null | undefined): Localized => {
    const key = (he ?? "").trim();
    if (!key) return { text: "", translated: false, rtl: false };
    return dataMap.get(key) ?? { text: key, translated: false, rtl: true };
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-center gap-6 rounded-xl bg-white p-6 shadow-sm">
        <MemberAvatar person={member} size={112} alt={personName(member, locale)} />
        <div className="space-y-1 min-w-0">
          <h1 className="text-3xl font-bold">{personName(member, locale)}</h1>
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
              {factionName(
                currentFaction.factionId,
                currentFaction.factionNameHe ?? "",
                locale,
              )}
              {" · "}
              {isCoalitionFaction(currentFaction.factionId)
                ? t("common.coalition")
                : t("common.opposition")}
            </Link>
          )}
          <div className="text-sm text-muted">
            {serving ? t("member.currentMk") : t("member.formerMk")}
          </div>
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
            {member.wikipediaHe && (
              <a
                className="text-accent hover:underline"
                href={member.wikipediaHe}
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

      {stats && stats.votesHeld > 0 && (
        <section className="rounded-xl bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">{t("member.voteStats")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-accent">
                {stats.participationPct}%
              </div>
              <div className="text-sm text-black/60">{t("member.participated")}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-700">{stats.votedFor}</div>
              <div className="text-sm text-black/60">{t("member.votesFor")}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-700">
                {stats.votedAgainst}
              </div>
              <div className="text-sm text-black/60">{t("member.votesAgainst")}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-700">
                {stats.abstained}
              </div>
              <div className="text-sm text-black/60">{t("member.abstained")}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-muted">{stats.missed}</div>
              <div className="text-sm text-black/60">{t("member.missed")}</div>
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
        </section>
      )}

      {record && record.claims.length > 0 && (
        <RecordSection record={record} locale={locale} />
      )}

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
              const url = b.finalLawUrl ?? b.explanatoryUrl;
              const bt = localOf(b.nameHe);
              return (
                <li
                  key={b.id}
                  className="text-sm"
                  dir={bt.rtl ? "rtl" : undefined}
                  lang={bt.rtl ? "he" : undefined}
                >
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      {bt.text}
                    </a>
                  ) : (
                    <span>{bt.text}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(questionCount > 0 || agendaCount > 0) && (
        <section className="rounded-xl bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">{t("member.activity")}</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-accent">{sponsoredCount}</div>
              <div className="text-sm text-black/60">{t("member.billsProposed")}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent">{questionCount}</div>
              <div className="text-sm text-black/60">{t("member.questions")}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent">{agendaCount}</div>
              <div className="text-sm text-black/60">{t("member.agendaMotions")}</div>
            </div>
          </div>
          {recentQuestions.length > 0 && (
            <ul className="divide-y divide-black/5 pt-2">
              {recentQuestions.map((q) => {
                const qt = localOf(q.nameHe);
                return (
                  <li
                    key={q.id}
                    className="py-2 text-sm"
                    dir={qt.rtl ? "rtl" : undefined}
                    lang={qt.rtl ? "he" : undefined}
                  >
                    {qt.text}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
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
                  dir={g.rtl ? "rtl" : undefined}
                  lang={g.rtl ? "he" : undefined}
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
                  <span className={p.isCurrent ? "font-medium" : "text-black/60"}>
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
              // Curated faction metadata first; fall back to the unified cache for
              // an uncurated or null-id faction so non-he users don't see raw Hebrew.
              const fhe = (p.factionNameHe ?? "").trim();
              const curated =
                p.factionId != null ? factionName(p.factionId, fhe, locale) : null;
              const fl =
                locale === "he"
                  ? { text: curated ?? fhe, rtl: true }
                  : curated && curated !== fhe
                    ? { text: curated, rtl: false }
                    : localOf(fhe);
              return (
              <li key={p.id} className="flex flex-wrap gap-x-2 text-sm">
                <span
                  className={p.isCurrent ? "font-medium" : "text-black/60"}
                  dir={fl.rtl ? "rtl" : undefined}
                  lang={fl.rtl ? "he" : undefined}
                >
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
        <ReportButton context={personName(member, locale)} />
      </div>
    </div>
  );
}

import { getTranslations, getLocale } from "next-intl/server";
import { Link, getPathname } from "@/i18n/navigation";
import { Plenum, type PlenumFaction, type PlenumSeat } from "@/components/Plenum";
import { GlobalSearch } from "@/components/GlobalSearch";
import { MemberAvatar } from "@/components/MemberCard";
import { KeyDatesTimeline } from "@/components/KeyDatesTimeline";
import { PollAverageTeaser } from "@/components/polls/PollAverageTeaser";
import { ElectionBanner } from "@/components/ElectionBanner";
import { MinorityNote } from "@/components/MinorityNote";
import { ReadingBadge } from "@/components/ReadingBadge";
import { Badge } from "@/components/ui/Badge";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TableFrame } from "@/components/ui/TableFrame";
import { SourceLinks } from "@/components/SourceLinks";
import {
  getDashboardStats,
  getVotingDays,
  getLatestVotes,
  getParticipationLeaderboard,
  getMostActiveLegislators,
  getUpcomingMeetings,
  getCurrentMembers,
  getSeatFacts,
  getLastSyncDate,
  personName,
  factionColor,
  factionName,
} from "@/lib/queries";
import { committeeLabel, localizePage } from "@/lib/i18n-data";
import { officeLabel } from "@/lib/gov-terms";
import { POSITION_PRIME_MINISTER } from "@/lib/constants";
import { getControversialLaws, getElectionOutlook, partyText, partyTextAttrs, partyTextClass } from "@/lib/content";
import { isHebrew, rtlAttrs, localizedAttrs, safeHttpUrl } from "@/lib/text";
import { rtlLocales } from "@/i18n/routing";
import { formatDate, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

// The home page is the Knesset hall, live: one seat per sitting member, the
// house split at the aisle, and beside it what is happening now. Below, the
// findings the record supports — who misses votes, who shows up, what the
// plenum decided last — as ruled rows with their sources, never cards.
export default async function HomePage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const { mks, factions, voteCount } = getDashboardStats();
  const year = new Date().getFullYear();
  const votingDays = getVotingDays(year);
  const controversialLaws = getControversialLaws();
  const electionOutlook = getElectionOutlook();
  const latestVotes = getLatestVotes(8);
  const { loc: latestTitleOf } = localizePage(latestVotes.map((v) => v.titleHe), locale);
  const leaders = getParticipationLeaderboard("top", 5);
  const laggards = getParticipationLeaderboard("bottom", 5);
  const activeLegislators = getMostActiveLegislators(5);
  // The hall shows members and factions; the findings below come from votes and
  // bills, which sync separately — each says the date of its own data.
  const lastSync = getLastSyncDate("members");
  const votesSync = getLastSyncDate("KNS_PlenumVote");

  const upcoming = getUpcomingMeetings(new Date().toISOString(), 7, 6);
  const upHe = upcoming.flatMap((m) => [m.committeeNameHe, m.typeDesc, m.location]);
  const { cache: upCache, loc: upLoc } = localizePage(upHe, locale);

  const plenumFactions: PlenumFaction[] = factions.map((f) => {
    const name = factionName(f.id, f.nameHe, locale);
    return { id: f.id, name, nameRtl: isHebrew(name), color: factionColor(f.id), seats: f.seats, isCoalition: f.isCoalition };
  });
  // One seat per sitting member. Norwegian-Law ministers who vacated their seat
  // are not in the hall, and neither are they here.
  const seatFacts = getSeatFacts();
  const seats: PlenumSeat[] = getCurrentMembers()
    .filter((m) => m.isSitting && m.factionId != null)
    .map((m) => {
      const name = personName(m, locale);
      const facts = seatFacts.get(m.id);
      // "Prime Minister", "Minister · Ministry of Finance", "Committee chair · Finance Committee".
      const isPm = (facts?.roles ?? []).some((r) => r.positionId === POSITION_PRIME_MINISTER);
      const roles = (facts?.roles ?? []).flatMap((r) => {
        const label = officeLabel(r, locale, { isPrimeMinister: isPm });
        if (!label) return [];
        const committee = r.committeeNameHe && !r.govMinistryNameHe ? committeeLabel(r.committeeNameHe, locale, upCache).text : "";
        return [committee && committee !== label.text ? `${label.text} · ${committee}` : label.text];
      });
      return {
        id: m.id,
        name,
        nameRtl: isHebrew(name),
        factionId: m.factionId!,
        href: getPathname({ locale, href: `/members/${m.id}` }),
        photoUrl: m.photoUrl,
        firstNameHe: m.firstNameHe,
        lastNameHe: m.lastNameHe,
        roles: [...new Set(roles)],
        participationPct: facts?.participationPct ?? null,
      };
    });

  // The two figures at the aisle, counted from the seats the hall shows.
  const coalitionIds = new Set(plenumFactions.filter((f) => f.isCoalition).map((f) => f.id));
  const coalitionSeats = seats.filter((s) => coalitionIds.has(s.factionId)).length;

  const arrow = rtlLocales.has(locale) ? "←" : "→";
  const asOf = lastSync ? formatDateTime(lastSync, locale) : null;
  const figuresSource = votesSync
    ? t("home.figuresSource", { date: formatDateTime(votesSync, locale) })
    : t("footer.dataSource");
  const rowLink = "flex items-center gap-3 py-2.5 hover:bg-surface-hover -mx-2 px-2 rounded-chip";

  return (
    <div className="space-y-10">
      {/* ---------- The election, first ---------- */}
      <ElectionBanner />

      {/* ---------- The house ---------- */}
      <section aria-labelledby="house" className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-14">
        <div className="space-y-6">
          <div>
            <h1 id="house" className="font-display text-4xl font-bold sm:text-5xl">
              {t("common.knessetNum", { num: 25 })}
            </h1>
            <p className="mt-2 text-muted">
              <Link href="/members" className="text-accent-ink underline">
                {mks.toLocaleString(locale)} {t("home.totalMks").toLowerCase()}
              </Link>
              {" · "}
              <Link href="/parties" className="text-accent-ink underline">
                {factions.length} {t("home.totalFactions").toLowerCase()}
              </Link>
              {" · "}
              <Link href="/votes" className="text-accent-ink underline">
                {voteCount.toLocaleString(locale)} {t("home.totalVotes").toLowerCase()}
              </Link>
            </p>
          </div>

          {/* The arc from sm up; the same seats as two blocks across the aisle on phones. */}
          <Plenum seats={seats} factions={plenumFactions} asOf={asOf} />
          {/* Under 61: a minority government, said in plain words with the law as the source.
              Then how the aisle is counted — the line that answers "wasn't it 61?". */}
          <div className="space-y-2">
            <MinorityNote coalitionSeats={coalitionSeats} />
            <p className="text-xs text-muted">
              {t("home.countNote")}{" "}
              <Link href="/parties#count" className="underline hover:text-accent">
                {t("home.countNoteLink")} {arrow}
              </Link>
            </p>
          </div>

          {/* The dais: search sits at the base of the hall. */}
          <div className="mx-auto max-w-xl">
            <GlobalSearch />
          </div>
        </div>

        {/* ---------- Now ---------- */}
        <section className="space-y-8 border-t border-line pt-8 lg:border-s lg:border-t-0 lg:ps-10 lg:pt-0" aria-label={t("home.thisWeekTitle")}>
          {electionOutlook && (
            <div className="space-y-3">
              <SectionHeading variant="md">{t("election.keyDates")}</SectionHeading>
              {electionOutlook.keyDates && electionOutlook.keyDates.length > 0 && (
                <KeyDatesTimeline dates={electionOutlook.keyDates} variant="compact" />
              )}
              <Link href="/elections#upcoming" className="inline-block text-sm text-accent-ink underline">
                {t("election.homeCta")} {arrow}
              </Link>
            </div>
          )}

          {/* The poll of polls — the average with its count and method, never a lone poll. */}
          <PollAverageTeaser />

          <div className="space-y-2">
            <SectionHeading
              variant="md"
              aside={
                <Link href="/committees" className="text-sm text-accent-ink underline">
                  {t("common.viewAll")}
                </Link>
              }
            >
              {t("home.thisWeekTitle")}
            </SectionHeading>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted">{t("home.thisWeekEmpty")}</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {upcoming.map((m) => {
                  const cname = committeeLabel(m.committeeNameHe, locale, upCache);
                  const type = upLoc(m.typeDesc);
                  const broadcast = safeHttpUrl(m.broadcastUrl);
                  return (
                    <li key={m.id} className="py-2">
                      <div className="text-xs tabular-nums text-muted">{formatDateTime(m.startDate!, locale)}</div>
                      <Link
                        href={`/committees/${m.committeeId}`}
                        className="block truncate font-medium hover:underline"
                        dir={cname.rtl ? "rtl" : undefined}
                        lang={cname.rtl ? "he" : undefined}
                      >
                        {cname.text}
                      </Link>
                      {(type.text || broadcast) && (
                        <div className="flex flex-wrap gap-x-3 text-xs text-muted">
                          {type.text && <span {...localizedAttrs(type)}>{type.text}</span>}
                          {broadcast && (
                            <a href={broadcast} target="_blank" rel="noopener noreferrer" className="text-accent-ink underline">
                              {t("committees.broadcast")}
                            </a>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {lastSync && votesSync && (
            <p className="text-xs text-muted">
              {t("footer.lastSync", { members: formatDate(lastSync, locale), votes: formatDate(votesSync, locale) })}
            </p>
          )}
        </section>
      </section>

      {/* ---------- Findings ---------- */}
      {leaders.length > 0 && (
        <section className="grid gap-10 md:grid-cols-2">
          {[
            { title: t("home.participationLaggards"), data: laggards },
            { title: t("home.participationLeaders"), data: leaders },
          ].map((block) => (
            <div key={block.title}>
              <SectionHeading
                aside={
                  <Link href="/attendance" className="text-sm text-accent-ink underline">
                    {t("common.viewAll")}
                  </Link>
                }
              >
                {block.title}
              </SectionHeading>
              <ol className="mt-3 divide-y divide-line">
                {block.data.map((e) => (
                  <li key={e.personId}>
                    <Link href={`/members/${e.personId}`} className={rowLink}>
                      <MemberAvatar person={e.person} name={personName(e.person, locale)} size={36} />
                      <span className="min-w-0 flex-1 truncate" {...rtlAttrs(personName(e.person, locale))}>
                        {personName(e.person, locale)}
                      </span>
                      <span className="font-display text-xl font-bold tabular-nums">{e.participationPct}%</span>
                    </Link>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-xs text-muted">{figuresSource}</p>
            </div>
          ))}
          {/* How participation is counted — and that not voting isn't absence. */}
          <p className="text-xs text-muted md:col-span-2">{t("attendance.note")}</p>
        </section>
      )}

      {voteCount > 0 && (
        <section className="space-y-3">
          <SectionHeading
            aside={
              <Link href="/votes" className="text-sm text-accent-ink underline">
                {t("common.viewAll")}
              </Link>
            }
          >
            {t("home.latestVotes")}
          </SectionHeading>
          {votingDays.term > 0 && (
            <p className="text-sm text-muted">
              {t("home.votingDays", { term: votingDays.term, inYear: votingDays.inYear, year: String(year) })}
            </p>
          )}
          <ul className="divide-y divide-line sm:hidden">
            {latestVotes.map((v) => {
              const title = latestTitleOf(v.titleHe);
              return (
                <li key={v.id} className="py-3">
                  <Link
                    href={`/votes/${v.id}`}
                    className="block font-medium hover:underline"
                    {...localizedAttrs(title)}
                  >
                    {title.text}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="tabular-nums text-muted">{formatDate(v.dateTime, locale)}</span>
                    <ReadingBadge forDesc={v.forDesc} titleHe={v.titleHe} />
                    {v.isAccepted != null && (
                      <Badge tone={v.isAccepted ? "pass" : "fail"}>{v.isAccepted ? t("votes.accepted") : t("votes.rejected")}</Badge>
                    )}
                    <span className="tabular-nums">
                      <span className="text-pass-ink">{v.totalFor}</span>
                      {" · "}
                      <span className="text-fail-ink">{v.totalAgainst}</span>
                      {" · "}
                      <span className="text-muted">{v.totalAbstain}</span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          <TableFrame className="hidden sm:block">
            <table className="w-full text-sm">
              <caption className="px-3 py-2 text-start text-xs text-muted">{figuresSource}</caption>
              <thead className="bg-surface-sunken text-xs text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 text-start font-medium">{t("votes.date")}</th>
                  <th scope="col" className="px-3 py-2 text-start font-medium">{t("votes.title")}</th>
                  <th scope="col" className="px-3 py-2 text-start font-medium">{t("votes.result")}</th>
                  <th scope="col" className="px-3 py-2 text-end font-medium tabular-nums">{t("member.votesFor")}</th>
                  <th scope="col" className="px-3 py-2 text-end font-medium tabular-nums">{t("member.votesAgainst")}</th>
                  <th scope="col" className="hidden px-3 py-2 text-end font-medium tabular-nums sm:table-cell">{t("member.abstained")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {latestVotes.map((v) => {
                  const title = latestTitleOf(v.titleHe);
                  return (
                    <tr key={v.id} className="hover:bg-surface-hover">
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted">{formatDate(v.dateTime, locale)}</td>
                      <td className="px-3 py-2">
                        {/* block: the title is the cell's own line, not a link
                            inside running text (WCAG 1.4.1 link-in-text-block). */}
                        <Link
                          href={`/votes/${v.id}`}
                          className="block font-medium hover:underline"
                          {...localizedAttrs(title)}
                        >
                          {title.text}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <ReadingBadge forDesc={v.forDesc} titleHe={v.titleHe} />
                          {title.translated && <span className="text-micro text-muted">{t("votes.autoTranslated")}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {v.isAccepted != null && (
                          <Badge tone={v.isAccepted ? "pass" : "fail"}>{v.isAccepted ? t("votes.accepted") : t("votes.rejected")}</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-end tabular-nums text-pass-ink">{v.totalFor}</td>
                      <td className="px-3 py-2 text-end tabular-nums text-fail-ink">{v.totalAgainst}</td>
                      <td className="hidden px-3 py-2 text-end tabular-nums text-muted sm:table-cell">{v.totalAbstain}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableFrame>
          <p className="text-xs text-muted sm:hidden">{figuresSource}</p>
        </section>
      )}

      <section className="grid gap-10 md:grid-cols-2">
        {activeLegislators.length > 0 && (
          <div>
            <SectionHeading
              aside={
                <Link href="/legislators" className="text-sm text-accent-ink underline">
                  {t("common.viewAll")}
                </Link>
              }
            >
              {t("legislators.title")}
            </SectionHeading>
            <ol className="mt-3 divide-y divide-line">
              {activeLegislators.map((e) => (
                <li key={e.person.id}>
                  <Link href={`/members/${e.person.id}`} className={rowLink}>
                    <MemberAvatar person={e.person} name={personName(e.person, locale)} size={36} />
                    <span className="min-w-0 flex-1 truncate" {...rtlAttrs(personName(e.person, locale))}>
                      {personName(e.person, locale)}
                    </span>
                    <span className="whitespace-nowrap text-sm">
                      <span className="font-display text-xl font-bold tabular-nums">{e.billCount}</span>{" "}
                      <span className="text-muted">{t("legislators.bills")}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-muted">{figuresSource}</p>
          </div>
        )}

        {controversialLaws.length > 0 && (
          <div>
            <SectionHeading>{t("home.controversialTitle")}</SectionHeading>
            <p className="mt-1 text-sm text-muted">{t("home.controversialSubtitle")}</p>
            <ul className="mt-3 divide-y divide-line">
              {controversialLaws.map((law, i) => (
                <li key={i} className="grid gap-x-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-semibold" {...partyTextAttrs(law.title, locale)}>{partyText(law.title, locale)}</span>
                      <span className="text-xs tabular-nums text-muted">{law.year}</span>
                    </div>
                    <p className={`mt-1 text-sm leading-relaxed text-muted ${partyTextClass(law.summary, locale)}`} {...partyTextAttrs(law.summary, locale)}>{partyText(law.summary, locale)}</p>
                    {/* The sources sit right under the claim they support. */}
                    <p className="mt-1">
                      <SourceLinks label={t("common.source")} sources={law.sources} />
                    </p>
                  </div>
                  {/* The roll-call sits in the margin, where the law is inside the record. */}
                  <span className="flex flex-col items-end gap-1 self-start text-xs">
                    {law.votes.map((v) => (
                      <Link key={v.id} href={`/votes/${v.id}`} className="whitespace-nowrap text-accent-ink underline">
                        {t("home.lawVote")}
                      </Link>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

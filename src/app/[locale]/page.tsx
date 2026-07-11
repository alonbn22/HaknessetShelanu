import { after } from "next/server";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Hemicycle, type HemiFaction } from "@/components/Hemicycle";
import { SeatsBar } from "@/components/SeatsBar";
import { SeatsToggle } from "@/components/SeatsToggle";
import { VoteCard } from "@/components/VoteCard";
import { HomeVoteSearch } from "@/components/HomeVoteSearch";
import { HeroSearch } from "@/components/HeroSearch";
import { MemberAvatar } from "@/components/MemberCard";
import {
  getDashboardStats,
  getLatestVotes,
  getParticipationLeaderboard,
  getMostActiveLegislators,
  getUpcomingMeetings,
  personName,
  factionColor,
  factionName,
} from "@/lib/queries";
import { localizeData, queueDataTranslations, committeeLabel, resolveLocalized } from "@/lib/i18n-data";
import { getControversialLaws, partyText } from "@/lib/content";
import { isHebrew, rtlAttrs, localizedAttrs } from "@/lib/text";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const { mks, ministers, factions, voteCount } = getDashboardStats();
  const controversialLaws = getControversialLaws();
  const latestVotes = getLatestVotes(6);
  const latestTitles = localizeData(latestVotes.map((v) => v.titleHe), locale);
  const latestTitleOf = (he: string | null) =>
    (he && latestTitles.get(he.trim())) || { text: he ?? "", translated: false };
  if (locale !== "he")
    after(() => queueDataTranslations(latestVotes.map((v) => v.titleHe), locale));
  const leaders = getParticipationLeaderboard("top", 5);
  const laggards = getParticipationLeaderboard("bottom", 5);
  const activeLegislators = getMostActiveLegislators(5);

  // "This week in the Knesset": committee sittings scheduled over the next 7 days.
  const upcoming = getUpcomingMeetings(new Date().toISOString(), 7, 12);
  const upHe = upcoming.flatMap((m) => [m.committeeNameHe, m.typeDesc, m.location]);
  const upCache = localizeData(upHe, locale);
  const upLoc = (he: string | null) => resolveLocalized(upCache, he);
  if (locale !== "he") after(() => queueDataTranslations(upHe, locale));

  const coalitionSeats = factions
    .filter((f) => f.isCoalition)
    .reduce((s, f) => s + f.seats, 0);
  const oppositionSeats = factions
    .filter((f) => !f.isCoalition)
    .reduce((s, f) => s + f.seats, 0);

  // Pre-resolve color + localized name server-side (the resolvers read content
  // YAML that isn't available in the client Hemicycle).
  const hemiFactions: HemiFaction[] = factions.map((f) => {
    const name = factionName(f.id, f.nameHe, locale);
    return {
      id: f.id,
      name,
      nameRtl: isHebrew(name),
      color: factionColor(f.id),
      seats: f.seats,
      isCoalition: f.isCoalition,
    };
  });

  const heroStats = [
    { value: mks, label: t("home.totalMks"), href: "/members" as const },
    { value: ministers, label: t("home.totalMinisters"), href: "/ministers" as const },
    { value: factions.length, label: t("home.totalFactions"), href: "/parties" as const },
    { value: voteCount, label: t("home.totalVotes"), href: "/votes" as const },
  ];
  const heroChips = [
    { href: "/votes", label: t("nav.votes") },
    { href: "/members", label: t("nav.members") },
    { href: "/parties", label: t("nav.parties") },
    { href: "/laws", label: t("nav.laws") },
  ] as const;

  return (
    <div className="space-y-10">
      {/* Full-bleed institutional hero (breaks out of the page container) */}
      <section
        className="relative -mt-8 overflow-hidden"
        style={{ height: "520px", marginInline: "calc(50% - 50vw)" }}
      >
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{ backgroundImage: "url(/assets/knesset-holyland.jpg)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(6,20,48,.72) 0%, rgba(7,26,66,.40) 42%, rgba(9,38,96,.22) 100%)",
          }}
        />
        <div
          className="absolute bottom-2 px-3 text-[10px] text-white/45"
          style={{ insetInlineEnd: "12px" }}
        >
          {t("common.photoBy", { attribution: "Wikimedia Commons · CC BY-SA 4.0" })}
        </div>
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto max-w-6xl w-full px-4 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/35 text-white/90 text-xs font-semibold px-3 py-1.5 mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              {t("home.heroBadge")}
            </span>
            <h1
              className="text-white font-extrabold leading-[1.05]"
              style={{ fontSize: "clamp(40px, 8vw, 66px)", textShadow: "0 2px 18px rgba(0,0,0,.5)" }}
            >
              {t("home.title")}
            </h1>
            <p
              className="text-white/90 text-xl leading-relaxed mt-3 mb-6 mx-auto"
              style={{ maxWidth: "620px", textShadow: "0 1px 12px rgba(0,0,0,.55)" }}
            >
              {t("home.subtitle")}
            </p>
            <HeroSearch />
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {heroChips.map((chip) => (
                <Link
                  key={chip.href}
                  href={chip.href}
                  className="rounded-full border border-white/30 text-white/85 hover:bg-white/10 text-[13px] font-medium px-3.5 py-1.5 transition-colors"
                >
                  {chip.label}
                </Link>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-7 mx-auto" style={{ maxWidth: "760px" }}>
              {heroStats.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  className="rounded-xl px-5 py-4 text-center hover:bg-white/20 transition-colors"
                  style={{
                    background: "rgba(255,255,255,.12)",
                    border: "1px solid rgba(255,255,255,.22)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <div className="text-3xl font-extrabold text-white leading-none tabular-nums">
                    {s.value.toLocaleString(locale)}
                  </div>
                  <div className="text-[13px] text-white/75 mt-1.5">{s.label}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-xl font-semibold">{t("home.seatsByParty")}</h2>
        <SeatsToggle
          bar={
            <div className="space-y-4">
              <SeatsBar factions={factions} locale={locale} />
              <div className="flex justify-between text-sm font-medium pt-2 border-t border-black/5">
                <span className="text-coalition">
                  {t("common.coalition")}: {coalitionSeats}
                </span>
                <span className="text-opposition">
                  {t("common.opposition")}: {oppositionSeats}
                </span>
              </div>
            </div>
          }
          dome={<Hemicycle factions={hemiFactions} />}
        />
      </section>

      {upcoming.length > 0 && (
        <section className="rounded-xl bg-white p-6 shadow-sm space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold">{t("home.thisWeekTitle")}</h2>
            <Link href="/committees" className="text-sm text-accent hover:underline">
              {t("common.viewAll")}
            </Link>
          </div>
          <p className="text-sm text-muted">{t("home.thisWeekSubtitle")}</p>
          <ul className="divide-y divide-black/5">
            {upcoming.map((m) => {
              const cname = committeeLabel(m.committeeNameHe, locale, upCache);
              const type = upLoc(m.typeDesc);
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                  <span className="whitespace-nowrap font-medium tabular-nums">
                    {formatDateTime(m.startDate!, locale)}
                  </span>
                  <Link
                    href={`/committees/${m.committeeId}`}
                    className="min-w-0 flex-1 truncate font-medium text-accent hover:underline"
                    dir={cname.rtl ? "rtl" : undefined}
                    lang={cname.rtl ? "he" : undefined}
                  >
                    {cname.text}
                  </Link>
                  {type.text && (
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-muted" {...localizedAttrs(type)}>
                      {type.text}
                    </span>
                  )}
                  {m.broadcastUrl && (
                    <a
                      href={m.broadcastUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="whitespace-nowrap text-accent hover:underline"
                    >
                      {t("committees.broadcast")}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {controversialLaws.length > 0 && (
        <section className="rounded-xl bg-white p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-xl font-semibold">{t("home.controversialTitle")}</h2>
            <p className="text-sm text-muted">{t("home.controversialSubtitle")}</p>
          </div>
          <ul className="space-y-3">
            {controversialLaws.map((law, i) => (
              <li key={i} className="border-s-2 border-amber-400 ps-3">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold">{partyText(law.title, locale)}</span>
                  <span className="text-xs text-muted">{law.year}</span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/80">
                  {partyText(law.summary, locale)}
                </p>
                <a
                  href={law.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline"
                >
                  {t("common.source")}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {voteCount > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{t("home.latestVotes")}</h2>
            <div className="flex items-center gap-4">
              <HomeVoteSearch />
              <Link href="/votes" className="text-sm text-accent hover:underline whitespace-nowrap">
                {t("common.viewAll")}
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {latestVotes.map((v) => (
              <VoteCard key={v.id} vote={v} title={latestTitleOf(v.titleHe)} />
            ))}
          </div>
        </section>
      )}

      {leaders.length > 0 && (
        <section className="grid gap-6 md:grid-cols-2">
          {[
            { title: t("home.participationLeaders"), data: leaders },
            { title: t("home.participationLaggards"), data: laggards },
          ].map((block) => (
            <div key={block.title} className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">{block.title}</h2>
              <ol className="space-y-3">
                {block.data.map((e) => (
                  <li key={e.personId}>
                    <Link
                      href={`/members/${e.personId}`}
                      className="flex items-center gap-3 hover:bg-black/2 rounded-lg"
                    >
                      <MemberAvatar person={e.person} size={40} />
                      <span className="flex-1 truncate" {...rtlAttrs(personName(e.person, locale))}>
                        {personName(e.person, locale)}
                      </span>
                      <span className="font-semibold text-accent">
                        {e.participationPct}%
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      )}

      {activeLegislators.length > 0 && (
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-semibold">{t("legislators.title")}</h2>
            <Link href="/legislators" className="text-sm text-accent hover:underline">
              {t("common.viewAll")}
            </Link>
          </div>
          <ol className="space-y-3">
            {activeLegislators.map((e) => (
              <li key={e.person.id}>
                <Link
                  href={`/members/${e.person.id}`}
                  className="flex items-center gap-3 hover:bg-black/2 rounded-lg"
                >
                  <MemberAvatar person={e.person} size={40} />
                  <span className="flex-1 truncate" {...rtlAttrs(personName(e.person, locale))}>
                    {personName(e.person, locale)}
                  </span>
                  <span className="font-semibold text-accent">
                    {e.billCount} {t("legislators.bills")}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

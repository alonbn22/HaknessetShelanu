import { ListLogo } from "@/components/election/ListLogo";
import { ListSections } from "@/components/election/ListSections";
import { ListMakeup } from "@/components/election/ListMakeup";
import { localizePage, localizeData } from "@/lib/i18n-data";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MemberCard } from "@/components/MemberCard";
import { SpectrumBar } from "@/components/SpectrumBar";
import { FeedbackActions } from "@/components/FeedbackActions";
import { PartyEmblem } from "@/components/PartyEmblem";
import {
  isCoalitionFaction,
  getPartyProfile,
  getElectionOutlook,
  partyText,
  partyTextAttrs,
  partyList,
  candidateName,
  getRunningLists,
  listHref,
} from "@/lib/content";
import { FactionStatusNote } from "@/components/FactionStatusNote";
import { SourceLinks } from "@/components/SourceLinks";
import { KnessetDataSource } from "@/components/KnessetDataSource";
import { formatDate } from "@/lib/format";
import {
  getFaction,
  getCurrentMembers,
  getFactionAvgParticipation,
  getFactionChair,
  factionName,
  factionColor,
  personName,
} from "@/lib/queries";
import { rtlAttrs, localizedAttrs } from "@/lib/text";

export const dynamic = "force-dynamic";

// getFaction is cache()-wrapped, so metadata + page body share one lookup.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const factionId = parseInt(id, 10);
  const faction = Number.isNaN(factionId) ? undefined : getFaction(factionId);
  if (!faction) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  const name = factionName(faction.id, faction.nameHe, locale);
  const description = t("party", { name });
  return { title: name, description, openGraph: { title: name, description } };
}

export default async function PartyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const factionId = parseInt(id, 10);
  const faction = Number.isNaN(factionId) ? undefined : getFaction(factionId);
  if (!faction) notFound();

  const t = await getTranslations();
  const locale = await getLocale();
  const members = getCurrentMembers({ factionId });
  const avgParticipation = getFactionAvgParticipation(factionId);
  const isCoalition = isCoalitionFaction(factionId);
  const profile = getPartyProfile(factionId);
  const positions = partyList(profile?.positions, locale);
  // Link the leader to their member page, but only when the election outlook holds
  // a *verified* leaderPersonId for this faction whose Hebrew name matches the
  // profile's — so a leadership change never points us at the wrong person.
  const outlook = getElectionOutlook();
  const electionParty = outlook?.parties.find((p) => p.factionId === factionId);
  // How the faction goes into the 2026 election (content/party-profiles.yaml),
  // resolved against the registry card or the full submitted-lists table so
  // the list name, letters and head come from the CEC page, never retyped.
  const e2026 = profile?.election2026 ?? null;
  // The list that continues this faction in 2026: its election sections and
  // official logo live on this page (one page per party).
  const ownList = [...getRunningLists().values()].find((l) => l.factionId === factionId);
  // The page's logo: its own 2026 list's, else the faction's own (its profile).
  const logo = ownList?.logo ?? profile?.logo;
  const logoName = ownList?.logo ? partyText(ownList.name, locale) : factionName(factionId, faction.nameHe, locale);
  const e2026Party = e2026?.slug ? outlook?.parties.find((p) => p.slug === e2026.slug) : undefined;
  const e2026Row =
    e2026?.listNumber != null
      ? outlook?.submittedLists?.lists.find((l) => l.listNumber === e2026.listNumber)
      : e2026?.slug
        ? outlook?.submittedLists?.lists.find((l) => l.slug === e2026.slug)
        : undefined;
  const cec = e2026Party?.cec ?? null;
  const letters2026 = cec?.letters ?? e2026Row?.letters ?? null;
  const lettersFinal = cec?.lettersStatus === "approved";
  const listUrl2026 = cec?.url ?? e2026Row?.url ?? null;
  const submittedBy2026 = cec?.submittedBy ?? e2026Row?.submittedBy ?? [];
  // The CEC's list and party names are data text (the unified cache); the head
  // of the list is a person: an official spelling or the Hebrew record.
  const { loc } = localizePage([cec?.listName.he ?? e2026Row?.name.he, ...submittedBy2026], locale);
  const listName2026 = loc(cec?.listName.he ?? e2026Row?.name.he);
  const firstCandidate = e2026Row?.candidates?.[0];
  const headNames = localizeData([firstCandidate?.he], locale); // the site's transliteration, never queued
  const headShown = firstCandidate ? candidateName(firstCandidate, locale, headNames) : undefined;
  const listHead2026 = headShown && headShown !== firstCandidate!.he ? headShown : e2026Row?.head?.he ?? "";
  const approvalDate = outlook?.keyDates?.find((d) => d.key === "kd-approval")?.date;
  const approvalText = approvalDate ? formatDate(approvalDate, locale) : "";
  const e2026List = e2026?.slug ? getRunningLists().get(e2026.slug) : undefined;
  // Its own list: the card on the elections page; a partner list: that list's page.
  const listAnchor = !e2026List
    ? "/elections#all-lists"
    : e2026List.slug === ownList?.slug
      ? `/elections#list-${e2026List.slug}`
      : listHref(e2026List);
  const updates = [...(profile?.updates ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  const leaderMatches =
    electionParty?.leader?.he?.trim() === profile?.leaderHe?.trim();
  const leaderPersonId =
    leaderMatches && electionParty?.leaderPersonId != null
      ? electionParty.leaderPersonId
      : null;
  // Wikipedia fallback for leaders who aren't 25th-Knesset members (no member page).
  const leaderWiki =
    leaderPersonId == null && leaderMatches ? electionParty?.leaderWiki ?? null : null;
  // The faction's chair in the Knesset (position 48) — distinct from the party
  // leader (e.g. Netanyahu leads Likud; Ofir Katz chairs its Knesset faction).
  // Skipped when they're the same person (e.g. Noam) to avoid a duplicate stat.
  const chairRow = getFactionChair(factionId);
  const factionChair =
    chairRow &&
    `${chairRow.firstNameHe} ${chairRow.lastNameHe}`.trim() !== profile?.leaderHe?.trim()
      ? chairRow
      : null;

  return (
    <div className="space-y-6">
      <section
        className="rounded-xl bg-white p-6 shadow-sm border-s-4 space-y-2"
        style={{ borderInlineStartColor: factionColor(factionId) }}
      >
        <div className="flex flex-wrap items-center gap-4">
          {logo ? (
            <ListLogo logo={logo} alt={t("election.logoAlt", { name: logoName })} height={64} maxWidth={220} />
          ) : (
            <PartyEmblem
              factionId={factionId}
              nameHe={faction.nameHe}
              color={factionColor(factionId)}
              size={72}
              alt={factionName(factionId, faction.nameHe, locale)}
            />
          )}
          <h1 className="text-3xl font-bold">
            {factionName(factionId, faction.nameHe, locale)}
          </h1>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              isCoalition ? "bg-coalition text-on-coalition" : "bg-opposition text-on-opposition"
            }`}
          >
            {isCoalition ? t("common.coalition") : t("common.opposition")}
          </span>
        </div>
        {locale !== "he" && (
          <div className="text-muted">
            {t("votes.originalHebrew")}:{" "}
            <span dir="rtl" lang="he">{faction.nameHe}</span>
          </div>
        )}
        {/* The faction's own logo is credited here; a 2026 list's logo is
            credited with the list, below. */}
        {!ownList?.logo && logo && (
          <p className="text-xs text-muted">
            <SourceLinks sources={[logo.source]} label={t("election.logoCredit")} />
          </p>
        )}
        <FactionStatusNote factionId={factionId} />
        {/* 2026: how the faction runs, with the CEC's list page as the source.
            Letters are the requested ones until the committee approves them. */}
        {e2026 && (
          <div className="mt-2 rounded-lg border border-line bg-surface p-3 text-sm space-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold">{t("party.election2026")}</span>
              <span className="text-muted">
                {t(
                  e2026.runsAs === "own"
                    ? "party.runsOwn"
                    : e2026.runsAs === "within"
                      ? "party.runsWithin"
                      : e2026.runsAs === "merged"
                        ? "party.runsMerged"
                        : "party.runsNot",
                )}
              </span>
            </div>
            {letters2026 && (
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="inline-flex items-center justify-center rounded-md border-2 border-foreground bg-surface px-3 py-1 text-2xl font-black tracking-widest text-foreground"
                  dir="rtl"
                  lang="he"
                  aria-label={`${t(lettersFinal ? "party.lettersApproved" : "party.lettersRequested")}: ${letters2026}`}
                >
                  {letters2026}
                </span>
                <span className="text-xs text-muted max-w-prose">
                  {t(lettersFinal ? "party.lettersApproved" : "party.lettersRequested")}
                  {!lettersFinal && approvalText ? ` — ${t("party.lettersPending", { date: approvalText })}` : ""}
                  {profile?.ballotLetters && profile.ballotLetters !== letters2026 ? (
                    <>
                      {" "}
                      ({t("party.ballot2022")}:{" "}
                      <span dir="rtl" lang="he">
                        {profile.ballotLetters}
                      </span>
                      )
                    </>
                  ) : null}
                </span>
              </div>
            )}
            {listName2026.text && (
              <div>
                <span className="text-muted">{t("party.listName")}: </span>
                <Link href={listAnchor} className="font-medium text-accent hover:underline" {...localizedAttrs(listName2026)}>
                  {listName2026.text}
                </Link>
              </div>
            )}
            {listHead2026 && (
              <div>
                <span className="text-muted">{t("party.listHead")}: </span>
                <span {...rtlAttrs(listHead2026)}>{listHead2026}</span>
              </div>
            )}
            {/* Who the list is made of: a joint list names its parties, and any
                other sitting faction running inside it. */}
            {e2026List ? (
              <ListMakeup slug={e2026List.slug} exceptFaction={factionId} className="text-sm" />
            ) : (
              submittedBy2026.length > 0 && (
                <div>
                  <span className="text-muted">{t(submittedBy2026.length > 1 ? "election.jointList" : "party.submittedBy")}: </span>
                  {submittedBy2026.map((b, k) => (
                    <span key={b}>
                      {k > 0 && " + "}
                      <span {...localizedAttrs(loc(b))}>{loc(b).text}</span>
                    </span>
                  ))}
                </div>
              )
            )}
            {e2026.note && (
              <p className="leading-relaxed" {...partyTextAttrs(e2026.note, locale)}>
                {partyText(e2026.note, locale)}
              </p>
            )}
            {e2026List?.website && (
              <div>
                <span className="text-muted">{t("election.officialSite")}: </span>
                <a href={e2026List.website} target="_blank" rel="noopener noreferrer" className="font-medium text-accent underline" dir="ltr">
                  {new URL(e2026List.website).hostname.replace(/^www\./, "")}
                </a>
              </div>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-2">
              {ownList?.logo && <SourceLinks sources={[ownList.logo.source]} label={t("election.logoCredit")} />}
              {listUrl2026 && (
                <a
                  className="text-xs underline text-muted hover:text-accent"
                  href={listUrl2026}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("party.cecPage")}
                </a>
              )}
              {e2026.sources && e2026.sources.length > 0 && (
                <SourceLinks sources={e2026.sources} label={t("common.source")} />
              )}
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-6 pt-2">
          <div>
            {/* Seats = members holding a seat now; a Norwegian-law minister
                listed below still belongs to the faction but holds no seat. */}
            <div className="text-2xl font-bold text-accent">{members.filter((m) => m.isSitting).length}</div>
            <div className="text-sm text-muted">{t("parties.seats")}</div>
          </div>
          {avgParticipation != null && (
            <div>
              <div className="text-2xl font-bold text-accent">{avgParticipation}%</div>
              <div className="text-sm text-muted">{t("party.avgParticipation")}</div>
            </div>
          )}
          {profile?.leaderHe && (
            <div>
              <div className="text-2xl font-bold text-accent">
                {leaderPersonId != null ? (
                  <Link href={`/members/${leaderPersonId}`} className="hover:underline">
                    {locale === "he" ? profile.leaderHe : profile.leaderEn ?? profile.leaderHe}
                  </Link>
                ) : leaderWiki ? (
                  <a href={leaderWiki} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {locale === "he" ? profile.leaderHe : profile.leaderEn ?? profile.leaderHe}
                  </a>
                ) : locale === "he" ? (
                  profile.leaderHe
                ) : (
                  profile.leaderEn ?? profile.leaderHe
                )}
              </div>
              <div className="text-sm text-muted">{t("party.leader")}</div>
            </div>
          )}
          {factionChair && (
            <div>
              <div
                className="text-2xl font-bold text-accent"
                {...rtlAttrs(personName(factionChair, locale))}
              >
                <Link href={`/members/${factionChair.id}`} className="hover:underline">
                  {personName(factionChair, locale)}
                </Link>
              </div>
              <div className="text-sm text-muted">{t("party.factionChair")}</div>
            </div>
          )}
          {profile?.founded && (
            <div>
              <div className="text-2xl font-bold text-accent">{profile.founded}</div>
              <div className="text-sm text-muted">{t("party.founded")}</div>
              {profile.foundedSource && <SourceLinks label={t("common.source")} sources={[profile.foundedSource]} />}
            </div>
          )}
        </div>
        {avgParticipation != null && <KnessetDataSource data={["votes"]} />}
      </section>

      {/* The list the faction runs in — its own, or the joint list it joined. */}
      {(ownList ?? e2026List) && <ListSections slug={(ownList ?? e2026List)!.slug} />}

      {profile && (
        <section className="rounded-xl bg-white p-6 shadow-sm space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">{t("party.about")}</h2>
              <span className="text-sm text-muted">{t("party.spectrum")}</span>
            </div>
            <SpectrumBar spectrum={profile.spectrum} />
            <p className="leading-relaxed">{partyText(profile.summary, locale)}</p>
            {profile.tags && profile.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.tags.map((tag) => {
                  // Tags are data-driven, so the key is dynamic — guard with
                  // t.has and fall back to the raw tag.
                  const key = `partyTags.${tag}` as Parameters<typeof t>[0];
                  return (
                    <span
                      key={tag}
                      className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs text-accent"
                    >
                      {t.has(key) ? t(key) : tag}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {positions.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">{t("party.positions")}</h3>
              <ul className="list-disc space-y-1 ps-5 text-sm leading-relaxed">
                {positions.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {/* The spectrum, tags and positions are editorial; cite what they draw on. */}
          {(profile.wikipediaEn || profile.website) && (
            <p className="text-xs text-muted">
              {t("party.basedOn")}{" "}
              {profile.wikipediaEn && (
                <a
                  className="underline hover:text-accent"
                  href={profile.wikipediaEn}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("member.wikipedia")}
                </a>
              )}
              {profile.wikipediaEn && profile.website && " · "}
              {profile.website && (
                <a
                  className="underline hover:text-accent"
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("party.officialSite")}
                </a>
              )}
            </p>
          )}

          <div className="flex flex-wrap gap-4 text-sm pt-1">
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                {t("party.officialSite")}
              </a>
            )}
            {profile.wikipediaEn && (
              <a
                href={profile.wikipediaEn}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                {t("member.wikipedia")}
              </a>
            )}
          </div>
          <p className="text-xs text-muted">{t("party.editorialNote")}</p>
        </section>
      )}

      {updates.length > 0 && (
        <section className="rounded-xl bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold">{t("party.updates")}</h2>
          <p className="text-xs text-muted">{t("party.updatesNote")}</p>
          <ol className="space-y-3">
            {updates.map((u) => (
              <li key={`${u.date}-${u.text.he.slice(0, 24)}`} className="flex gap-3 text-sm">
                <time dateTime={u.date} className="shrink-0 tabular-nums text-muted">
                  {formatDate(u.date, locale)}
                </time>
                <div className="space-y-0.5">
                  <p className="leading-relaxed" {...partyTextAttrs(u.text, locale)}>
                    {partyText(u.text, locale)}
                  </p>
                  <SourceLinks sources={u.sources} label={t("common.source")} />
                </div>
              </li>
            ))}
          </ol>
          {profile?.verified && (
            <p className="text-xs text-muted">
              {t("common.lastChecked", { date: formatDate(profile.verified, locale) })}
            </p>
          )}
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t("party.membersTitle")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <MemberCard key={m.id} member={m} locale={locale} />
          ))}
        </div>
      </section>

      <div className="pt-2">
        <FeedbackActions
          context={factionName(factionId, faction.nameHe, locale)}
          subject="party"
        />
      </div>
    </div>
  );
}

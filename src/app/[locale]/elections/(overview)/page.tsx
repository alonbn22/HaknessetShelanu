import { localizePage, localizeData } from "@/lib/i18n-data";
import { ListLogo } from "@/components/election/ListLogo";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rtlLocales } from "@/i18n/routing";
import {
  getControversialLaws,
  getElectionOutlook,
  getFactionMeta,
  localizedMeta,
  getPartyProfile,
  partyText,
  partyTextAttrs,
  type ElectionFact,
  publisherName,
  candidateName,
  listHref,
  partnerFactionIds,
} from "@/lib/content";
import { formatDate, formatNumber } from "@/lib/format";
import { rtlAttrs, localizedAttrs } from "@/lib/text";
import { getFactionAvgParticipation, getFactionTallies } from "@/lib/queries";
import { KeyDatesTimeline } from "@/components/KeyDatesTimeline";
import { PollsSection } from "@/components/polls/PollsSection";
import { SourceLinks } from "@/components/SourceLinks";
import { KNESSET_DATA } from "@/components/KnessetDataSource";
import { ListMakeup } from "@/components/election/ListMakeup";
import { ListsTable } from "@/components/election/SubmittedLists";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const dynamic = "force-dynamic";



export default async function ElectionsPage() {
  const te = await getTranslations("election");
  const tf = await getTranslations("finder");
  const tp = await getTranslations("party");
  const tc = await getTranslations("common");
  const ts = await getTranslations("spectrum");
  const locale = await getLocale();
  const outlook = getElectionOutlook();
  // Approval date from the timeline, so the "requested letters" caveat never hardcodes it.
  const approvalDateIso = outlook?.keyDates?.find((d) => d.key === "kd-approval")?.date;
  const approvalDateText = approvalDateIso ? formatDate(approvalDateIso, locale) : "";
  // The CEC's names for lists are data text: the unified cache translates
  // them (people's names never — candidateName shows official ones).
  const { loc } = localizePage(
    [
      ...(outlook?.parties ?? []).map((p) => p.cec?.listName.he),
      ...(outlook?.submittedLists?.lists ?? []).map((l) => l.name.he),
    ],
    locale,
  );
  // People's names: the site's transliterations (never machine-translated, so
  // nothing is queued for them); official spellings win inside candidateName.
  // Of the submitted rosters only the heads show here (/elections/lists has the rest).
  const names = localizeData(
    [
      ...(outlook?.parties ?? []).flatMap((p) => (p.candidates ?? []).map((c) => c.he)),
      ...(outlook?.submittedLists?.lists ?? []).map((l) => l.candidates?.[0]?.he),
    ],
    locale,
  );
  // The record strip's vote rows: each controversial law that has a roll-call
  // inside the site's record, tallied by faction once for the whole page.
  const lawVotes = getControversialLaws().flatMap((law) => law.votes.map((v) => ({ law, vote: v, tallies: getFactionTallies(v.id) })));
  const factionMeta = getFactionMeta();

  // A sourced fact row (key facts / rules / stats share the shape).
  const factRow = (f: ElectionFact) => (
    <div key={f.key} className="rounded-lg bg-black/[.03] p-3 space-y-1">
      <div className="text-muted text-xs">{partyText(f.label, locale)}</div>
      {f.value && <div className="font-semibold">{partyText(f.value, locale)}</div>}
      {f.detail && <p className="text-sm leading-relaxed">{partyText(f.detail, locale)}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {f.status && f.status !== "confirmed" && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
            {te(f.status === "scheduled-by-law" ? "statusByLaw" : "statusReported")}
          </span>
        )}
        <SourceLinks sources={f.sources} label={tc("source")} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-bold">{te("title")}</h1>
        <Link href="/elections/history" className="text-sm text-accent-ink underline">
          {te("historyLink")} {rtlLocales.has(locale) ? "←" : "→"}
        </Link>
      </div>

      {outlook && (
        <section
          id="upcoming"
          className="rounded-xl border border-accent/30 bg-accent/5 p-6 space-y-5"
        >
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold">{te("homeTitle")}</h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  outlook.dateStatus === "set"
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {te(
                  outlook.dateStatus === "set"
                    ? "statusSet"
                    : outlook.dateStatus === "scheduled-by-law"
                      ? "statusByLaw"
                      : "statusReported",
                )}
              </span>
            </div>
            <p className="text-lg font-semibold">{partyText(outlook.headline, locale)}</p>
            {outlook.expectedDate && (
              <p className="text-muted">
                {te("expectedDate")}: <strong>{formatDate(outlook.expectedDate, locale)}</strong>
              </p>
            )}
            <p className="text-sm leading-relaxed">{partyText(outlook.intro, locale)}</p>
          </div>

          {/* Timeline to the 26th Knesset — each entry dated + sourced. */}
          {outlook.keyDates && outlook.keyDates.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                {te("keyDates")}
              </h3>
              <KeyDatesTimeline dates={outlook.keyDates} variant="full" />
            </div>
          )}

          {outlook.facts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                {te("keyFacts")}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {outlook.facts.map(factRow)}
              </div>
            </div>
          )}

          {outlook.parties.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                {te("parties")}
              </h3>
              <p className="text-xs text-muted">
                {(() => {
                  // Both dates come from the timeline entries so the UI never
                  // hardcodes them: approval for the note, approval again for
                  // the rosters still to be published.
                  const approval = outlook.keyDates?.find((d) => d.key === "kd-approval")?.date;
                  const dateText = approval ? formatDate(approval, locale) : "";
                  return (
                    <>
                      {te("partiesNote", { date: dateText })}{" "}
                      {approval ? te("finalListsNote", { date: dateText }) : null}
                    </>
                  );
                })()}
              </p>
              <p className="text-xs text-muted">{te("promisesRule")}</p>
              {locale !== "he" && <p className="text-xs text-muted">{te("namesTransliterated")}</p>}
              <p className="text-sm">
                <Link href="/quiz" className="text-accent-ink underline">
                  {te("compassCta")}
                </Link>
                {" · "}
                <Link href="/elections/positions" className="text-accent-ink underline">
                  {te("positionsCta")}
                </Link>
                {" · "}
                <Link href="/elections/find" className="text-accent-ink underline">
                  {tf("cta")}
                </Link>
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {outlook.parties.map((p) => {
                  // Party's editorial profile — the card previews it and deep-links
                  // to the full page.
                  const profile = p.factionId != null ? getPartyProfile(p.factionId) : undefined;
                  return (
                  <div key={p.name.he} id={`list-${p.slug}`} className="rounded-lg bg-surface p-3 shadow-sm space-y-1.5 scroll-mt-24">
                    {p.logo && (
                      <ListLogo logo={p.logo} alt={te("logoAlt", { name: partyText(p.name, locale) })} height={40} maxWidth={160} />
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold">
                        <Link className="hover:underline" href={listHref(p)}>
                          {partyText(p.name, locale)}
                        </Link>
                      </div>
                      {/* The letters the list asked for at submission, from its
                          CEC page — marked "requested" until the committee
                          approves lists and letters. */}
                      {p.cec && (
                        <a
                          href={p.cec.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded bg-surface-sunken px-1.5 py-0.5 text-xs font-bold tracking-wide hover:bg-chrome-hover"
                          title={
                            p.cec.lettersStatus === "approved"
                              ? tp("lettersApproved")
                              : te("lettersBadgeTitle", { date: approvalDateText })
                          }
                        >
                          <span dir="rtl" lang="he">{p.cec.letters}</span>
                          {p.cec.lettersStatus !== "approved" && (
                            <>
                              {" "}
                              <span className="font-normal text-muted">{te("lettersRequestedShort")}</span>
                            </>
                          )}
                        </a>
                      )}
                    </div>
                    {p.cec && (
                      <p className="text-xs text-muted" {...localizedAttrs(loc(p.cec.listName.he))}>
                        {loc(p.cec.listName.he).text}
                      </p>
                    )}
                    <ListMakeup slug={p.slug} />
                    {p.leader && (
                      <div className="text-sm text-muted">
                        {te("leader")}:{" "}
                        {p.leaderPersonId != null ? (
                          // Leader is in the DB — link to their member page.
                          <Link
                            className="text-accent hover:underline"
                            href={`/members/${p.leaderPersonId}`}
                          >
                            {partyText(p.leader, locale)}
                          </Link>
                        ) : p.leaderWiki ? (
                          // Not a 25th-Knesset member (no member page) — link
                          // their Wikipedia article instead.
                          <a
                            className="text-accent hover:underline"
                            href={p.leaderWiki}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {partyText(p.leader, locale)}
                          </a>
                        ) : (
                          partyText(p.leader, locale)
                        )}
                      </div>
                    )}
                    {profile?.spectrum && (
                      <span className="inline-block rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                        {ts(profile.spectrum)}
                      </span>
                    )}
                    {/* What the sitting faction did, beside what the list says:
                        its members' average vote participation in the 25th
                        Knesset, from the Knesset record. */}
                    {(() => {
                      const avg = p.factionId != null ? getFactionAvgParticipation(p.factionId) : null;
                      if (avg == null) return null;
                      return (
                        <p className="text-xs text-muted">
                          {te("recordParticipation", { pct: formatNumber(avg, locale, 1) })}{" "}
                          <SourceLinks label={tc("source")} sources={[KNESSET_DATA.votes]} className="" />
                        </p>
                      );
                    })()}
                    {/* How the sitting faction voted on each controversial law
                        inside the record — under the faction's name at the time
                        when that differs from the list's name today. */}
                    {p.factionId != null &&
                      lawVotes.map(({ law, vote, tallies }) => {
                        const tally = tallies.get(p.factionId!);
                        if (!tally) return null;
                        // The faction's name at the time, in the page's language, when it
                        // is not simply the list's own name (Labor → the Democrats, Hadash-
                        // Ta'al → the Joint List, Religious Zionism → its bloc with Zehut).
                        const meta = factionMeta.get(p.factionId!);
                        const thenHe = meta?.he ?? tally.factionNameHe;
                        const asThen = thenHe && thenHe !== p.name.he ? (meta ? localizedMeta(meta, locale) : thenHe) : null;
                        return (
                          <p key={vote.id} className="text-xs text-muted">
                            <span {...partyTextAttrs(law.title, locale)}>{partyText(law.title, locale)}</span>
                            {" "}({partyText(vote.stage, locale)}):{" "}
                            <span className="font-semibold text-foreground tabular-nums">
                              {te("recordVote", { for: tally.for, against: tally.against })}
                            </span>
                            {tally.absent > 0 && <> {te("recordVoteAbsent", { n: tally.absent })}</>}
                            {asThen && <> <span {...rtlAttrs(asThen)}>{te("recordVoteAs", { faction: asThen })}</span></>}
                            {" · "}
                            <Link href={`/votes/${vote.id}`} className="underline hover:text-accent-ink" title={vote.note ? partyText(vote.note, locale) : undefined}>
                              {tc("source")}: {tc("knesset")}
                            </Link>
                          </p>
                        );
                      })}
                    {/* New lists aren't sitting factions — say so instead of
                        silently omitting the party-page link (a joint list with a
                        sitting faction says which one instead). */}
                    {p.factionId == null && partnerFactionIds(p.slug).length === 0 && (
                      <span className="inline-block rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-muted">
                        {te("newList")}
                      </span>
                    )}
                    {p.website && (
                      <p className="text-xs">
                        {te("officialSite")}:{" "}
                        <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-accent-ink underline" dir="ltr">
                          {new URL(p.website).hostname.replace(/^www\./, "")}
                        </a>
                      </p>
                    )}
                    <div className="text-xs">
                      <p className="font-semibold">{te("promises")}</p>
                      {p.promises ? (
                        <>
                          {p.promises.note && (
                            <p className="text-muted" {...partyTextAttrs(p.promises.note, locale)}>
                              {partyText(p.promises.note, locale)}
                            </p>
                          )}
                          <ul className="list-disc space-y-0.5 ps-4 leading-relaxed text-foreground/75">
                            {p.promises.items.map((it, i) => (
                              <li key={i} {...partyTextAttrs(it, locale)}>
                                {partyText(it, locale)}
                              </li>
                            ))}
                          </ul>
                          <SourceLinks sources={p.promises.sources} label={tc("source")} />
                        </>
                      ) : (
                        <p className="text-muted">{te("promisesNone")}</p>
                      )}
                    </div>
                    {p.note && (
                      <p className="text-xs leading-relaxed" {...partyTextAttrs(p.note, locale)}>{partyText(p.note, locale)}</p>
                    )}
                    {(() => {
                      const a = outlook.surplusAgreements.find((x) => x.between.includes(p.slug));
                      if (!a) return null;
                      const other = outlook.parties.find((o) => o.slug === a.between.find((s) => s !== p.slug));
                      return (
                        <p className="text-xs leading-relaxed">
                          <span className="font-semibold">{te("surplusWith")}: </span>
                          {other ? partyText(other.name, locale) : a.between.join(" – ")}
                          {a.status === "reported" && <> ({te("statusReported")})</>}
                          {" · "}
                          <SourceLinks sources={a.sources} label={tc("source")} />
                        </p>
                      );
                    })()}
                    {p.stance && (
                      <p className="text-xs leading-relaxed" {...partyTextAttrs(p.stance, locale)}>
                        <span className="font-semibold">{te("stance")}: </span>
                        {partyText(p.stance, locale)}
                      </p>
                    )}
                    {p.candidates && p.candidates.length > 0 && (
                      // The submitted roster, in ballot order: official spellings
                      // where the Knesset has one, else the Hebrew record (never
                      // machine-transliterated); sitting members link to their page.
                      <details className="text-xs" open={p.candidates.length <= 8}>
                        <summary className="cursor-pointer font-semibold">
                          {te("candidates")} <span className="font-normal text-muted tabular-nums">({p.candidates.length})</span>
                        </summary>
                        <ol className="mt-1 columns-2 gap-x-4 ps-4 leading-6 [&>li]:break-inside-avoid">
                          {p.candidates.map((c, i) => (
                            <li key={c.he} value={i + 1} className="list-decimal">
                              {c.personId != null ? (
                                <Link href={`/members/${c.personId}`} className="text-accent-ink underline" {...rtlAttrs(candidateName(c, locale, names))}>
                                  {candidateName(c, locale, names)}
                                </Link>
                              ) : (
                                <span {...rtlAttrs(candidateName(c, locale, names))}>{candidateName(c, locale, names)}</span>
                              )}
                            </li>
                          ))}
                        </ol>
                      </details>
                    )}
                    <p className="text-xs text-muted">
                      <SourceLinks sources={p.sources} label={tc("source")} />
                      {p.logo && (
                        <>
                          {" · "}
                          <SourceLinks sources={[p.logo.source]} label={te("logoCredit")} />
                        </>
                      )}
                    </p>
                    <Link
                      href={listHref(p)}
                      className="block py-1 text-xs font-medium text-accent hover:underline"
                    >
                      {te("morePartyInfo")} {rtlLocales.has(locale) ? "←" : "→"}
                    </Link>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Every list that submitted — the 15 cards above are the ones
              pollsters name; the other 23 exist too. From the CEC index:
              letters, name and head here, every roster on /elections/lists. */}
          {outlook.submittedLists && outlook.submittedLists.lists.length > 0 && (
            <div id="all-lists" className="scroll-mt-24 space-y-2">
              <SectionHeading
                as="h3"
                variant="eyebrow"
                aside={
                  <Link href="/elections/lists" className="inline-block py-1 text-sm font-medium text-accent-ink underline">
                    {te("allCandidates")} {rtlLocales.has(locale) ? "←" : "→"}
                  </Link>
                }
              >
                {te("allLists", { count: outlook.submittedLists.lists.length })}
              </SectionHeading>
              <p className="text-xs leading-relaxed text-muted">{te("allListsIntro", { date: approvalDateText })}</p>
              <ListsTable lists={outlook.submittedLists.lists} loc={loc} names={names} />
              {locale !== "he" && <p className="text-xs text-muted">{te("namesTransliterated")}</p>}
              <p className="text-xs text-muted">
                {te("cecSourceLine")}{" "}
                <a
                  className="underline hover:text-accent-ink"
                  href={outlook.submittedLists.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {publisherName(outlook.submittedLists.source.publisher, locale) ?? outlook.submittedLists.source.title}
                </a>
                {" · "}
                {tc("lastChecked", { date: formatDate(outlook.submittedLists.asOf, locale) })}
              </p>
            </div>
          )}

          {/* Seat polls since the lists closed — after who is running, so a
              reader meets the lists before the numbers. Every figure verified
              against the outlet's own article; see content/polls.yaml. */}
          <PollsSection />

          {outlook.howToVote.length > 0 && (
            <div id="how-to-vote" className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                {te("howToVote")}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {outlook.howToVote.map(factRow)}
              </div>
            </div>
          )}

          {outlook.rules.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                {te("rules")}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">{outlook.rules.map(factRow)}</div>
            </div>
          )}

          {outlook.stats.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                {te("stats")}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {outlook.stats.map(factRow)}
              </div>
            </div>
          )}

          {outlook.news && outlook.news.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                {te("news")}
              </h3>
              <ul className="space-y-1 text-sm">
                {outlook.news.map((n, i) => (
                  <li key={i} className="flex flex-wrap gap-2">
                    {n.date && (
                      <span className="whitespace-nowrap text-muted">
                        {formatDate(n.date, locale)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">{partyText(n.text, locale)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-black/5 pt-3">
            {outlook.links.map((l) => (
              <a
                key={l.url}
                className="text-sm text-accent hover:underline"
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {partyText(l.label, locale)}
              </a>
            ))}
          </div>
          <p className="text-xs text-muted">
            {outlook.disclaimer && <>{partyText(outlook.disclaimer, locale)} </>}
            {te("lastReviewed", { date: formatDate(outlook.lastReviewed, locale) })}
          </p>
        </section>
      )}

    </div>
  );
}

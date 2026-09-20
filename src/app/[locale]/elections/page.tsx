import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rtlLocales } from "@/i18n/routing";
import {
  getControversialLaws,
  getElectionsHistory,
  getElectionOutlook,
  getFactionMeta,
  localizedMeta,
  getPartyProfile,
  partyText,
  partyTextAttrs,
  partyList,
  type ElectionFact,
} from "@/lib/content";
import { formatDate, formatNumber } from "@/lib/format";
import { rtlAttrs } from "@/lib/text";
import { getFactionAvgParticipation, getFactionTallies } from "@/lib/queries";
import { KeyDatesTimeline } from "@/components/KeyDatesTimeline";
import { PollsSection } from "@/components/polls/PollsSection";

export const dynamic = "force-dynamic";

// Per-Knesset English Wikipedia article — the cited source for each term's
// summary, events, and figures.
const ORDINALS = [
  "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth",
  "Ninth", "Tenth", "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth",
  "Sixteenth", "Seventeenth", "Eighteenth", "Nineteenth", "Twentieth",
  "Twenty-first", "Twenty-second", "Twenty-third", "Twenty-fourth", "Twenty-fifth",
];
const knessetWikiUrl = (n: number) =>
  ORDINALS[n - 1]
    ? `https://en.wikipedia.org/wiki/${ORDINALS[n - 1].replace(/ /g, "_")}_Knesset`
    : null;
const KNESSET_HISTORY_URL =
  "https://main.knesset.gov.il/en/about/history/Pages/KnessetHistory.aspx";

// "source · source" suffix — keeps always-cite-sources visible on every fact.
function SourceLinks({ sources, label }: {
  sources: { url: string; title: string; publisher?: string }[];
  label: string;
}) {
  return (
    <span className="text-xs text-muted">
      {label}:{" "}
      {sources.map((s, i) => (
        <span key={s.url}>
          {i > 0 && " · "}
          <a
            className="underline hover:text-accent"
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {s.publisher ?? s.title}
          </a>
        </span>
      ))}
    </span>
  );
}

export default async function ElectionsHistoryPage() {
  const t = await getTranslations("electionsHistory");
  const te = await getTranslations("election");
  const tp = await getTranslations("party");
  const tc = await getTranslations("common");
  const ts = await getTranslations("spectrum");
  const locale = await getLocale();
  const elections = getElectionsHistory();
  const outlook = getElectionOutlook();
  // Approval date from the timeline, so the "requested letters" caveat never hardcodes it.
  const approvalDateIso = outlook?.keyDates?.find((d) => d.key === "kd-approval")?.date;
  const approvalDateText = approvalDateIso ? formatDate(approvalDateIso, locale) : "";
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
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </div>

      {outlook && (
        <section
          id="upcoming"
          className="rounded-xl border border-accent/30 bg-accent/5 p-6 space-y-5"
        >
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold">{te("title")}</h2>
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

          {/* Seat polls since the lists closed — every figure verified against
              the outlet's own article; see content/polls.yaml. */}
          <PollsSection />

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
              <p className="text-sm">
                <Link href="/quiz" className="text-accent-ink underline">
                  {te("compassCta")}
                </Link>
                {" · "}
                <Link href="/elections/positions" className="text-accent-ink underline">
                  {te("positionsCta")}
                </Link>
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {outlook.parties.map((p) => {
                  // Party's editorial profile — the card previews it and deep-links
                  // to the full page.
                  const profile = p.factionId != null ? getPartyProfile(p.factionId) : undefined;
                  const positions = profile ? partyList(profile.positions, locale).slice(0, 2) : [];
                  return (
                  <div key={p.name.he} id={`list-${p.slug}`} className="rounded-lg bg-surface p-3 shadow-sm space-y-1.5 scroll-mt-24">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold">
                        {p.factionId != null ? (
                          <Link className="hover:underline" href={`/parties/${p.factionId}`}>
                            {partyText(p.name, locale)}
                          </Link>
                        ) : (
                          partyText(p.name, locale)
                        )}
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
                      <p className="text-xs text-muted" dir="rtl" lang="he">
                        {partyText(p.cec.listName, "he")}
                      </p>
                    )}
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
                          <Link href={`/parties/${p.factionId}`} className="underline hover:text-accent-ink">
                            {tc("source")}: {tc("knesset")}
                          </Link>
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
                        silently omitting the party-page link. */}
                    {p.factionId == null && (
                      <span className="inline-block rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-muted">
                        {te("newList")}
                      </span>
                    )}
                    {positions.length > 0 && (
                      <ul className="list-disc space-y-0.5 ps-4 text-xs leading-relaxed text-foreground/75">
                        {positions.map((pos, i) => (
                          <li key={i} {...rtlAttrs(pos)}>
                            {pos}
                          </li>
                        ))}
                      </ul>
                    )}
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
                      // The submitted roster, in ballot order. Names are the
                      // Hebrew record in every locale (never machine-transliterated);
                      // sitting members link to their page.
                      <details className="text-xs" open={p.candidates.length <= 8}>
                        <summary className="cursor-pointer font-semibold">
                          {te("candidates")} <span className="font-normal text-muted tabular-nums">({p.candidates.length})</span>
                        </summary>
                        <ol className="mt-1 columns-2 gap-x-4 ps-4 leading-relaxed [&>li]:break-inside-avoid" dir="rtl" lang="he">
                          {p.candidates.map((c, i) => (
                            <li key={c.he} value={i + 1} className="list-decimal">
                              {c.personId != null ? (
                                <Link href={`/members/${c.personId}`} className="text-accent-ink underline">
                                  {c.he}
                                </Link>
                              ) : (
                                c.he
                              )}
                            </li>
                          ))}
                        </ol>
                      </details>
                    )}
                    <SourceLinks sources={p.sources} label={tc("source")} />
                    {profile && p.factionId != null && (
                      <Link
                        href={`/parties/${p.factionId}`}
                        className="block text-xs font-medium text-accent hover:underline"
                      >
                        {te("morePartyInfo")} {rtlLocales.has(locale) ? "←" : "→"}
                      </Link>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Every list that submitted — the 15 cards above are the ones
              pollsters name; the other 23 exist too. From the CEC index. */}
          {outlook.submittedLists && outlook.submittedLists.lists.length > 0 && (
            <details id="all-lists" className="rounded-lg bg-surface p-3 shadow-sm scroll-mt-24">
              <summary className="cursor-pointer text-sm font-semibold">
                {te("allLists", { count: outlook.submittedLists.lists.length })}
              </summary>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                {te("allListsIntro", { date: approvalDateText })}
              </p>
              <div className="mt-2 overflow-x-auto rounded-card border border-line">
                <table className="w-full text-xs">
                  <thead className="bg-surface-sunken text-start">
                    <tr>
                      <th className="px-2 py-1.5 text-start font-semibold">#</th>
                      <th className="px-2 py-1.5 text-start font-semibold">{te("colLetters")}</th>
                      <th className="px-2 py-1.5 text-start font-semibold">{te("colList")}</th>
                      <th className="px-2 py-1.5 text-start font-semibold">{te("colHead")}</th>
                      <th className="px-2 py-1.5 text-start font-semibold">{te("colSubmittedBy")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outlook.submittedLists.lists.map((l) => (
                      <tr key={l.listNumber} className="border-t border-line align-top">
                        <td className="px-2 py-1.5 tabular-nums text-muted">{l.listNumber}</td>
                        <td className="px-2 py-1.5 font-bold tracking-wide whitespace-nowrap" dir="rtl" lang="he">
                          {l.letters}
                        </td>
                        <td className="px-2 py-1.5" dir="rtl" lang="he">
                          {l.slug ? (
                            <a href={`#list-${l.slug}`} className="underline hover:text-accent">
                              {partyText(l.name, "he")}
                            </a>
                          ) : (
                            partyText(l.name, "he")
                          )}{" "}
                          <a
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted underline"
                            title={tp("cecPage")}
                          >
                            ↗
                          </a>
                        </td>
                        <td className="px-2 py-1.5" dir="rtl" lang="he">
                          {l.head ? partyText(l.head, "he") : ""}
                        </td>
                        <td className="px-2 py-1.5 text-muted" dir="rtl" lang="he">
                          {(l.submittedBy ?? []).join(" · ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted">
                {te("cecSourceLine")}{" "}
                <a
                  className="underline hover:text-accent"
                  href={outlook.submittedLists.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {outlook.submittedLists.source.publisher ?? outlook.submittedLists.source.title}
                </a>
                {" · "}
                {tc("lastChecked", { date: formatDate(outlook.submittedLists.asOf, locale) })}
              </p>
            </details>
          )}

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

      <ol className="space-y-3">
        {elections.map((e) => (
          <li
            key={e.knesset}
            className="rounded-card border border-line bg-surface p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold">
                {tc("knessetNum", { num: e.knesset })}
              </h2>
              <span className="text-sm text-muted">{formatDate(e.date, locale)}</span>
            </div>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div>
                <div className="text-muted">{t("winner")}</div>
                <div className="font-semibold">{partyText(e.winner, locale)}</div>
              </div>
              {e.winnerSeats != null && (
                <div>
                  <div className="text-muted">{t("seats")}</div>
                  <div className="font-semibold text-accent">{e.winnerSeats}</div>
                </div>
              )}
              {e.turnout != null && (
                <div>
                  <div className="text-muted">{t("turnout")}</div>
                  <div className="font-semibold">{e.turnout}%</div>
                </div>
              )}
              {e.pm && (
                <div>
                  <div className="text-muted">{t("pm")}</div>
                  <div className="font-semibold">{partyText(e.pm, locale)}</div>
                </div>
              )}
            </div>
            {e.note && (
              <p className="mt-2 text-sm text-foreground/80">{partyText(e.note, locale)}</p>
            )}

            {(e.summary || (e.events && e.events.length > 0) || e.ended) && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-accent hover:underline">
                  {t("readMore")}
                </summary>
                <div className="mt-3 space-y-4 text-sm">
                  {e.summary && (
                    <p className="text-foreground/80 leading-relaxed">
                      {partyText(e.summary, locale)}
                    </p>
                  )}
                  {e.events && e.events.length > 0 && (
                    <div className="space-y-2">
                      <div className="font-semibold">{t("keyEvents")}</div>
                      <ul className="space-y-1.5">
                        {[...e.events]
                          .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
                          .map((ev, i) => (
                          <li key={i} className="flex gap-2">
                            <span
                              aria-hidden
                              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                ev.kind === "good"
                                  ? "bg-green-600"
                                  : ev.kind === "bad"
                                    ? "bg-red-600"
                                    : "bg-black/40"
                              }`}
                            />
                            <span className="text-foreground/80">
                              {ev.date && (
                                <span className="text-muted">
                                  {formatDate(ev.date, locale)} —{" "}
                                </span>
                              )}
                              {partyText(ev.text, locale)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {e.ended && (
                    <div className="rounded-lg bg-black/5 p-3">
                      <span className="font-medium">{t("howEnded")}: </span>
                      <span className="text-foreground/80">{partyText(e.ended, locale)}</span>
                    </div>
                  )}
                </div>
              </details>
            )}
            <p className="mt-2 text-xs text-muted">
              {tc("source")}:{" "}
              {knessetWikiUrl(e.knesset) && (
                <>
                  <a
                    className="hover:text-accent underline"
                    href={knessetWikiUrl(e.knesset)!}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Wikipedia
                  </a>
                  {" · "}
                </>
              )}
              <a
                className="hover:text-accent underline"
                href={KNESSET_HISTORY_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                {tc("knesset")}
              </a>
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

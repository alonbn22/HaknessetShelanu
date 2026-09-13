import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rtlLocales } from "@/i18n/routing";
import {
  getElectionsHistory,
  getElectionOutlook,
  getPartyProfile,
  partyText,
  partyTextAttrs,
  partyList,
  type ElectionFact,
} from "@/lib/content";
import { formatDate } from "@/lib/format";
import { rtlAttrs } from "@/lib/text";
import { KeyDatesTimeline } from "@/components/KeyDatesTimeline";

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
  const tc = await getTranslations("common");
  const ts = await getTranslations("spectrum");
  const locale = await getLocale();
  const elections = getElectionsHistory();
  const outlook = getElectionOutlook();

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

          {outlook.parties.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                {te("parties")}
              </h3>
              <p className="text-xs text-muted">
                {te("partiesNote")}{" "}
                {(() => {
                  // Date pulled from the kd-lists timeline entry so the UI never
                  // hardcodes it.
                  const kd = outlook.keyDates?.find((d) => d.key === "kd-lists");
                  return kd?.date
                    ? te("finalListsNote", { date: formatDate(kd.date, locale) })
                    : null;
                })()}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {outlook.parties.map((p) => {
                  // Party's editorial profile — the card previews it and deep-links
                  // to the full page.
                  const profile = p.factionId != null ? getPartyProfile(p.factionId) : undefined;
                  const positions = profile ? partyList(profile.positions, locale).slice(0, 2) : [];
                  return (
                  <div key={p.name.he} className="rounded-lg bg-white p-3 shadow-sm space-y-1.5">
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
                      {profile?.ballotLetters && (
                        <span
                          dir="rtl"
                          lang="he"
                          className="shrink-0 rounded bg-black/5 px-1.5 py-0.5 text-xs font-bold tracking-wide"
                        >
                          {profile.ballotLetters}
                        </span>
                      )}
                    </div>
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

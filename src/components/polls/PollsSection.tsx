import { localizePage } from "@/lib/i18n-data";
import { useLocale } from "next-intl";
import { Fragment } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getFactionMeta,
  getPolls,
  getRunningLists,
  listName,
  listNameAttrs,
  partyText,
  partyTextAttrs,
  type ElectionParty,
  type Poll,
  publisherName,
} from "@/lib/content";
import { formatDate } from "@/lib/format";
import { rtlAttrs, localizedAttrs, sourceTitle } from "@/lib/text";
import { pollOfPolls, trendSeries, AVERAGE_WINDOW_DAYS } from "@/lib/polls";
import { PollBlackoutNotice } from "@/components/polls/PollBlackoutNotice";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TableFrame } from "@/components/ui/TableFrame";
import { PollTrend, type TrendLine } from "./PollTrend";

// The polls section of /elections: the poll of polls, the trend, every poll,
// the blocs as each outlet counted them, other sites' averages, and how to read
// all of it. Fairness is structural here — rows are ordered by date, columns
// by registration, every number links to the article it came from, and blocs
// are labelled with the institute that counted them. The only place party
// colour appears is where a list is the subject.

// A list's colour: its sitting faction's chart colour, else the registry's.
function listColor(list: ElectionParty, factionColor: Map<number, string>): string {
  return (list.factionId != null && factionColor.get(list.factionId)) || list.color || "var(--neutral)";
}

// Every source the poll cites (a figure may come from a second article), each
// named by its publisher and marked RTL when that name is Hebrew on a non-Hebrew page.
function SourceLink({ poll, label }: { poll: Poll; label: string }) {
  const locale = useLocale();
  return (
    <>
      {poll.sources.map((s, i) => (
        <span key={s.url}>
          {i > 0 && " · "}
          <a className="underline hover:text-accent-ink" href={s.url} target="_blank" rel="noopener noreferrer" title={sourceTitle(s.title, locale)} {...rtlAttrs(publisherName(s.publisher, locale) ?? label)}>
            {publisherName(s.publisher, locale) ?? label}
          </a>
        </span>
      ))}
    </>
  );
}

export async function PollsSection({ id = "polls" }: { id?: string }) {
  const file = getPolls();
  if (!file || file.polls.length === 0) return null;
  const t = await getTranslations("polls");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  // The outlets' own "below the threshold" wording is data text (the cache).
  const { loc } = localizePage(file.polls.map((p) => p.belowThresholdNote), locale);

  const registry = getRunningLists();
  const slugs = [...registry.keys()];
  const factionColor = new Map([...getFactionMeta().values()].map((f) => [f.id, f.color]));
  const nameOf = (slug: string) => listName(registry.get(slug), locale) || slug;
  const attrsOf = (slug: string) => listNameAttrs(registry.get(slug), locale);
  const colorOf = (slug: string) => {
    const l = registry.get(slug);
    return l ? listColor(l, factionColor) : "var(--neutral)";
  };
  const num = (n: number, digits = 1) =>
    n.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });

  const polls = file.polls; // newest first (the loader sorts)
  const institutes = new Set(polls.map((p) => p.instituteId)).size;
  const oldest = polls[polls.length - 1].published;
  const newest = polls[0].published;
  const avg = pollOfPolls(polls, slugs);
  // Every list that any input mentions, including those every input puts below
  // the threshold — shown at the bottom as 0, not dropped.
  const avgRows = avg
    ? [...avg.lists].sort((a, b) => b.mean - a.mean || slugs.indexOf(a.slug) - slugs.indexOf(b.slug))
    : [];
  const barMax = Math.max(30, ...avgRows.map((l) => l.max));

  // Trend lines: registry order; several polls on one day get a small nudge.
  const perDay = new Map<string, string[]>();
  for (const p of [...polls].reverse()) perDay.set(p.published, [...(perDay.get(p.published) ?? []), p.id]);
  const pollById = new Map(polls.map((p) => [p.id, p]));
  const meanOf = new Map(avg?.lists.map((l) => [l.slug, l.mean]) ?? []);
  const lines: TrendLine[] = trendSeries(polls, slugs)
    .filter((s) => s.points.some((p) => p.seats > 0))
    .map((s) => {
      const seats = s.points.map((p) => p.seats);
      const mean = meanOf.get(s.slug);
      return {
        slug: s.slug,
        name: nameOf(s.slug),
        color: colorOf(s.slug),
        mean,
        summary: t("trendSummary", {
          list: nameOf(s.slug),
          min: Math.min(...seats),
          max: Math.max(...seats),
          n: s.points.length,
        }),
        averageLabel: mean != null ? t("trendAverage", { mean: num(mean) }) : undefined,
        points: s.points.map((pt) => {
          const poll = pollById.get(pt.pollId)!;
          const ids = perDay.get(pt.date) ?? [pt.pollId];
          const k = ids.indexOf(pt.pollId);
          return {
            date: pt.date,
            seats: pt.seats,
            instituteId: poll.instituteId,
            institute: partyText(poll.institute, locale),
            dx: (k - (ids.length - 1) / 2) * 3,
            label: t("trendPoint", {
              list: nameOf(s.slug),
              institute: partyText(poll.institute, locale),
              outlet: partyText(poll.outlet, locale),
              date: formatDate(pt.date, locale),
              seats: pt.seats,
            }),
          };
        }),
      };
    });

  const seatsIn = (p: Poll) =>
    [...slugs]
      .filter((s) => s in p.seats)
      .sort((a, b) => p.seats[b] - p.seats[a] || slugs.indexOf(a) - slugs.indexOf(b));

  return (
    <section id={id} className="space-y-8" aria-labelledby={`${id}-title`}>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted">{t("eyebrow")}</p>
        <h2 id={`${id}-title`} className="font-display text-2xl font-semibold">
          {t("title")}
        </h2>
        <p className="max-w-prose text-sm leading-relaxed">
          {t("intro", {
            count: polls.length,
            institutes,
            from: formatDate(oldest, locale),
            to: formatDate(newest, locale),
          })}
        </p>
      </div>

      <PollBlackoutNotice />

      {/* ---------- Poll of polls ---------- */}
      {avg && (
        <Card as="div" padding="md" className="space-y-4">
          <SectionHeading as="h3" variant="md">
            {t("averageTitle")}
          </SectionHeading>
          <p className="text-sm text-muted">
            {t("averageMethod", {
              n: avg.institutes,
              from: formatDate(avg.from, locale),
              to: formatDate(avg.to, locale),
            })}
          </p>
          <ol className="space-y-2">
            {avgRows.map((l) => {
              const list = registry.get(l.slug);
              const pct = Math.min(100, (l.mean / barMax) * 100);
              return (
                <li key={l.slug} className="grid grid-cols-[1fr_3.5rem] items-center gap-x-3 gap-y-1 text-sm sm:grid-cols-[minmax(9rem,14rem)_3.5rem_minmax(6rem,1fr)]">
                  <span className="flex items-center gap-2 leading-tight" {...attrsOf(l.slug)}>
                    <span aria-hidden className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorOf(l.slug) }} />
                    {list?.factionId != null ? (
                      <Link href={`/parties/${list.factionId}`} className="hover:underline">
                        {nameOf(l.slug)}
                      </Link>
                    ) : (
                      <span>{nameOf(l.slug)}</span>
                    )}
                  </span>
                  <span className="text-end font-display text-lg font-semibold tabular-nums">{num(l.mean)}</span>
                  <span className="relative col-span-2 block h-3 overflow-hidden rounded-full bg-surface-sunken sm:col-span-1">
                    <span className="absolute inset-y-0 start-0 rounded-full" style={{ width: `${pct}%`, backgroundColor: colorOf(l.slug) }} />
                  </span>
                  <span className="col-span-2 -mt-1 text-xs text-muted sm:col-span-1 sm:col-start-3">
                    {l.max === 0
                      ? t("belowAll", { n: avg.institutes })
                      : (
                        <>
                          {t("averageRange", { min: l.min, max: l.max })}
                          {l.above < avg.institutes && <> · {t("averageBelow", { m: avg.institutes - l.above, n: avg.institutes })}</>}
                        </>
                      )}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="text-xs text-muted">
            {tc("source")}:{" "}
            {avg.inputs.map((p, i) => (
              <span key={p.id}>
                {i > 0 && " · "}
                <SourceLink poll={p} label={partyText(p.outlet, locale)} />
                {" "}
                ({partyText(p.institute, locale)}, {formatDate(p.published, locale)})
              </span>
            ))}
          </p>
        </Card>
      )}

      {/* ---------- Trend ---------- */}
      {lines.length > 0 && (
        <Card as="div" padding="md" className="space-y-3">
          <SectionHeading as="h3" variant="md">
            {t("trendTitle")}
          </SectionHeading>
          <p className="max-w-prose text-sm text-muted">{t("trendHint")}</p>
          <PollTrend
            lines={lines}
            from={file.cutoff}
            to={newest}
            locale={locale}
            labels={{ aria: t("trendAria"), choose: t("trendChoose"), threshold: t("threshold"), houseNote: t("trendHouseNote") }}
          />
        </Card>
      )}

      {/* ---------- Every poll (dense — folded by default) ---------- */}
      <details className="space-y-3">
        <summary className="cursor-pointer">
          <h3 className="inline text-lg font-semibold">{t("allTitle", { count: polls.length })}</h3>
        </summary>
        <p className="text-xs text-muted">{t("allCaption")} {t("perPollCredit")}</p>

        {/* sm+: the table; columns in registry order. */}
        <TableFrame className="hidden sm:block">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken text-xs text-muted">
              <tr>
                <th scope="col" className="sticky start-0 bg-surface-sunken px-3 py-2 text-start font-medium">{t("colDate")}</th>
                <th scope="col" className="px-3 py-2 text-start font-medium">{t("colOutlet")}</th>
                <th scope="col" className="px-3 py-2 text-start font-medium">{t("colInstitute")}</th>
                <th scope="col" className="px-2 py-2 text-end font-medium">{t("colSample")}</th>
                {slugs.map((s) => (
                  <th key={s} scope="col" className="px-2 py-2 text-center font-medium" {...attrsOf(s)}>
                    <span className="inline-flex items-center gap-1">
                      <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: colorOf(s) }} />
                      {nameOf(s)}
                    </span>
                  </th>
                ))}
                <th scope="col" className="px-3 py-2 text-start font-medium">{t("colSource")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {polls.map((p) => (
                <Fragment key={p.id}>
                <tr>
                  <th scope="row" className="sticky start-0 whitespace-nowrap bg-surface px-3 py-2 text-start font-medium tabular-nums">
                    {formatDate(p.published, locale)}
                    {p.fieldwork && (
                      <span className="block text-xs font-normal text-muted">
                        {t("fieldwork", { from: formatDate(p.fieldwork.from, locale), to: formatDate(p.fieldwork.to, locale) })}
                      </span>
                    )}
                  </th>
                  <td className="whitespace-nowrap px-3 py-2" {...partyTextAttrs(p.outlet, locale)}>{partyText(p.outlet, locale)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted" {...partyTextAttrs(p.institute, locale)}>{partyText(p.institute, locale)}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-end tabular-nums text-muted">
                    {p.sample.toLocaleString(locale)}
                    {p.marginOfError != null && <span className="block text-xs">{t("moe", { pct: num(p.marginOfError, 1) })}</span>}
                  </td>
                  {slugs.map((s) => (
                    <td key={s} className="px-2 py-2 text-center tabular-nums">
                      {s in p.seats ? (
                        p.seats[s]
                      ) : p.belowThreshold.includes(s) ? (
                        <abbr title={t("below")} className="text-muted no-underline">&lt;</abbr>
                      ) : (
                        <abbr title={t("notReported")} className="text-muted no-underline">—</abbr>
                      )}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-3 py-2 text-xs">
                    <SourceLink poll={p} label={tc("source")} />
                  </td>
                </tr>
                {(p.note || p.belowThresholdNote) && (
                  <tr className="!border-t-0">
                    <td colSpan={5 + slugs.length} className="px-3 pb-2 text-xs text-muted">
                      {p.belowThresholdNote && <span {...localizedAttrs(loc(p.belowThresholdNote))}>{loc(p.belowThresholdNote).text}</span>}
                      {p.belowThresholdNote && p.note && " · "}
                      {p.note && <span {...partyTextAttrs(p.note, locale)}>{partyText(p.note, locale)}</span>}
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </TableFrame>

        {/* phones: one stacked row per poll, lists in the poll's own order. */}
        <ol className="divide-y divide-line rounded-card border border-line bg-surface sm:hidden">
          {polls.map((p) => (
            <li key={p.id} className="space-y-1 p-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-medium tabular-nums">{formatDate(p.published, locale)}</span>
                <span className="text-xs text-muted">
                  {t("sample", { n: p.sample.toLocaleString(locale) })}
                  {p.marginOfError != null && <> · {t("moe", { pct: num(p.marginOfError, 1) })}</>}
                </span>
              </div>
              <div className="text-xs text-muted">
                <span {...partyTextAttrs(p.outlet, locale)}>{partyText(p.outlet, locale)}</span> ·{" "}
                <span {...partyTextAttrs(p.institute, locale)}>{partyText(p.institute, locale)}</span>
              </div>
              <p className="leading-relaxed">
                {seatsIn(p).map((s, i) => (
                  <span key={s}>
                    {i > 0 && <span className="text-muted"> · </span>}
                    <span className="whitespace-nowrap">
                      <span {...attrsOf(s)}>{nameOf(s)}</span> <strong className="tabular-nums">{p.seats[s]}</strong>
                    </span>
                  </span>
                ))}
              </p>
              {p.fieldwork && (
                <p className="text-xs text-muted">{t("fieldwork", { from: formatDate(p.fieldwork.from, locale), to: formatDate(p.fieldwork.to, locale) })}</p>
              )}
              {p.belowThreshold.length > 0 && (
                <p className="text-xs text-muted">
                  {t("below")}: {p.belowThreshold.map((s) => nameOf(s)).join(", ")}
                </p>
              )}
              {p.belowThresholdNote && <p className="text-xs text-muted" {...localizedAttrs(loc(p.belowThresholdNote))}>{loc(p.belowThresholdNote).text}</p>}
              {p.note && <p className="text-xs text-muted" {...partyTextAttrs(p.note, locale)}>{partyText(p.note, locale)}</p>}
              <p className="text-xs text-muted">
                {tc("source")}: <SourceLink poll={p} label={partyText(p.outlet, locale)} />
              </p>
            </li>
          ))}
        </ol>
      </details>

      {/* ---------- Blocs, as each outlet counted them (folded) ---------- */}
      {polls.some((p) => p.blocs.length > 0) && (
        <details className="space-y-3">
          <summary className="cursor-pointer">
            <h3 className="inline text-lg font-semibold">{t("blocsTitle")}</h3>
          </summary>
          <p className="max-w-prose text-xs text-muted">{t("blocsNote")}</p>
          <ul className="divide-y divide-line rounded-card border border-line bg-surface">
            {polls
              .filter((p) => p.blocs.length > 0)
              .map((p) => (
                <li key={p.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 p-3 text-sm">
                  <span className="whitespace-nowrap font-medium tabular-nums">{formatDate(p.published, locale)}</span>
                  <span className="flex flex-wrap gap-x-3">
                    {p.blocs.map((b) => (
                      <span key={b.label.he} {...partyTextAttrs(b.label, locale)}>
                        {partyText(b.label, locale)} <strong className="tabular-nums">{b.seats}</strong>
                      </span>
                    ))}
                  </span>
                  <span className="text-xs text-muted">
                    {t("blocsBy", { institute: partyText(p.institute, locale), outlet: partyText(p.outlet, locale) })} ·{" "}
                    <SourceLink poll={p} label={tc("source")} />
                  </span>
                </li>
              ))}
          </ul>
        </details>
      )}

      {/* ---------- Other sites' averages, credited ---------- */}
      {file.externalAverages.length > 0 && (
        <div className="space-y-3">
          <SectionHeading as="h3" variant="md">
            {t("externalTitle")}
          </SectionHeading>
          {file.externalAverages.map((ext) => {
            const rows = Object.entries(ext.values).sort((a, b) => b[1] - a[1] || slugs.indexOf(a[0]) - slugs.indexOf(b[0]));
            return (
              <Card key={ext.url} as="div" padding="sm" className="space-y-2 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <a href={ext.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-accent-ink" {...partyTextAttrs(ext.name, locale)}>
                    {partyText(ext.name, locale)}
                  </a>
                  <span className="text-xs text-muted">{t("externalCredit", { publisher: partyText(ext.publisher, locale) })}</span>
                </div>
                <p className="text-xs text-muted">{t("externalAsOf", { date: formatDate(ext.asOf, locale), method: partyText(ext.method, locale) })}</p>
                <p className="leading-relaxed">
                  {rows.map(([s, v], i) => (
                    <span key={s}>
                      {i > 0 && <span className="text-muted"> · </span>}
                      <span className="whitespace-nowrap">
                        <span {...attrsOf(s)}>{nameOf(s)}</span> <strong className="tabular-nums">{num(v)}</strong>
                      </span>
                    </span>
                  ))}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      {/* ---------- How to read this ---------- */}
      <details className="rounded-card border border-line bg-surface p-4 text-sm">
        <summary className="cursor-pointer font-semibold">{t("methodologyTitle")}</summary>
        <div className="mt-3 max-w-prose space-y-3 leading-relaxed">
          <p>{t("methodologySample")}</p>
          <p>{t("methodologyHouses")}</p>
          <p>{t("methodologyAverage", { window: AVERAGE_WINDOW_DAYS })}</p>
          <p>{t("methodologyScope", { cutoff: formatDate(file.cutoff, locale) })}</p>
          <p>{t("methodologyVerification")}</p>
          <p className="text-xs text-muted">
            {t("thresholdSource")} ({num(file.threshold, 2)}%):{" "}
            {file.thresholdSources.map((s, i) => (
              <span key={s.url}>
                {i > 0 && " · "}
                <a className="underline hover:text-accent-ink" href={s.url} target="_blank" rel="noopener noreferrer">
                  {publisherName(s.publisher, locale) ?? s.title}
                </a>
              </span>
            ))}
          </p>
          <p className="text-xs text-muted">
            {t("indexCredit")}:{" "}
            <a className="underline hover:text-accent-ink" href="https://themadad.com/polls26/" target="_blank" rel="noopener noreferrer">
              HaMadad
            </a>
            {" · "}
            <a className="underline hover:text-accent-ink" href="https://en.wikipedia.org/wiki/Opinion_polling_for_the_2026_Israeli_legislative_election" target="_blank" rel="noopener noreferrer">
              Wikipedia
            </a>
          </p>
          {file.notEntered.length > 0 && (
            <div className="space-y-1">
              <p className="font-semibold">{t("notEnteredTitle")}</p>
              <ul className="list-disc space-y-1 ps-5 text-xs text-muted">
                {file.notEntered.map((n) => (
                  <li key={n.url + n.published}>
                    <a className="underline hover:text-accent-ink" href={n.url} target="_blank" rel="noopener noreferrer" {...partyTextAttrs(n.outlet, locale)}>
                      {partyText(n.outlet, locale)}
                    </a>{" "}
                    ({partyText(n.institute, locale)}), {formatDate(n.published, locale)}: {partyText(n.reason, locale)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted">{t("lastReviewed", { date: formatDate(file.lastReviewed, locale) })}</p>
        </div>
      </details>
    </section>
  );
}

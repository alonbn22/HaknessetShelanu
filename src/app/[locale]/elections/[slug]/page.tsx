import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rtlLocales } from "@/i18n/routing";
import { PartyEmblem } from "@/components/PartyEmblem";
import { SourceLinks } from "@/components/SourceLinks";
import { TableFrame } from "@/components/ui/TableFrame";
import {
  getElectionOutlook,
  getPartyProfile,
  getPolls,
  getQuizFile,
  getRunningLists,
  partyText,
  partyTextAttrs,
} from "@/lib/content";
import { formatDate, formatNumber } from "@/lib/format";
import { factionColor, factionName, getFaction, getFactionAvgParticipation } from "@/lib/queries";
import { pollOfPolls } from "@/lib/polls";
import { rtlAttrs } from "@/lib/text";

export const dynamic = "force-dynamic";

const STANCE_KEY = { 2: "agree2", 1: "agree1", 0: "neutral", [-1]: "disagree1", [-2]: "disagree2" } as const;

export async function generateMetadata({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params;
  const list = getRunningLists().get(slug);
  if (!list) return {};
  const name = partyText(list.name, locale);
  return { title: name, openGraph: { title: name } };
}

// One page per list running in the election, in the fashion of the faction
// pages: who it is, what it promises, where the polls put it, where it stands
// on the compass statements, and who is on it. Everything shown is sourced.
export default async function ListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const list = getRunningLists().get(slug);
  if (!list) notFound();

  const t = await getTranslations();
  const locale = await getLocale();
  const arrow = rtlLocales.has(locale) ? "←" : "→";
  const outlook = getElectionOutlook();
  const approval = outlook?.keyDates?.find((d) => d.key === "kd-approval")?.date;
  const faction = list.factionId != null ? getFaction(list.factionId) : undefined;
  const profile = list.factionId != null ? getPartyProfile(list.factionId) : undefined;
  const color = list.factionId != null ? factionColor(list.factionId) : list.color ?? "#888888";
  const participation = list.factionId != null ? getFactionAvgParticipation(list.factionId) : null;
  const surplus = outlook?.surplusAgreements.find((a) => a.between.includes(slug));
  const surplusOther = surplus ? outlook?.parties.find((o) => o.slug === surplus.between.find((s) => s !== slug)) : undefined;

  const polls = [...(getPolls()?.polls ?? [])].sort((a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id));
  const avg = pollOfPolls(polls, [slug])?.lists[0];
  const questions = getQuizFile().questions;
  const updates = [...(profile?.updates ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);

  return (
    <div className="space-y-6">
      <Link href={`/elections#list-${slug}`} className="text-sm text-accent-ink underline">
        {rtlLocales.has(locale) ? "→" : "←"} {t("election.parties")}
      </Link>

      <section className="rounded-xl bg-surface p-6 shadow-sm border-s-4 space-y-3" style={{ borderInlineStartColor: color }}>
        <div className="flex flex-wrap items-center gap-4">
          {list.logo ? (
            <Image
              src={list.logo.src}
              alt={t("election.logoAlt", { name: partyText(list.name, locale) })}
              width={72}
              height={72}
              unoptimized
              className="shrink-0 rounded-lg object-contain p-1"
              // A logo keeps its white plate in both themes: brand marks are drawn for white.
              style={{ width: 72, height: 72, backgroundColor: "#fff" }}
            />
          ) : (
            <PartyEmblem factionId={list.factionId ?? 0} nameHe={list.name.he} color={color} size={72} alt={partyText(list.name, locale)} />
          )}
          <div className="min-w-0 space-y-1">
            <h1 className="text-3xl font-bold" {...partyTextAttrs(list.name, locale)}>
              {partyText(list.name, locale)}
            </h1>
            {list.cec && (
              <p className="text-sm text-muted">
                <span dir="rtl" lang="he">{list.cec.listName.he}</span>
                {" · "}
                <a href={list.cec.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-accent-ink">
                  <span dir="rtl" lang="he" className="font-bold">{list.cec.letters}</span>{" "}
                  {list.cec.lettersStatus === "approved"
                    ? t("party.lettersApproved")
                    : t("election.lettersBadgeTitle", { date: approval ? formatDate(approval, locale) : "" })}
                </a>
              </p>
            )}
          </div>
        </div>
        {list.logo && (
          <p className="text-xs text-muted">
            <SourceLinks sources={[list.logo.source]} label={t("election.logoCredit")} />
          </p>
        )}
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          {list.leader && (
            <div>
              <div className="text-muted">{t("election.leader")}</div>
              <div className="font-semibold">
                {list.leaderPersonId != null ? (
                  <Link href={`/members/${list.leaderPersonId}`} className="text-accent-ink underline">
                    {partyText(list.leader, locale)}
                  </Link>
                ) : (
                  partyText(list.leader, locale)
                )}
              </div>
            </div>
          )}
          {list.website && (
            <div>
              <div className="text-muted">{t("election.officialSite")}</div>
              <a href={list.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-ink underline" dir="ltr">
                {new URL(list.website).hostname.replace(/^www\./, "")}
              </a>
            </div>
          )}
          {faction ? (
            <div>
              <div className="text-muted">{t("election.listFaction")}</div>
              <Link href={`/parties/${faction.id}`} className="font-semibold text-accent-ink underline">
                {factionName(faction.id, faction.nameHe, locale)} {arrow}
              </Link>
              {participation != null && (
                <div className="text-xs text-muted">{t("election.recordParticipation", { pct: formatNumber(participation, locale, 1) })}</div>
              )}
            </div>
          ) : (
            <div>
              <span className="inline-block rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium text-muted">{t("election.newList")}</span>
            </div>
          )}
          {surplus && (
            <div>
              <div className="text-muted">{t("election.surplusWith")}</div>
              <div className="font-semibold">
                {surplusOther ? (
                  <Link href={`/elections/${surplusOther.slug}`} className="text-accent-ink underline">
                    {partyText(surplusOther.name, locale)}
                  </Link>
                ) : (
                  surplus.between.join(" – ")
                )}
              </div>
              <SourceLinks sources={surplus.sources} label={t("common.source")} />
            </div>
          )}
        </div>
        {list.note && (
          <p className="text-sm leading-relaxed" {...partyTextAttrs(list.note, locale)}>
            {partyText(list.note, locale)}
          </p>
        )}
      </section>

      <section className="rounded-xl bg-surface p-6 shadow-sm space-y-2">
        <h2 className="text-xl font-semibold">{t("election.promises")}</h2>
        {list.promises ? (
          <>
            <ul className="list-disc space-y-1 ps-5 leading-relaxed">
              {list.promises.items.map((it, i) => (
                <li key={i} {...partyTextAttrs(it, locale)}>
                  {partyText(it, locale)}
                </li>
              ))}
            </ul>
            <SourceLinks sources={[list.promises.source]} label={t("common.source")} />
          </>
        ) : (
          <p className="text-muted">{t("election.promisesNone")}</p>
        )}
        <p className="text-xs text-muted">{t("election.promisesRule")}</p>
      </section>

      <section className="rounded-xl bg-surface p-6 shadow-sm space-y-3">
        <h2 className="text-xl font-semibold">{t("polls.title")}</h2>
        {avg ? (
          <p>
            <span className="font-semibold">{t("polls.averageTitle")}: </span>
            <span className="text-2xl font-bold tabular-nums">{formatNumber(avg.mean, locale, 1)}</span>{" "}
            <span className="text-sm text-muted">{t("polls.averageRange", { min: avg.min, max: avg.max })}</span>{" "}
            <Link href="/elections#polls" className="text-sm text-accent-ink underline">
              {t("polls.methodologyTitle")}
            </Link>
          </p>
        ) : (
          <p className="text-muted">{t("election.listPollsNone")}</p>
        )}
        {polls.length > 0 && (
          <details>
          <summary className="cursor-pointer text-sm font-medium text-accent-ink">{t("polls.allTitle", { count: polls.length })}</summary>
          <TableFrame className="mt-2">
            <table className="w-full text-sm">
              <thead className="text-start text-xs text-muted">
                <tr>
                  <th className="p-2 text-start font-medium">{t("polls.colDate")}</th>
                  <th className="p-2 text-start font-medium">{t("polls.colOutlet")}</th>
                  <th className="hidden p-2 text-start font-medium sm:table-cell">{t("polls.colInstitute")}</th>
                  <th className="p-2 text-end font-medium">{t("election.listSeats")}</th>
                </tr>
              </thead>
              <tbody>
                {polls.map((p) => {
                  const seats = p.seats[slug];
                  const below = p.belowThreshold.includes(slug);
                  return (
                    <tr key={p.id} className="border-t border-line">
                      <td className="p-2 whitespace-nowrap">{formatDate(p.published, locale)}</td>
                      <td className="p-2">
                        <a href={p.sources[0].url} target="_blank" rel="noopener noreferrer" className="underline hover:text-accent-ink" {...partyTextAttrs(p.outlet, locale)}>
                          {partyText(p.outlet, locale)}
                        </a>
                      </td>
                      <td className="hidden p-2 sm:table-cell" {...partyTextAttrs(p.institute, locale)}>{partyText(p.institute, locale)}</td>
                      <td className="p-2 text-end font-semibold tabular-nums">
                        {seats != null ? seats : below ? <span className="font-normal text-muted">{t("polls.below")}</span> : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableFrame>
          </details>
        )}
      </section>

      <section className="rounded-xl bg-surface p-6 shadow-sm space-y-3">
        <h2 className="text-xl font-semibold">{t("election.listCompass")}</h2>
        <ol className="divide-y divide-line">
          {questions.map((q, i) => {
            const s = q.stances[slug];
            return (
              <li key={q.id} className="space-y-0.5 py-2 text-sm">
                <p className="font-medium">
                  <span className="me-2 text-muted tabular-nums">{i + 1}.</span>
                  {partyText(q.text, locale)}
                </p>
                {s ? (
                  <p className="text-xs text-muted">
                    <span className="font-semibold text-foreground">{t(`quiz.opt.${STANCE_KEY[s.value as keyof typeof STANCE_KEY]}`)}</span>
                    {" · "}
                    {t(`quiz.basis.${s.basis}`)}
                    {" · "}
                    <SourceLinks sources={[s.source, ...(s.moreSources ?? [])]} label={t("common.source")} />
                  </p>
                ) : (
                  <p className="text-xs text-muted">{t("positions.noStance")}</p>
                )}
              </li>
            );
          })}
        </ol>
        <p className="text-sm">
          <Link href={`/elections/positions?list=${slug}`} className="text-accent-ink underline">
            {t("positions.title")}
          </Link>
          {" · "}
          <Link href="/quiz" className="text-accent-ink underline">
            {t("positions.toCompass")}
          </Link>
        </p>
      </section>

      {list.candidates && list.candidates.length > 0 && (
        <section className="rounded-xl bg-surface p-6 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold">
            {t("election.candidates")} <span className="text-base font-normal text-muted tabular-nums">({list.candidates.length})</span>
          </h2>
          <ol className="columns-2 gap-x-6 ps-5 text-sm leading-relaxed sm:columns-3 [&>li]:break-inside-avoid" dir="rtl" lang="he">
            {list.candidates.map((c, i) => (
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
          {list.cec && (
            <a href={list.cec.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-ink underline">
              {t("party.cecPage")}
            </a>
          )}
        </section>
      )}

      {updates.length > 0 && (
        <section className="rounded-xl bg-surface p-6 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold">{t("party.updates")}</h2>
          <ul className="space-y-3">
            {updates.map((u, i) => (
              <li key={i} className="space-y-1 text-sm">
                <div className="text-xs text-muted">{formatDate(u.date, locale)}</div>
                <p className="leading-relaxed" {...partyTextAttrs(u.text, locale)}>{partyText(u.text, locale)}</p>
                <SourceLinks sources={u.sources} label={t("common.source")} />
              </li>
            ))}
          </ul>
          {faction && (
            <Link href={`/parties/${faction.id}`} className="text-sm text-accent-ink underline">
              {t("election.listAllUpdates")} {arrow}
            </Link>
          )}
        </section>
      )}

      <p className="text-xs text-muted">
        <SourceLinks sources={list.sources} label={t("common.source")} />
        {" · "}
        <span {...rtlAttrs(t("election.lastReviewed", { date: formatDate(outlook?.lastReviewed ?? "", locale) }))}>
          {t("election.lastReviewed", { date: formatDate(outlook?.lastReviewed ?? "", locale) })}
        </span>
      </p>
    </div>
  );
}

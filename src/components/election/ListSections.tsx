import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SourceLinks } from "@/components/SourceLinks";
import { TableFrame } from "@/components/ui/TableFrame";
import { candidateName, getPolls, getQuizFile, getRunningLists, partyText, partyTextAttrs } from "@/lib/content";
import { localizeData } from "@/lib/i18n-data";
import { formatDate, formatNumber } from "@/lib/format";
import { pollOfPolls } from "@/lib/polls";
import { PollBlackoutNotice } from "@/components/polls/PollBlackoutNotice";
import { rtlAttrs } from "@/lib/text";

const STANCE_KEY = { 2: "agree2", 1: "agree1", 0: "neutral", [-1]: "disagree1", [-2]: "disagree2" } as const;

// A running list's election sections: what it promises, where the polls put
// it, where it stands on the compass statements, who is on it. Rendered on the
// list's own page and, when the list continues a sitting faction, on that
// faction's page — one page per party.
export async function ListSections({ slug }: { slug: string }) {
  const list = getRunningLists().get(slug);
  if (!list) return null;
  const t = await getTranslations();
  const locale = await getLocale();
  const polls = [...(getPolls()?.polls ?? [])].sort((a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id));
  const avg = pollOfPolls(polls, [slug])?.lists[0];
  const questions = getQuizFile().questions;
  // The site's transliterations of names with no official spelling (never
  // machine-translated, so no lazy translation is queued for them).
  const names = localizeData((list.candidates ?? []).map((c) => c.he), locale);

  return (
    <>
  <section className="rounded-xl bg-surface p-6 shadow-sm space-y-2">
    <h2 className="text-xl font-semibold">{t("election.promises")}</h2>
    {list.promises ? (
      <>
        {list.promises.note && (
          <p className="text-sm text-muted" {...partyTextAttrs(list.promises.note, locale)}>
            {partyText(list.promises.note, locale)}
          </p>
        )}
        <ul className="list-disc space-y-1 ps-5 leading-relaxed">
          {list.promises.items.map((it, i) => (
            <li key={i} {...partyTextAttrs(it, locale)}>
              {partyText(it, locale)}
            </li>
          ))}
        </ul>
        <SourceLinks sources={list.promises.sources} label={t("common.source")} />
      </>
    ) : (
      <p className="text-muted">{t("election.promisesNone")}</p>
    )}
    <p className="text-xs text-muted">{t("election.promisesRule")}</p>
  </section>

  <section className="rounded-xl bg-surface p-6 shadow-sm space-y-3">
    <h2 className="text-xl font-semibold">{t("polls.title")}</h2>
    <PollBlackoutNotice />
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
      <ol className="columns-2 gap-x-6 ps-5 text-sm leading-relaxed sm:columns-3 [&>li]:break-inside-avoid">
        {list.candidates.map((c, i) => (
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
      {locale !== "he" && <p className="text-xs text-muted">{t("election.namesTransliterated")}</p>}
      {list.cec && (
        <a href={list.cec.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-ink underline">
          {t("party.cecPage")}
        </a>
      )}
    </section>
  )}
    </>
  );
}

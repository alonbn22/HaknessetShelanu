import { Fragment } from "react";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rtlLocales } from "@/i18n/routing";
import { getFactionMeta, getQuizFile, getRunningLists, listName, partyText, partyTextAttrs, type QuizStance, publisherName } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { cx } from "@/lib/cx";
import { rtlAttrs } from "@/lib/text";
import { Card } from "@/components/ui/Card";
import { TableFrame } from "@/components/ui/TableFrame";
import { ToggleGroup } from "@/components/ui/ToggleGroup";
import { ToggleLink } from "@/components/ui/ToggleLink";

export const dynamic = "force-dynamic";

// The compass's transparency page and a comparison tool in its own right:
// every running list × every statement, each cell the stance with its source.
// Pick a list to read its stances in full (quote, basis, source); the whole
// matrix sits below on wider screens. "—" is "no stated position" — never a
// default.

// Short, colour-blind-safe labels for the -2..+2 scale (a legend explains them).
// Agree/disagree are not pass/fail: the two sides get non-valenced treatments
// (a filled accent chip vs. an outlined one), "neither" a neutral one.
const CELL: Record<number, { key: "agree2" | "agree1" | "neutral" | "disagree1" | "disagree2"; cls: string }> = {
  2: { key: "agree2", cls: "bg-accent-soft text-accent-ink" },
  1: { key: "agree1", cls: "bg-accent-soft text-accent-ink" },
  0: { key: "neutral", cls: "bg-neutral-soft text-neutral-ink" },
  [-1]: { key: "disagree1", cls: "border border-line-strong text-foreground" },
  [-2]: { key: "disagree2", cls: "border border-line-strong text-foreground" },
};

// Quotes from platforms already carry their own quotation marks; a bare
// statement gets ours. A vote tally is a record, not a quotation — none.
const quoted = (q: string, basis?: string) => (basis === "vote" || /["“„«]/.test(q) ? q : `“${q}”`);

export default async function PositionsPage({ searchParams }: { searchParams: Promise<{ list?: string }> }) {
  const t = await getTranslations("positions");
  const tq = await getTranslations("quiz");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const arrow = rtlLocales.has(locale) ? "←" : "→";
  const file = getQuizFile();
  const registry = getRunningLists();
  const lists = [...registry.values()];
  const factionColor = new Map([...getFactionMeta().values()].map((f) => [f.id, f.color]));
  const colorOf = (slug: string) => {
    const l = registry.get(slug);
    return (l?.factionId != null && factionColor.get(l.factionId)) || l?.color || "var(--neutral)";
  };
  const params = await searchParams;
  const chosen = params.list && registry.has(params.list) ? registry.get(params.list)! : null;

  const short = (s: QuizStance | undefined) => (s ? tq(`opt.${CELL[s.value].key}`) : "—");
  const basisOf = (s: QuizStance) => `${tq(`basis.${s.basis}`)}${s.recordOf ? ` — ${partyText(s.recordOf, locale)}` : ""}`;
  const Cell = ({ s }: { s: QuizStance | undefined }) =>
    s ? (
      <a
        href={s.source.url}
        target="_blank"
        rel="noopener noreferrer"
        title={`${basisOf(s)} · ${s.source.title}`}
        className={cx("inline-block rounded-chip px-1.5 py-0.5 text-xs font-medium underline underline-offset-2", CELL[s.value].cls)}
      >
        {short(s)}
      </a>
    ) : (
      <abbr title={t("noStance")} className="text-muted no-underline">
        —
      </abbr>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">{t("title")}</h1>
        <p className="max-w-prose text-muted">{t("subtitle")}</p>
      </div>

      {/* Choose a list to read its stances in full. */}
      <ToggleGroup label={t("choose")}>
        <span className="text-sm text-muted">{t("choose")}</span>
        {lists.map((l) => (
          <ToggleLink key={l.slug} href={{ pathname: "/elections/positions", query: { list: l.slug } }} selected={chosen?.slug === l.slug}>
            <span aria-hidden className="me-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: colorOf(l.slug) }} />
            {listName(l, locale)}
          </ToggleLink>
        ))}
      </ToggleGroup>

      {chosen && (
        <Card as="section" padding="md" className="space-y-4" aria-label={listName(chosen, locale)}>
          <h2 className="text-xl font-semibold">{listName(chosen, locale)}</h2>
          <ol className="divide-y divide-line">
            {file.questions.map((q, i) => {
              const s = q.stances[chosen.slug];
              return (
                <li key={q.id} className="space-y-1 py-3 text-sm">
                  <p className="font-medium">
                    <span className="me-2 text-muted tabular-nums">{i + 1}.</span>
                    {partyText(q.text, locale)}
                  </p>
                  {s ? (
                    <>
                      <p>
                        <Cell s={s} /> <span className="text-xs text-muted">({basisOf(s)})</span>
                      </p>
                      <p className="text-xs text-muted" {...partyTextAttrs(s.quote, locale)}>{quoted(partyText(s.quote, locale), s.basis)}</p>
                      <p className="text-xs text-muted">
                        {tc("source")}:{" "}
                        {[s.source, ...(s.moreSources ?? [])].map((src, k) => (
                          <Fragment key={src.url}>
                            {k > 0 && " · "}
                            <a href={src.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-accent-ink" {...rtlAttrs(publisherName(src.publisher, locale) ?? src.title)}>
                              {publisherName(src.publisher, locale) ?? src.title}
                            </a>
                          </Fragment>
                        ))}
                        {s.voteId != null && (
                          <>
                            {" · "}
                            <Link href={`/votes/${s.voteId}`} className="underline hover:text-accent-ink">
                              {tq("voteRecord")}
                            </Link>
                          </>
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted">{t("noStance")}</p>
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      {/* The whole matrix (wider screens). Columns in registry order. */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("matrixTitle")}</h2>
        <p className="text-xs text-muted">{t("legend")}</p>
        <TableFrame className="hidden md:block">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken text-xs text-muted">
              <tr>
                <th scope="col" className="sticky start-0 bg-surface-sunken px-3 py-2 text-start font-medium">{t("colStatement")}</th>
                {lists.map((l) => (
                  <th key={l.slug} scope="col" className="px-2 py-2 text-center font-medium">
                    <span className="inline-flex items-center gap-1">
                      <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: colorOf(l.slug) }} />
                      {listName(l, locale)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {file.questions.map((q, i) => (
                <tr key={q.id}>
                  <th scope="row" className="sticky start-0 min-w-[16rem] max-w-[22rem] bg-surface px-3 py-2 text-start font-medium">
                    <span className="me-1 text-muted tabular-nums">{i + 1}.</span>
                    {partyText(q.text, locale)}
                  </th>
                  {lists.map((l) => (
                    <td key={l.slug} className="px-2 py-2 text-center">
                      <Cell s={q.stances[l.slug]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </TableFrame>
        <p className="text-xs text-muted md:hidden">{t("matrixPhone")}</p>
      </section>

      <p className="text-sm">
        <Link href="/quiz" className="text-accent-ink underline">
          {t("toCompass")} {arrow}
        </Link>
      </p>
      <p className="text-xs text-muted">
        {t("method")} {tq("lastReviewed", { date: formatDate(file.lastReviewed, locale) })}
      </p>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cx } from "@/lib/cx";
import { Button } from "@/components/ui/Button";
import { ToggleButton, ToggleGroup } from "@/components/ui/ToggleGroup";
import { MIN_ANSWERS, MIN_COVERAGE } from "@/lib/quiz";

// Everything the compass needs, localized on the server. A list absent from a
// question's `stances` has no sourced position on it and is compared on the
// other questions only — never scored as neutral.
export type QuizStanceView = {
  value: number;
  basis: "vote" | "platform" | "statement";
  voteId?: number;
  /** Whose vote it was, when cast by a predecessor faction. */
  recordOf?: string;
  url: string;
  publisher: string;
  publisherRtl: boolean;
  quote: string;
};
export type QuizQ = { id: string; text: string; short: string; explainer: string; stances: Record<string, QuizStanceView> };
export type QuizList = { slug: string; name: string; color: string; href?: string };

// The reader's scale is the lists' scale: -2..+2. "skip" is a real choice that
// leaves the question out of the comparison; "neither" (0) is a position.
const OPTIONS = [
  { key: "agree2", value: 2 },
  { key: "agree1", value: 1 },
  { key: "neutral", value: 0 },
  { key: "disagree1", value: -1 },
  { key: "disagree2", value: -2 },
] as const;


export function PartyQuiz({ questions, lists }: { questions: QuizQ[]; lists: QuizList[] }) {
  const t = useTranslations("quiz");
  const [answers, setAnswers] = useState<Record<string, number | "skip">>({});
  const [important, setImportant] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const answered = questions.filter((q) => typeof answers[q.id] === "number");
  const canSubmit = answered.length >= MIN_ANSWERS;

  const results = useMemo(() => {
    const scored = lists.map((l) => {
      let weightSum = 0;
      let agreementSum = 0;
      const rows: { q: QuizQ; you: number; stance: QuizStanceView | null; agreement: number | null; important: boolean }[] = [];
      for (const q of answered) {
        const you = answers[q.id] as number;
        const stance = q.stances[l.slug] ?? null;
        const imp = !!important[q.id];
        if (!stance) {
          rows.push({ q, you, stance: null, agreement: null, important: imp });
          continue;
        }
        const w = imp ? 2 : 1;
        const agreement = (4 - Math.abs(you - stance.value)) / 4; // 1 = identical, 0 = opposite ends
        agreementSum += agreement * w;
        weightSum += w;
        rows.push({ q, you, stance, agreement, important: imp });
      }
      const compared = rows.filter((r) => r.stance).length;
      return {
        ...l,
        score: weightSum ? agreementSum / weightSum : null,
        compared,
        rows,
      };
    });
    // Deterministic, locale-independent: unrounded score, then slug (plain
    // code-point order, not a collator). A list compared on too few of the
    // answered statements ranks after the fully compared ones — one stance
    // must not put a list first at 100% — and lists with nothing to compare
    // stay at the end, visible, rather than vanishing.
    const bySlug = (a: { slug: string }, b: { slug: string }) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);
    const minCompared = Math.ceil(answered.length * MIN_COVERAGE);
    const byScore = (a: { score: number | null }, b: { score: number | null }) => b.score! - a.score!;
    const full = scored.filter((s) => s.score != null && s.compared >= minCompared).sort((a, b) => byScore(a, b) || bySlug(a, b));
    const thin = scored.filter((s) => s.score != null && s.compared < minCompared).sort((a, b) => byScore(a, b) || bySlug(a, b));
    return [...full, ...thin, ...scored.filter((s) => s.score == null).sort(bySlug)];
  }, [answers, important, answered, lists]);

  const label = (v: number) => t(`opt.${OPTIONS.find((o) => o.value === v)?.key ?? "neutral"}`);
  const basisLabel = (b: QuizStanceView["basis"]) => t(`basis.${b}`);

  function reset() {
    setAnswers({});
    setImportant({});
    setSubmitted(false);
  }

  return (
    <div className="space-y-8">
      <ol className="space-y-4">
        {questions.map((q, i) => {
          const a = answers[q.id];
          return (
            <li key={q.id} className="rounded-card border border-line bg-surface p-4 sm:p-5">
              <p className="font-medium leading-snug">
                <span className="me-2 text-muted tabular-nums">{i + 1}.</span>
                {q.text}
              </p>
              {/* What the statement is about, in plain words — folded so the
                  question stays a question, one click from its background. */}
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-accent-ink">{t("whatIsThis")}</summary>
                <p className="mt-1 max-w-prose leading-relaxed text-muted">{q.explainer}</p>
              </details>
              <ToggleGroup label={q.text} className="mt-3">
                {OPTIONS.map((o) => (
                  <ToggleButton key={o.key} selected={a === o.value} onClick={() => setAnswers((p) => ({ ...p, [q.id]: o.value }))}>
                    {t(`opt.${o.key}`)}
                  </ToggleButton>
                ))}
                <ToggleButton selected={a === "skip"} className="text-muted" onClick={() => setAnswers((p) => ({ ...p, [q.id]: "skip" }))}>
                  {t("opt.skip")}
                </ToggleButton>
              </ToggleGroup>
              <label className="mt-3 inline-flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={!!important[q.id]} onChange={(e) => setImportant((p) => ({ ...p, [q.id]: e.target.checked }))} />
                {t("important")}
              </label>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!canSubmit} onClick={() => setSubmitted(true)}>
          {t("seeResults")}
        </Button>
        <Button variant="ghost" onClick={reset}>
          {t("reset")}
        </Button>
        <span className="text-sm text-muted" aria-live="polite">
          {t("answered", { count: answered.length, total: questions.length })}
          {!canSubmit && <> · {t("needMore", { min: MIN_ANSWERS })}</>}
        </span>
      </div>

      {submitted && canSubmit && (
        <section className="space-y-3" aria-live="polite">
          <h2 className="text-xl font-semibold">{t("resultsTitle")}</h2>
          <p className="max-w-prose text-sm text-muted">{t("resultsHow", { n: answered.length })}</p>
          <ol className="space-y-2">
            {results.map((r, i) => {
              if (r.score == null) {
                return (
                  <li key={r.slug} className="rounded-card border border-dashed border-line px-3 py-2 text-sm text-muted">
                    <span className="flex items-center gap-2">
                      <span aria-hidden className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
                      <span className="font-medium">{r.name}</span>
                      <span>— {t("noStanceAtAll")}</span>
                    </span>
                  </li>
                );
              }
              const pct = Math.round(r.score * 100);
              const thin = r.compared < Math.ceil(answered.length * MIN_COVERAGE);
              return (
                <li key={r.slug} className={cx("rounded-card border border-line bg-surface", thin && "opacity-70")}>
                  <div className="grid grid-cols-[1.5rem_1fr_3.5rem] items-center gap-x-3 p-3 sm:grid-cols-[1.5rem_minmax(8rem,14rem)_1fr_3.5rem]">
                    <span className="text-center text-muted tabular-nums">{i + 1}</span>
                    <span className="flex min-w-0 items-center gap-2">
                      <span aria-hidden className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
                      {r.href ? (
                        <Link href={r.href} className="truncate font-medium hover:underline">
                          {r.name}
                        </Link>
                      ) : (
                        <span className="truncate font-medium">{r.name}</span>
                      )}
                    </span>
                    <span className="col-span-3 mt-1 block h-2 overflow-hidden rounded-full bg-surface-sunken sm:col-span-1 sm:mt-0">
                      <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: r.color }} />
                    </span>
                    <span className="col-start-3 row-start-1 text-end font-semibold tabular-nums sm:col-start-4">{pct}%</span>
                    <span className="col-span-3 text-xs text-muted sm:col-span-4">
                      {t("comparedOn", { k: r.compared, n: answered.length })}
                      {thin && <> · {t("thinCoverage")}</>}
                    </span>
                  </div>
                  {/* The answer to "why?" in one line, no click needed: which
                      statements you and the list agree on, part-agree on,
                      differ on, and where it has no documented stance. */}
                  <p className="border-t border-line px-3 py-2 text-sm leading-relaxed">
                    {(
                      [
                        ["agreeOn", r.rows.filter((row) => row.agreement != null && row.agreement >= 0.75)],
                        ["partlyOn", r.rows.filter((row) => row.agreement != null && row.agreement > 0.25 && row.agreement < 0.75)],
                        ["differOn", r.rows.filter((row) => row.agreement != null && row.agreement <= 0.25)],
                        ["noStanceOn", r.rows.filter((row) => row.agreement == null)],
                      ] as const
                    )
                      .filter(([, rows]) => rows.length > 0)
                      .map(([key, rows], j) => (
                        <span key={key}>
                          {j > 0 && " · "}
                          <span className="font-medium">{t(key)}:</span> {rows.map((row) => row.q.short).join(", ")}
                        </span>
                      ))}
                  </p>
                  <details className="border-t border-line px-3 py-2 text-sm">
                    <summary className="cursor-pointer font-medium text-accent-ink">{t("why")}</summary>
                    <ul className="mt-2 space-y-2">
                      {r.rows.map((row) => (
                        <li key={row.q.id} className="flex gap-2">
                          <span
                            aria-hidden
                            className={cx(
                              "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                              row.agreement == null ? "bg-neutral" : row.agreement >= 0.75 ? "bg-pass" : row.agreement <= 0.25 ? "bg-fail" : "bg-warn",
                            )}
                          />
                          <span className="min-w-0">
                            <span>{row.q.text}</span>
                            {row.important && <span className="ms-1 text-xs text-accent-ink">★</span>}
                            <span className="mt-0.5 block text-xs text-muted">
                              {t("youSaid")}: {label(row.you)} · {t("listStance")}:{" "}
                              {row.stance ? (
                                <>
                                  {label(row.stance.value)} ({basisLabel(row.stance.basis)}
                                  {row.stance.recordOf && <> — {row.stance.recordOf}</>}
                                  {row.stance.voteId != null && (
                                    <>
                                      {" · "}
                                      <Link href={`/votes/${row.stance.voteId}`} className="underline">
                                        {t("voteRecord")}
                                      </Link>
                                    </>
                                  )}
                                  {" · "}
                                  <a
                                    href={row.stance.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline"
                                    dir={row.stance.publisherRtl ? "rtl" : undefined}
                                    lang={row.stance.publisherRtl ? "he" : undefined}
                                  >
                                    {row.stance.publisher}
                                  </a>
                                  )
                                </>
                              ) : (
                                <span>{t("noStance")}</span>
                              )}
                            </span>
                            {row.stance?.quote && (
                              <span className="mt-0.5 block text-xs text-muted">{/["“„«]/.test(row.stance.quote) ? row.stance.quote : `“${row.stance.quote}”`}</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              );
            })}
          </ol>
          {/* Why the results came out this way — the method in plain words,
              at the end, where the reader asks. */}
          <div className="rounded-card border border-line bg-surface-sunken p-4 text-sm leading-relaxed">
            <h3 className="font-semibold">{t("explainTitle")}</h3>
            <ul className="mt-2 list-disc space-y-1 ps-5">
              <li>{t("explainScore")}</li>
              <li>{t("explainImportant")}</li>
              <li>{t("explainNoStance")}</li>
              <li>{t("explainThin")}</li>
              <li>{t("explainSources")}</li>
              <li>{t("explainNotAdvice")}</li>
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

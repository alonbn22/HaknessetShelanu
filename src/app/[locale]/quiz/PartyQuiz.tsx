"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export type QuizQ = { id: string; text: string; stances: Record<number, number> };
export type QuizFaction = { id: number; name: string; color: string; ballot: string | null };

// Answer scale maps a label to a stance value on the same -2..+2 axis as parties.
const OPTIONS = [
  { key: "agree2", value: 2 },
  { key: "agree1", value: 1 },
  { key: "neutral", value: 0 },
  { key: "disagree1", value: -1 },
  { key: "disagree2", value: -2 },
] as const;

export function PartyQuiz({
  questions,
  factions,
}: {
  questions: QuizQ[];
  factions: QuizFaction[];
}) {
  const t = useTranslations("quiz");
  // answers: questionId -> stance value (or "skip"); important: questionId set
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [important, setImportant] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const answeredCount = Object.keys(answers).length;

  const results = useMemo(() => {
    const scored = factions.map((f) => {
      let weightSum = 0;
      let agreementSum = 0;
      const breakdown: {
        text: string;
        you: number;
        party: number;
        agreement: number;
        important: boolean;
      }[] = [];
      for (const q of questions) {
        const u = answers[q.id];
        const p = q.stances[f.id];
        if (u === undefined || p === undefined) continue; // skipped / no stance
        const imp = !!important[q.id];
        const w = imp ? 2 : 1;
        // distance 0..4 → agreement 1..0
        const agreement = (4 - Math.abs(u - p)) / 4;
        agreementSum += agreement * w;
        weightSum += w;
        breakdown.push({ text: q.text, you: u, party: p, agreement, important: imp });
      }
      // Sort the explanation: strongest agreements first, biggest gaps last.
      breakdown.sort((a, b) => b.agreement - a.agreement);
      return {
        ...f,
        pct: weightSum ? Math.round((agreementSum / weightSum) * 100) : 0,
        weightSum,
        breakdown,
      };
    });
    return scored
      .filter((s) => s.weightSum > 0)
      .sort((a, b) => b.pct - a.pct);
  }, [answers, important, questions, factions]);

  // Map a stance value back to its answer label for the explanation.
  const stanceLabel = (v: number) =>
    t(`opt.${OPTIONS.find((o) => o.value === v)?.key ?? "neutral"}`);

  function reset() {
    setAnswers({});
    setImportant({});
    setSubmitted(false);
  }

  return (
    <div className="space-y-6">
      <ol className="space-y-4">
        {questions.map((q, i) => (
          <li key={q.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-start gap-2">
              <span className="text-muted tabular-nums">{i + 1}.</span>
              <p className="font-medium leading-snug">{q.text}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {OPTIONS.map((o) => {
                const active = answers[q.id] === o.value;
                return (
                  <button
                    key={o.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [q.id]: o.value }))
                    }
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-accent text-white"
                        : "bg-black/5 text-foreground hover:bg-black/10"
                    }`}
                  >
                    {t(`opt.${o.key}`)}
                  </button>
                );
              })}
              {answers[q.id] !== undefined && (
                <button
                  type="button"
                  onClick={() =>
                    setAnswers((prev) => {
                      const next = { ...prev };
                      delete next[q.id];
                      return next;
                    })
                  }
                  className="rounded-full px-3 py-1.5 text-sm text-muted hover:bg-black/5"
                >
                  {t("opt.clear")}
                </button>
              )}
            </div>
            <label className="mt-2 inline-flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={!!important[q.id]}
                onChange={(e) =>
                  setImportant((prev) => ({ ...prev, [q.id]: e.target.checked }))
                }
              />
              {t("important")}
            </label>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={answeredCount === 0}
          onClick={() => setSubmitted(true)}
          className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white disabled:opacity-40"
        >
          {t("seeResults")}
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-black/5 px-4 py-2.5 text-sm hover:bg-black/10"
        >
          {t("reset")}
        </button>
        <span className="text-sm text-muted">
          {t("answered", { count: answeredCount, total: questions.length })}
        </span>
      </div>

      {submitted && results.length > 0 && (
        <section className="space-y-3" aria-live="polite">
          <h2 className="text-xl font-semibold">{t("resultsTitle")}</h2>
          <ol className="space-y-2">
            {results.map((r, i) => (
              <li key={r.id} className="rounded-xl bg-white shadow-sm">
                <div className="flex items-center gap-3 p-3">
                  <span className="w-5 text-center text-muted tabular-nums">{i + 1}</span>
                  <span
                    className="inline-block h-4 w-4 shrink-0 rounded-sm"
                    style={{ backgroundColor: r.color }}
                  />
                  <Link
                    href={`/parties/${r.id}`}
                    className="min-w-0 flex-1 truncate font-medium hover:underline"
                  >
                    {r.name}
                    {r.ballot && (
                      <span className="ms-2 text-xs text-muted" dir="rtl" lang="he">
                        {r.ballot}
                      </span>
                    )}
                  </Link>
                  <div className="hidden sm:block w-32 h-2 rounded-full bg-black/5" dir="ltr">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${r.pct}%`, backgroundColor: r.color }}
                    />
                  </div>
                  <span className="w-12 text-end font-bold tabular-nums text-accent">
                    {r.pct}%
                  </span>
                </div>
                <details className="border-t border-black/5 px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium text-accent">
                    {t("why")}
                  </summary>
                  <ul className="mt-2 space-y-2">
                    {r.breakdown.map((b, j) => {
                      const tone =
                        b.agreement >= 0.75
                          ? "bg-green-600"
                          : b.agreement <= 0.25
                            ? "bg-red-600"
                            : "bg-amber-500";
                      return (
                        <li key={j} className="flex gap-2 text-sm">
                          <span
                            aria-hidden
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone}`}
                          />
                          <span className="min-w-0">
                            <span className="text-foreground/80">{b.text}</span>
                            {b.important && (
                              <span className="ms-1 text-xs text-accent">★</span>
                            )}
                            <span className="mt-0.5 block text-xs text-muted">
                              {t("youSaid")}: {stanceLabel(b.you)} · {t("partyStance")}:{" "}
                              {stanceLabel(b.party)}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted">{t("matchNote")}</p>
        </section>
      )}
    </div>
  );
}

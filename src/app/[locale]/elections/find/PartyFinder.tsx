"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ToggleButton, ToggleGroup } from "@/components/ui/ToggleGroup";

// Everything is localized on the server. A filter is one question with a few
// answers (supports / opposes, or right / left); a list sits under an answer
// only where its own words — platform, leader, Knesset vote, its own name or
// site — put it there. Choices live in this component's state only: never
// stored, never in the URL, never sent (tests/qa/privacy.test.ts keeps it that
// way).
export type Evidence = { quote: string; sources: { url: string; publisher: string; rtl: boolean }[] };
// `claim`: the line a match shows above its quote (default "answer: question").
export type FinderOption = { id: string; label: string; lists: Record<string, Evidence>; claim?: string };
// `overlap`: the answers can go together (Zionist and national), so a list
// that gave another one doesn't differ — it just didn't say the one chosen.
export type FinderFilter = { id: string; group: string; label: string; options: FinderOption[]; said: string[]; overlap?: boolean };
export type FinderGroup = { id: string; label: string; note?: string };
export type FinderList = { slug: string; name: string; href: string };

type Outcome = { slug: string; claims: { filter: FinderFilter; option: FinderOption; ev: Evidence }[]; unsaid: string[] };

export function PartyFinder({ groups, filters, lists }: { groups: FinderGroup[]; filters: FinderFilter[]; lists: FinderList[] }) {
  const t = useTranslations("finder");
  const [chosen, setChosen] = useState<Record<string, string[]>>({});
  const active = filters.filter((f) => (chosen[f.id] ?? []).length > 0);

  const toggle = (filterId: string, optionId: string) =>
    setChosen((c) => {
      const cur = c[filterId] ?? [];
      return { ...c, [filterId]: cur.includes(optionId) ? cur.filter((o) => o !== optionId) : [...cur, optionId] };
    });

  // A list matches when, on every chosen filter, its own words put it under
  // one of the chosen answers. No stated position → "didn't say", listed apart,
  // never counted either way. Registry order throughout, never by result.
  const { matches, partial, differ } = useMemo(() => {
    const matches: Outcome[] = [];
    const partial: Outcome[] = [];
    let differ = 0;
    for (const l of lists) {
      const out: Outcome = { slug: l.slug, claims: [], unsaid: [] };
      let mismatch = false;
      for (const f of active) {
        const picked = f.options.filter((o) => chosen[f.id].includes(o.id));
        const hits = picked.filter((o) => o.lists[l.slug]);
        if (hits.length) for (const o of hits) out.claims.push({ filter: f, option: o, ev: o.lists[l.slug] });
        else if (f.said.includes(l.slug) && !f.overlap) mismatch = true;
        else out.unsaid.push(f.overlap ? picked.map((o) => o.label).join(" / ") : f.label);
      }
      if (mismatch) differ++;
      else if (out.unsaid.length === 0) matches.push(out);
      else partial.push(out);
    }
    return { matches, partial, differ };
  }, [lists, active, chosen]);

  const byGroup = groups.map((g) => ({ g, filters: filters.filter((f) => f.group === g.id) })).filter((x) => x.filters.length > 0);
  const listOf = new Map(lists.map((l) => [l.slug, l]));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        {byGroup.map(({ g, filters: fs }) => (
          <section key={g.id} className="space-y-3" aria-labelledby={`g-${g.id}`}>
            <h2 id={`g-${g.id}`} className="text-lg font-semibold">
              {g.label}
            </h2>
            {g.note && <p className="max-w-prose text-sm text-muted">{g.note}</p>}
            <ul className="space-y-3">
              {fs.map((f) => (
                <li key={f.id} className="space-y-1.5">
                  <p className="text-sm font-medium">{f.label}</p>
                  <ToggleGroup label={f.label}>
                    {f.options.map((o) => (
                      <ToggleButton key={o.id} selected={(chosen[f.id] ?? []).includes(o.id)} onClick={() => toggle(f.id, o.id)}>
                        {o.label}
                      </ToggleButton>
                    ))}
                  </ToggleGroup>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="space-y-4 lg:sticky lg:top-20 lg:self-start" aria-labelledby="finder-results">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="finder-results" className="text-lg font-semibold">
            {t("resultsTitle")}
          </h2>
          {active.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setChosen({})}>
              {t("clear")}
            </Button>
          )}
        </div>
        <div className="space-y-4">
          {/* The live region is the one-line count, which is always mounted: a
              region around every card re-read all their quotes on each tick. */}
          <p aria-live="polite" className={active.length === 0 ? "text-muted" : "font-medium"}>
            {active.length === 0 ? t("noChoices") : t("resultsCount", { count: matches.length })}
          </p>
          {active.length > 0 && (
            <>
              <ul className="space-y-3">
                {matches.map((m) => {
                  const l = listOf.get(m.slug)!;
                  return (
                    <li key={m.slug}>
                      <Card padding="sm" className="space-y-2">
                        <Link href={l.href} className="font-semibold text-accent-ink underline">
                          {l.name}
                        </Link>
                        <ul className="space-y-2 text-sm">
                          {m.claims.map(({ filter, option, ev }) => (
                            <li key={`${filter.id}/${option.id}`}>
                              <p className="font-medium">{option.claim ?? `${option.label}: ${filter.label}`}</p>
                              <p className="text-muted">{ev.quote}</p>
                              <p className="text-xs text-muted">
                                {t("source")}:{" "}
                                {ev.sources.map((s, i) => (
                                  <span key={s.url}>
                                    {i > 0 && " · "}
                                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline" dir={s.rtl ? "rtl" : undefined} lang={s.rtl ? "he" : undefined}>
                                      {s.publisher}
                                    </a>
                                  </span>
                                ))}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    </li>
                  );
                })}
              </ul>
              {partial.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">{t("didntSayTitle")}</h3>
                  <ul className="space-y-1 text-sm">
                    {partial.map((p) => {
                      const l = listOf.get(p.slug)!;
                      return (
                        <li key={p.slug}>
                          <Link href={l.href} className="underline">
                            {l.name}
                          </Link>{" "}
                          <span className="text-muted">— {t("didntSayOn", { items: p.unsaid.join(" · ") })}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {differ > 0 && <p className="text-sm text-muted">{t("differ", { count: differ })}</p>}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

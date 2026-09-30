"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  GLOSSARY_CATEGORIES,
  type GlossaryCategory,
} from "@/lib/glossary-categories";

type Item = {
  category: GlossaryCategory;
  term: string;
  termHe: string; // anchor key — stable across locales
  def: string;
  sources: string[];
};

// Anchor id for a term; search results deep-link with /glossary#g-<termHe>.
const anchorId = (termHe: string) => `g-${encodeURIComponent(termHe)}`;

export function GlossaryBrowser({ items }: { items: Item[] }) {
  const t = useTranslations("glossary");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<GlossaryCategory | "all">("all");
  const [highlight, setHighlight] = useState<string | null>(null);

  // Deep link (#g-<termHe>): scroll to the term and highlight it briefly.
  // Filters start empty on mount, so the term is guaranteed to be rendered.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#g-")) return;
    const id = hash.slice(1);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time deep-link highlight after hydration
    setHighlight(id);
    // After paint, so the grid has laid out before we scroll.
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "center" });
    });
    const timer = setTimeout(() => setHighlight(null), 2500);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter((it) => {
      if (cat !== "all" && it.category !== cat) return false;
      if (!query) return true;
      return (
        it.term.toLowerCase().includes(query) ||
        it.def.toLowerCase().includes(query)
      );
    });
  }, [items, q, cat]);

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? "bg-accent text-white" : "bg-black/5 text-foreground hover:bg-black/10"
    }`;

  return (
    <div className="space-y-5">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("search")}
        aria-label={t("search")}
        className="w-full rounded-lg border border-black/15 bg-white px-4 py-2.5 text-base"
      />

      <div className="flex flex-wrap gap-2">
        <button type="button" className={chip(cat === "all")} onClick={() => setCat("all")}>
          {t("all")}
        </button>
        {GLOSSARY_CATEGORIES.map((c) => (
          <button key={c} type="button" className={chip(cat === c)} onClick={() => setCat(c)}>
            {t(`cat_${c}`)}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted">{t("results", { count: filtered.length })}</p>

      {filtered.length === 0 ? (
        <p className="text-muted">{t("noResults")}</p>
      ) : (
        <dl className="grid gap-3 sm:grid-cols-2">
          {filtered.map((it, i) => (
            <div
              key={i}
              id={anchorId(it.termHe)}
              className={`rounded-xl bg-white p-4 shadow-sm transition-shadow ${
                highlight === anchorId(it.termHe) ? "ring-2 ring-accent" : ""
              }`}
            >
              <dt className="flex items-baseline justify-between gap-2">
                <span className="font-bold text-lg">{it.term}</span>
                <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                  {t(`cat_${it.category}`)}
                </span>
              </dt>
              <dd className="mt-1.5 leading-relaxed text-foreground/90">{it.def}</dd>
              <dd className="mt-1.5 text-xs text-muted">
                {/* One source reads "Source"; several read "Source 1 · 2". */}
                {it.sources.map((url, n) => (
                  <span key={url}>
                    {n > 0 && " · "}
                    <a className="underline hover:text-accent" href={url} target="_blank" rel="noopener noreferrer">
                      {n === 0 ? t("source") + (it.sources.length > 1 ? " 1" : "") : n + 1}
                    </a>
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

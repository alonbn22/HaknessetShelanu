"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const STORAGE_KEY = "seats-view";

// Switches the "Seats by faction" section between the proportional bar (default)
// and the hemicycle. Both views are rendered server-side and passed in as nodes,
// so this thin client wrapper only holds the toggle state. The choice persists
// in localStorage; the SSR frame always starts as "bar" and switches after
// hydration (a state update in an effect — no hydration mismatch).
export function SeatsToggle({ bar, dome }: { bar: React.ReactNode; dome: React.ReactNode }) {
  const t = useTranslations("home");
  const [view, setView] = useState<"bar" | "dome">("bar"); // bar = default

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore persisted choice post-hydration
      if (saved === "dome") setView("dome");
    } catch {
      /* storage unavailable (private mode) — keep the default */
    }
  }, []);

  const pick = (v: "bar" | "dome") => {
    setView(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* best effort */
    }
  };

  const tab = (v: "bar" | "dome", label: string) => (
    <button
      type="button"
      aria-pressed={view === v}
      onClick={() => pick(v)}
      className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
        view === v ? "bg-accent text-white" : "text-muted hover:bg-black/5"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div
        className="inline-flex gap-1 rounded-lg bg-black/5 p-1"
        role="group"
        aria-label={t("seatsView")}
      >
        {tab("bar", t("seatsViewBar"))}
        {tab("dome", t("seatsViewHemicycle"))}
      </div>
      <div>{view === "bar" ? bar : dome}</div>
    </div>
  );
}

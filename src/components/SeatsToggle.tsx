"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

// Switches the "Seats by faction" section between the proportional bar (default)
// and the hemicycle. Both views are rendered server-side and passed in as nodes,
// so this thin client wrapper only holds the toggle state.
export function SeatsToggle({ bar, dome }: { bar: React.ReactNode; dome: React.ReactNode }) {
  const t = useTranslations("home");
  const [view, setView] = useState<"bar" | "dome">("bar"); // bar = default

  const tab = (v: "bar" | "dome", label: string) => (
    <button
      type="button"
      aria-pressed={view === v}
      onClick={() => setView(v)}
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

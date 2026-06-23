"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useQueryFilter } from "@/lib/use-query-filter";

const STATUSES = ["all", "passed", "rejected", "raised", "final"] as const;

export function LawFilters() {
  const t = useTranslations("votes");
  const { searchParams, setParam, setParamDebounced } = useQueryFilter();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  return (
    <div className="flex flex-wrap gap-3">
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setParamDebounced("q", e.target.value);
        }}
        placeholder={t("searchSubject")}
        aria-label={t("searchSubject")}
        className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm w-full sm:w-72"
      />
      <select
        value={searchParams.get("status") ?? "all"}
        onChange={(e) => setParam("status", e.target.value === "all" ? "" : e.target.value)}
        aria-label={t("filterStatus")}
        className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(
              s === "all"
                ? "statusAll"
                : s === "passed"
                  ? "statusPassed"
                  : s === "rejected"
                    ? "statusRejected"
                    : s === "raised"
                      ? "statusRaised"
                      : "statusFinal",
            )}
          </option>
        ))}
      </select>
    </div>
  );
}

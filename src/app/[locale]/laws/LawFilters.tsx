"use client";

import { useTranslations } from "next-intl";
import { useQueryFilter } from "@/lib/use-query-filter";
import { SearchInput } from "@/components/SearchInput";

const STATUSES = ["all", "passed", "rejected", "raised", "final"] as const;
const STATUS_KEY = {
  all: "statusAll",
  passed: "statusPassed",
  rejected: "statusRejected",
  raised: "statusRaised",
  final: "statusFinal",
} as const;

export function LawFilters() {
  const t = useTranslations("votes");
  const { searchParams, setParam } = useQueryFilter();

  return (
    <div className="flex flex-wrap gap-3">
      <SearchInput placeholder={t("searchSubject")} className="w-full sm:w-72" />
      <select
        value={searchParams.get("status") ?? "all"}
        onChange={(e) => setParam("status", e.target.value === "all" ? "" : e.target.value)}
        aria-label={t("filterStatus")}
        className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(STATUS_KEY[s])}
          </option>
        ))}
      </select>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useQueryFilter } from "@/lib/use-query-filter";

export type SectionOption = { code: number; name: string };

export function BudgetFilters({ sections }: { sections: SectionOption[] }) {
  const t = useTranslations("budget");
  const { searchParams, setParam, setParamDebounced } = useQueryFilter();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setParamDebounced("q", e.target.value);
        }}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm w-full sm:w-72"
      />
      <select
        aria-label={t("filterSection")}
        value={searchParams.get("section") ?? ""}
        onChange={(e) => setParam("section", e.target.value)}
        className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
      >
        <option value="">{t("allSections")}</option>
        {sections.map((s) => (
          <option key={s.code} value={s.code}>
            {s.name}
          </option>
        ))}
      </select>
      <select
        aria-label={t("sortBy")}
        value={searchParams.get("sort") ?? "amount"}
        onChange={(e) => setParam("sort", e.target.value)}
        className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
      >
        <option value="amount">{t("sortAmount")}</option>
        <option value="name">{t("sortName")}</option>
        <option value="code">{t("sortCode")}</option>
      </select>
    </div>
  );
}

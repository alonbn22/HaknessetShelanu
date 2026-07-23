"use client";

import { useTranslations } from "next-intl";
import { useQueryFilter } from "@/lib/use-query-filter";
import { SearchInput } from "@/components/SearchInput";

export type SectionOption = { code: number; name: string };

export function BudgetFilters({ sections }: { sections: SectionOption[] }) {
  const t = useTranslations("budget");
  const { searchParams, setParam } = useQueryFilter();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <SearchInput placeholder={t("searchPlaceholder")} className="w-full sm:w-72" />
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

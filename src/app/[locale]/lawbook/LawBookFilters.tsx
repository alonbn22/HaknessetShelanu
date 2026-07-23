"use client";

import { useTranslations } from "next-intl";
import { useQueryFilter } from "@/lib/use-query-filter";
import { SearchInput } from "@/components/SearchInput";

export function LawBookFilters() {
  const t = useTranslations("lawbook");
  const { searchParams, setParam } = useQueryFilter();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <SearchInput placeholder={t("search")} className="w-full sm:w-72" />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={searchParams.get("basic") === "1"}
          onChange={(e) => setParam("basic", e.target.checked ? "1" : "")}
        />
        {t("basicOnly")}
      </label>
    </div>
  );
}

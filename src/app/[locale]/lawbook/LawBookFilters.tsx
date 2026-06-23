"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useQueryFilter } from "@/lib/use-query-filter";

export function LawBookFilters() {
  const t = useTranslations("lawbook");
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
        placeholder={t("search")}
        aria-label={t("search")}
        dir="rtl"
        className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm w-full sm:w-72"
      />
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

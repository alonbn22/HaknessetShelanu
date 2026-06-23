"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useQueryFilter } from "@/lib/use-query-filter";

export function MemberFilters({
  factions,
}: {
  factions: { id: number; name: string }[];
}) {
  const t = useTranslations();
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
        placeholder={t("members.searchPlaceholder")}
        aria-label={t("members.searchPlaceholder")}
        className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm w-full sm:w-64"
      />
      <select
        value={searchParams.get("faction") ?? ""}
        onChange={(e) => setParam("faction", e.target.value)}
        aria-label={t("members.allParties")}
        className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
      >
        <option value="">{t("members.allParties")}</option>
        {factions.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
      <select
        value={searchParams.get("bloc") ?? ""}
        onChange={(e) => setParam("bloc", e.target.value)}
        aria-label={t("members.allBlocs")}
        className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
      >
        <option value="">{t("members.allBlocs")}</option>
        <option value="coalition">{t("common.coalition")}</option>
        <option value="opposition">{t("common.opposition")}</option>
      </select>
    </div>
  );
}

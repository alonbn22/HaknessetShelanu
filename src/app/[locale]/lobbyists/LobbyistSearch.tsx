"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useQueryFilter } from "@/lib/use-query-filter";

export function LobbyistSearch() {
  const t = useTranslations("lobbyists");
  const { searchParams, setParamDebounced } = useQueryFilter();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  return (
    <input
      type="search"
      value={q}
      onChange={(e) => {
        setQ(e.target.value);
        setParamDebounced("q", e.target.value);
      }}
      placeholder={t("searchPlaceholder")}
      aria-label={t("searchPlaceholder")}
      className="w-full max-w-md rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
    />
  );
}

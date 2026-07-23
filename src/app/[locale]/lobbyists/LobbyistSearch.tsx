"use client";

import { useTranslations } from "next-intl";
import { SearchInput } from "@/components/SearchInput";

export function LobbyistSearch() {
  const t = useTranslations("lobbyists");
  return <SearchInput placeholder={t("searchPlaceholder")} className="w-full max-w-md" />;
}

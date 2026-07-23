"use client";

import { useTranslations } from "next-intl";
import { SearchInput } from "@/components/SearchInput";

export function VoteSearch() {
  const t = useTranslations("votes");
  return <SearchInput placeholder={t("searchPlaceholder")} className="w-full sm:w-96" />;
}

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { SearchIcon } from "./icons/SearchIcon";

export function HeroSearch() {
  const t = useTranslations();
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/search");
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 bg-white rounded-full p-1.5 ps-5 shadow-lg mx-auto"
      style={{ maxWidth: "520px" }}
    >
      <SearchIcon size={20} className="text-accent" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        placeholder={t("home.searchPlaceholder")}
        aria-label={t("home.searchPlaceholder")}
        className="flex-1 bg-transparent outline-none text-foreground placeholder-black/40 text-[15px]"
      />
      <button
        type="submit"
        className="rounded-full bg-accent text-white text-sm font-bold px-6 py-2.5 hover:bg-accent-deep transition-colors"
      >
        {t("common.search")}
      </button>
    </form>
  );
}

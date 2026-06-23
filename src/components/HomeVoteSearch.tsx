"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export function HomeVoteSearch() {
  const t = useTranslations();
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/votes?q=${encodeURIComponent(q.trim())}` : "/votes");
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("votes.searchPlaceholder")}
        aria-label={t("votes.searchPlaceholder")}
        className="rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm w-44 sm:w-64"
      />
      <button
        type="submit"
        className="rounded-lg bg-accent text-white px-3 py-1.5 text-sm font-medium hover:opacity-90"
      >
        {t("common.search")}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export function HeroSearch() {
  const t = useTranslations();
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/votes?q=${encodeURIComponent(q.trim())}` : "/votes");
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 bg-white rounded-full p-1.5 ps-5 shadow-lg mx-auto"
      style={{ maxWidth: "520px" }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0b3d91" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
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

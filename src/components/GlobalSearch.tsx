"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

// Site-wide search box → navigates to /search. Used on the search page (and
// reusable elsewhere). The query is translated to Hebrew server-side so it
// matches the data regardless of the UI language.
export function GlobalSearch({
  initial = "",
  autoFocus = false,
}: {
  initial?: string;
  autoFocus?: boolean;
}) {
  const t = useTranslations("search");
  const router = useRouter();
  const [q, setQ] = useState(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        router.push(v ? `/search?q=${encodeURIComponent(v)}` : "/search");
      }}
      className="flex items-center gap-2 rounded-full border border-black/15 bg-white p-1.5 ps-4 shadow-sm"
      role="search"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="text-accent" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        autoFocus={autoFocus}
        placeholder={t("placeholder")}
        aria-label={t("placeholder")}
        className="flex-1 bg-transparent text-sm outline-none placeholder-black/40"
      />
      <button
        type="submit"
        className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:bg-accent-deep"
      >
        {t("button")}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { SearchIcon } from "./icons/SearchIcon";

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
      <SearchIcon size={18} className="text-accent" />
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

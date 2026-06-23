"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

export function YearSelector({ years }: { years: number[] }) {
  const t = useTranslations("budget");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("year") ?? String(years[0] ?? "");

  function go(year: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", year);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">{t("filterYear")}:</span>
      <select
        aria-label={t("filterYear")}
        value={current}
        onChange={(e) => go(e.target.value)}
        className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </label>
  );
}

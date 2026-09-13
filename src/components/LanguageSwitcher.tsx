"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useParams, useSearchParams } from "next/navigation";
import { locales, type Locale } from "@/i18n/routing";

const localeNames: Record<Locale, string> = {
  he: "עברית",
  en: "English",
  ar: "العربية",
  ru: "Русский",
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();

  function onChange(next: string) {
    const query = Object.fromEntries(searchParams.entries());
    router.replace(
      // Re-resolve the current dynamic route with its params in the new locale.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { pathname, params: params as any, query } as any,
      { locale: next as Locale },
    );
  }

  return (
    <select
      aria-label="Language"
      value={locale}
      onChange={(e) => onChange(e.target.value)}
      className="cursor-pointer rounded-chip border border-on-chrome/40 bg-chrome-hover px-2 py-1 text-sm text-on-chrome [&>option]:text-foreground"
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {localeNames[l]}
        </option>
      ))}
    </select>
  );
}

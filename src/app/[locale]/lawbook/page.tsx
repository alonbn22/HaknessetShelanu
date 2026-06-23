import { after } from "next/server";
import { getTranslations, getLocale } from "next-intl/server";
import { Pagination } from "@/components/Pagination";
import { LawBookFilters } from "./LawBookFilters";
import { getLawBookPage } from "@/lib/queries";
import { translateQueryToHebrew } from "@/lib/translate-query";
import { localizeData, queueDataTranslations } from "@/lib/i18n-data";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LawBookPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; basic?: string; page?: string }>;
}) {
  const t = await getTranslations("lawbook");
  const locale = await getLocale();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const searchHe = await translateQueryToHebrew(params.q, locale);
  const { items, total, pages } = getLawBookPage({
    search: params.q,
    searchHe,
    basicOnly: params.basic === "1",
    page,
  });

  const names = localizeData(items.map((l) => l.nameHe), locale);
  const nameOf = (he: string | null) =>
    (he && names.get(he.trim())) || { text: he ?? "", translated: false, rtl: true };
  if (locale !== "he") after(() => queueDataTranslations(items.map((l) => l.nameHe), locale));

  const query: Record<string, string> = {};
  if (params.q) query.q = params.q;
  if (params.basic === "1") query.basic = "1";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <LawBookFilters />
      <p className="text-sm text-muted">{t("results", { count: total })}</p>

      {items.length === 0 ? (
        <p className="text-black/60">{t("noResults")}</p>
      ) : (
        <ul className="divide-y divide-black/5 rounded-xl bg-white shadow-sm">
          {items.map((law) => {
            const name = nameOf(law.nameHe);
            return (
            <li key={law.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div
                  className="font-medium leading-snug"
                  dir={name.rtl ? "rtl" : undefined}
                  lang={name.rtl ? "he" : undefined}
                >
                  {name.text}
                </div>
                {law.publicationDate && (
                  <div className="text-xs text-muted">
                    {t("published")}: {formatDate(law.publicationDate, locale)}
                  </div>
                )}
              </div>
              {law.isBasicLaw && (
                <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                  {t("basicLaw")}
                </span>
              )}
            </li>
            );
          })}
        </ul>
      )}

      <Pagination page={page} pages={pages} basePath="/lawbook" query={query} />
      <p className="text-xs text-muted">{t("note")}</p>
    </div>
  );
}

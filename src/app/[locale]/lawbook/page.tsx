import { getTranslations, getLocale } from "next-intl/server";
import { Pagination } from "@/components/Pagination";
import { LawBookFilters } from "./LawBookFilters";
import { getLawBookPage, hebrewSearchTerms } from "@/lib/queries";
import { localizePage } from "@/lib/i18n-data";
import { pageParam, queryParam } from "@/lib/params";
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
  const page = pageParam(params.page);
  const q = queryParam(params.q);
  const { items, total, pages, page: curPage } = getLawBookPage({
    search: q,
    searchHe: hebrewSearchTerms(q, locale),
    basicOnly: params.basic === "1",
    page,
  });

  const { loc: nameOf } = localizePage(items.map((l) => l.nameHe), locale);

  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (params.basic === "1") query.basic = "1";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <LawBookFilters />
      <p className="text-sm text-muted">{t("results", { count: total })}</p>

      {items.length === 0 ? (
        <p className="text-muted">{t("noResults")}</p>
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

      <Pagination page={curPage} pages={pages} basePath="/lawbook" query={query} />
      <p className="text-xs text-muted">{t("note")}</p>
    </div>
  );
}

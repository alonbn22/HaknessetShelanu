import { getTranslations, getLocale } from "next-intl/server";
import { VoteCard } from "@/components/VoteCard";
import { Pagination } from "@/components/Pagination";
import { LawFilters } from "./LawFilters";
import { getLawVotesPage, hebrewSearchTerms, type LawStatus } from "@/lib/queries";
import { localizePage } from "@/lib/i18n-data";
import { pageParam, queryParam } from "@/lib/params";

export const dynamic = "force-dynamic";

const STATUSES: LawStatus[] = ["all", "passed", "rejected", "raised", "final"];

export default async function LawsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const t = await getTranslations("votes");
  const locale = await getLocale();
  const params = await searchParams;
  const page = pageParam(params.page);
  const status = (STATUSES.includes(params.status as LawStatus)
    ? params.status
    : "all") as LawStatus;

  const q = queryParam(params.q);
  const { items, total, pages, page: curPage } = getLawVotesPage({
    search: q,
    searchHe: hebrewSearchTerms(q, locale),
    status,
    page,
    locale,
  });

  const { loc: titleOf } = localizePage(items.map((v) => v.titleHe), locale);

  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (status !== "all") query.status = status;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("laws")}</h1>
      <LawFilters />
      <p className="text-sm text-muted">{t("resultsCount", { count: total })}</p>

      {items.length === 0 ? (
        <p className="text-muted">{t("noResults")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((v) => (
            <VoteCard key={v.id} vote={v} title={titleOf(v.titleHe)} />
          ))}
        </div>
      )}

      <Pagination page={curPage} pages={pages} basePath="/laws" query={query} />
    </div>
  );
}

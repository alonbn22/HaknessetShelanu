import { after } from "next/server";
import { getTranslations, getLocale } from "next-intl/server";
import { VoteCard } from "@/components/VoteCard";
import { Pagination } from "@/components/Pagination";
import { LawFilters } from "./LawFilters";
import { getLawVotesPage, type LawStatus } from "@/lib/queries";
import { translateQueryToHebrew } from "@/lib/translate-query";
import { localizeData, queueDataTranslations } from "@/lib/i18n-data";

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
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const status = (STATUSES.includes(params.status as LawStatus)
    ? params.status
    : "all") as LawStatus;

  const searchHe = await translateQueryToHebrew(params.q, locale);
  const { items, total, pages } = getLawVotesPage({
    search: params.q,
    searchHe,
    status,
    page,
    locale,
  });

  const titles = localizeData(items.map((v) => v.titleHe), locale);
  const titleOf = (he: string | null) =>
    (he && titles.get(he.trim())) || { text: he ?? "", translated: false };

  // Lazy-translate the bill titles shown here (active locale) after the response.
  if (locale !== "he") after(() => queueDataTranslations(items.map((v) => v.titleHe), locale));

  const query: Record<string, string> = {};
  if (params.q) query.q = params.q;
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

      <Pagination page={page} pages={pages} basePath="/laws" query={query} />
    </div>
  );
}

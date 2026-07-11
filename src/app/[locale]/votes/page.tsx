import { after } from "next/server";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { VoteCard } from "@/components/VoteCard";
import { Pagination } from "@/components/Pagination";
import { VoteSearch } from "./VoteSearch";
import { getVotesPage, CLOSE_VOTE_MARGIN } from "@/lib/queries";
import { translateQueryToHebrew } from "@/lib/translate-query";
import { localizeData, queueDataTranslations } from "@/lib/i18n-data";

export const dynamic = "force-dynamic";

export default async function VotesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; close?: string }>;
}) {
  const t = await getTranslations();
  const locale = await getLocale();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const closeOnly = params.close === "1";
  const searchHe = await translateQueryToHebrew(params.q, locale);
  const { items, pages, page: curPage } = getVotesPage(page, params.q, searchHe, closeOnly);

  const titles = localizeData(items.map((v) => v.titleHe), locale);
  const titleOf = (he: string | null) =>
    (he && titles.get(he.trim())) || { text: he ?? "", translated: false };

  // Lazy-translate the titles shown here (active locale) after the response.
  if (locale !== "he") after(() => queueDataTranslations(items.map((v) => v.titleHe), locale));

  const query: Record<string, string> = {};
  if (params.q) query.q = params.q;
  if (closeOnly) query.close = "1";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("votes.title")}</h1>
      <VoteSearch />
      {/* Filter: close votes (decided by a narrow margin — where attendance swung it). */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href={closeOnly ? { pathname: "/votes", query: params.q ? { q: params.q } : {} } : { pathname: "/votes", query: { ...(params.q ? { q: params.q } : {}), close: "1" } }}
          className={`rounded-full px-3 py-1 font-medium transition-colors ${
            closeOnly ? "bg-accent text-white" : "bg-black/5 text-muted hover:bg-black/10"
          }`}
          aria-pressed={closeOnly}
        >
          {t("votes.closeVotes")}
        </Link>
        {closeOnly && <span className="text-muted">{t("votes.closeVotesHint", { n: CLOSE_VOTE_MARGIN })}</span>}
      </div>
      {items.length === 0 ? (
        <p className="text-muted">{t("votes.noResults")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((v) => (
            <VoteCard key={v.id} vote={v} title={titleOf(v.titleHe)} />
          ))}
        </div>
      )}
      <Pagination page={curPage} pages={pages} basePath="/votes" query={query} />
    </div>
  );
}

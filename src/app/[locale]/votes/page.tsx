import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { VoteCard } from "@/components/VoteCard";
import { Pagination } from "@/components/Pagination";
import { VoteSearch } from "./VoteSearch";
import { getVotesPage, hebrewSearchTerms, CLOSE_VOTE_MARGIN } from "@/lib/queries";
import { localizePage } from "@/lib/i18n-data";
import { pageParam, queryParam } from "@/lib/params";

export const dynamic = "force-dynamic";

export default async function VotesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; close?: string }>;
}) {
  const t = await getTranslations();
  const locale = await getLocale();
  const params = await searchParams;
  const page = pageParam(params.page);
  const closeOnly = params.close === "1";
  const q = queryParam(params.q);
  const { items, pages, page: curPage } = getVotesPage(page, q, hebrewSearchTerms(q, locale), closeOnly);

  const { loc: titleOf } = localizePage(items.map((v) => v.titleHe), locale);

  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (closeOnly) query.close = "1";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("votes.title")}</h1>
      <VoteSearch />
      {/* Filter: close votes (decided by a narrow margin — where attendance swung it). */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href={closeOnly ? { pathname: "/votes", query: q ? { q } : {} } : { pathname: "/votes", query: { ...(q ? { q } : {}), close: "1" } }}
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

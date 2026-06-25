import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Pagination } from "@/components/Pagination";
import { LobbyistSearch } from "./LobbyistSearch";
import { getLobbyistStats, getLobbyistsPage, type LobbyistSort } from "@/lib/queries";
import { getForeignAid, partyText } from "@/lib/content";
import { translateQueryToHebrew } from "@/lib/translate-query";
import { localizeData, queueDataTranslations } from "@/lib/i18n-data";
import { after } from "next/server";

export const dynamic = "force-dynamic";

export default async function LobbyistsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; sort?: string }>;
}) {
  const t = await getTranslations("lobbyists");
  const locale = await getLocale();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const sort: LobbyistSort = (["name", "firm", "clients"] as const).includes(
    params.sort as LobbyistSort,
  )
    ? (params.sort as LobbyistSort)
    : "name";
  const stats = getLobbyistStats();
  const searchHe = await translateQueryToHebrew(params.q, locale);
  const { items, total, pages } = getLobbyistsPage({ search: params.q, searchHe, page, sort });
  // Link to a sort, preserving the search query (and resetting to page 1).
  const sortHref = (s: LobbyistSort) =>
    `/lobbyists?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), sort: s })}`;

  // Permit type ("permanent"/"temporary lobbyist") is a small enum → translate on
  // the fly. Personal/firm/client names are proper nouns and intentionally stay Hebrew.
  const permitTypes = items.map((l) => l.permitType);
  const permitMap = localizeData(permitTypes, locale);
  if (locale !== "he") after(() => queueDataTranslations(permitTypes, locale));
  const permitOf = (he: string | null) => (he && permitMap.get(he.trim())) || null;

  const nf = new Intl.NumberFormat(locale);
  const query: Record<string, string> = {
    ...(params.q ? { q: params.q } : {}),
    ...(sort !== "name" ? { sort } : {}),
  };
  const foreignAid = getForeignAid();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </div>

      {/* What lobbyists are / what they do. */}
      <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm leading-relaxed space-y-2">
        <p>{t("explainer")}</p>
        <p className="text-muted">{t("whatForNote")}</p>
      </div>

      <div className="space-y-1.5">
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { v: stats.lobbyists, l: t("statLobbyists"), s: "name" },
              { v: stats.firms, l: t("statFirms"), s: "firm" },
              { v: stats.clients, l: t("statClients"), s: "clients" },
            ] as const
          ).map((c) => {
            const active = sort === c.s;
            return (
              <Link
                key={c.l}
                href={sortHref(c.s)}
                aria-pressed={active}
                className={`rounded-xl bg-white p-4 text-center shadow-sm ring-2 transition-colors hover:bg-black/[.02] ${
                  active ? "ring-accent" : "ring-transparent"
                }`}
              >
                <div className="text-2xl font-extrabold text-accent tabular-nums">
                  {nf.format(c.v)}
                </div>
                <div className="text-xs text-muted mt-1">{c.l}</div>
              </Link>
            );
          })}
        </div>
        <p className="text-xs text-muted">{t("sortHint")}</p>
      </div>

      <LobbyistSearch />
      <p className="text-sm text-muted">{t("results", { count: total })}</p>

      {items.length === 0 ? (
        <p className="text-muted">{t("noResults")}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((l) => (
            <li key={l.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold" dir="rtl" lang="he">
                  {l.fullName}
                </span>
                {l.permitType &&
                  (() => {
                    const pt = permitOf(l.permitType);
                    return (
                      <span
                        className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs text-muted"
                        dir={!pt || pt.rtl ? "rtl" : undefined}
                        lang={!pt || pt.rtl ? "he" : undefined}
                      >
                        {pt ? pt.text : l.permitType}
                      </span>
                    );
                  })()}
              </div>
              {l.corporationName && (
                <div className="mt-0.5 text-sm text-muted" dir="rtl" lang="he">
                  {t("firm")}: {l.corporationName}
                </div>
              )}
              {l.clients.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-medium text-foreground/70">
                    {t("clients")} ({l.clients.length}):
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {l.clients.map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs text-accent-deep"
                        title={t(`rep_${c.type}`)}
                      >
                        <span dir="rtl" lang="he">{c.name}</span>
                        <span className="text-[10px] text-muted">· {t(`rep_${c.type}`)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} pages={pages} basePath="/lobbyists" query={query} />

      {/* Foreign aid / foreign donations explainer (no clean per-record open data). */}
      <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-xl font-semibold">{t("foreignTitle")}</h2>
        <p className="text-sm leading-relaxed text-foreground/80">{t("foreignBody")}</p>

        {/* U.S. military aid — past decade, by fiscal year. */}
        {(() => {
          const us = foreignAid.usMilitaryAid;
          const max = Math.max(...us.years.map((y) => y.billion), 1);
          const total = us.years.reduce((s, y) => s + y.billion, 0);
          return (
            <div className="rounded-lg border border-black/10 p-3 space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{t("usAidTitle")}</h3>
                <span className="text-sm text-muted">
                  {t("usAidTotal", { total: total.toFixed(1) })}
                </span>
              </div>
              <ul className="space-y-1.5">
                {us.years.map((y) => (
                  <li key={y.year} className="flex items-center gap-3 text-sm">
                    <span className="w-10 font-medium tabular-nums">{y.year}</span>
                    <div className="flex-1 h-2 rounded-full bg-black/5" dir="ltr">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${(y.billion / max) * 100}%` }}
                      />
                    </div>
                    <span className="tabular-nums font-semibold text-accent whitespace-nowrap">
                      ${y.billion.toFixed(1)}B
                    </span>
                    {y.note && (
                      <span className="hidden sm:inline text-xs text-muted truncate max-w-[16rem]">
                        {partyText(y.note, locale)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted">{partyText(us.note, locale)}</p>
              <a
                href={us.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs text-accent hover:underline"
              >
                {partyText(us.source.label, locale)}
              </a>
            </div>
          );
        })()}

        <ul className="space-y-2">
          {foreignAid.flows.map((f, i) => (
            <li key={i} className="rounded-lg border border-black/10 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{partyText(f.donor, locale)}</span>
                <span className="text-muted">→ {partyText(f.recipient, locale)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    f.kind === "aid-to-state"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {t(`kind_${f.kind}`)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 text-sm">
                <span className="font-bold text-accent">{partyText(f.amount, locale)}</span>
                <span className="text-muted">{partyText(f.period, locale)}</span>
              </div>
              <p className="mt-1 text-sm text-foreground/80">{partyText(f.purpose, locale)}</p>
              <a
                href={f.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-accent hover:underline"
              >
                {partyText(f.source.label, locale)}
              </a>
            </li>
          ))}
        </ul>

        <p className="text-sm font-medium text-foreground/70">{t("foreignMoreLinks")}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <a
            href="https://www.guidestar.org.il/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            {t("foreignLinkGuidestar")}
          </a>
          <a
            href="https://www.gov.il/he/departments/legalInfo/cna_foreign_entity_donations"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            {t("foreignLinkRegistrar")}
          </a>
        </div>
        <p className="text-xs text-muted">{t("foreignNote")}</p>
      </section>

      <p className="text-xs text-muted">{t("source")}</p>
    </div>
  );
}

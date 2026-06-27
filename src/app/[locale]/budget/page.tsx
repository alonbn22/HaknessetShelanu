import { after } from "next/server";
import { getTranslations, getLocale } from "next-intl/server";
import { Pagination } from "@/components/Pagination";
import { BudgetFilters } from "./BudgetFilters";
import { YearSelector } from "./YearSelector";
import {
  getBudgetMeta,
  getBudgetSections,
  getBudgetLines,
  getBudgetDetailedYears,
  getBudgetTimeline,
  getCurrentKnessetBudget,
  type BudgetLine,
} from "@/lib/queries";
import { getBudgetOutlook, partyText } from "@/lib/content";
import { translateQueryToHebrew } from "@/lib/translate-query";
import { localizeData, queueDataTranslations, resolveLocalized } from "@/lib/i18n-data";

export const dynamic = "force-dynamic";

type SortKey = "amount" | "name" | "code";
const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  proposed: "bg-blue-100 text-blue-800",
  "in-knesset": "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
};

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; section?: string; sort?: string; page?: string; year?: string }>;
}) {
  const t = await getTranslations("budget");
  const locale = await getLocale();
  const params = await searchParams;

  const years = getBudgetDetailedYears();
  const reqYear = params.year ? parseInt(params.year, 10) : undefined;
  const meta = getBudgetMeta(reqYear);
  const year = meta.year;
  const sections = getBudgetSections(year ?? undefined);
  const timeline = getBudgetTimeline();
  const currentKnesset = getCurrentKnessetBudget();
  const outlook = getBudgetOutlook();

  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const sectionFilter = params.section ? parseInt(params.section, 10) : undefined;
  const sort = (["amount", "name", "code"].includes(params.sort ?? "")
    ? params.sort
    : "amount") as SortKey;
  const searchHe = await translateQueryToHebrew(params.q, locale);

  const { items, total, pages } = getBudgetLines({
    year: year ?? undefined,
    search: params.q,
    searchHe,
    section: sectionFilter != null && !Number.isNaN(sectionFilter) ? sectionFilter : undefined,
    sort,
    page,
  });

  // Resolve Hebrew names → the active locale via the unified cache (sections +
  // line names on this page), then lazily translate any misses after the response.
  const shownNames = [
    ...sections.map((s) => s.nameHe),
    ...items.flatMap((l) => [l.takanaNameHe, l.programNameHe, l.sectionNameHe]),
  ];
  const nameMap = localizeData(shownNames, locale);
  const ln = (he: string | null | undefined) => resolveLocalized(nameMap, he);
  if (locale !== "he") after(() => queueDataTranslations(shownNames, locale));

  // Amounts are in NIS thousands. Auto-scale: ≥1,000B → trillions, ≥1B → billions,
  // else millions. (1,000 billion = 1 trillion.)
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const nf1 = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  // One auto-scaling money formatter (input is NIS thousands).
  const money = (k: number) => {
    // ≥ 1 trillion: show trillions with the billions in parentheses.
    if (k >= 1e9) return `₪${nf.format(k / 1e9)}${t("tr")} (₪${nf1.format(k / 1e6)}${t("b")})`;
    if (k >= 1e6) return `₪${nf1.format(k / 1e6)}${t("b")}`; // billions
    return `₪${nf1.format(Math.round(k / 1e3))}${t("m")}`; // millions
  };
  const sectionTotal = sections.reduce((s, x) => s + x.totalThousands, 0) || 1;
  const maxSection = Math.max(...sections.map((s) => s.totalThousands), 1);
  const maxTimeline = Math.max(...timeline.map((x) => x.totalThousands), 1);

  const query: Record<string, string> = {};
  if (params.q) query.q = params.q;
  if (params.section) query.section = params.section;
  if (sort !== "amount") query.sort = sort;
  if (params.year) query.year = params.year;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </div>

      <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm leading-relaxed space-y-1">
        <p className="font-semibold">{t("provTitle")}</p>
        <p>{t("provBody")}</p>
        <p className="text-muted">{t("provUnits")}</p>
      </div>

      {/* Upcoming / not-yet-published budgets (editorial outlook + news). */}
      {outlook.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t("outlookTitle")}</h2>
          {outlook.map((o) => (
            <div key={o.year} className="rounded-xl bg-white p-4 shadow-sm space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-bold">{o.year}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    STATUS_TONE[o.status] ?? "bg-black/10"
                  }`}
                >
                  {t(`status_${o.status}`)}
                </span>
                <span className="font-medium">{partyText(o.headline, locale)}</span>
              </div>
              <p className="text-sm text-foreground/80">{partyText(o.timing, locale)}</p>
              {o.news && o.news.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {o.news.map((n, i) => (
                    <li key={i} className="text-foreground/80">
                      {n.date && <span className="text-muted">{n.date} — </span>}
                      {partyText(n.text, locale)}
                    </li>
                  ))}
                </ul>
              )}
              {o.links && o.links.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {o.links.map((l, i) => (
                    <a
                      key={i}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      {partyText(l.label, locale)}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
          <p className="text-xs text-muted">{t("outlookNote")}</p>
        </section>
      )}

      {/* Current-Knesset total */}
      {currentKnesset.years.length > 0 && (
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-muted text-sm">{t("currentKnessetLabel")}</div>
          <div className="text-3xl font-extrabold text-accent tabular-nums">
            {money(currentKnesset.totalThousands)}
          </div>
          <div className="mt-1 text-sm text-muted">
            {currentKnesset.years.map((y) => `${y.year}: ${money(y.totalThousands)}`).join(" · ")}
          </div>
          <p className="mt-1 text-xs text-muted">{t("grossNote")}</p>
        </section>
      )}

      {/* Per-year: selector drives total + breakdown + explorer */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{t("itemized", { year: year ?? "" })}</h2>
          <YearSelector years={years} />
        </div>
        <p className="text-sm text-muted">{t("dataNote", { year: year ?? "", count: meta.lineCount })}</p>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-muted text-sm">{t("totalLabel", { year: year ?? "" })}</div>
          <div className="text-4xl font-extrabold text-accent tabular-nums">
            {money(meta.totalThousands)}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">{t("byMinistry", { year: year ?? "" })}</h3>
          <ul className="space-y-2">
            {sections.slice(0, 14).map((s) => {
              const pct = (s.totalThousands / sectionTotal) * 100;
              const nm = ln(s.nameHe);
              return (
                <li key={`${s.code}`} className="rounded-xl bg-white p-3 shadow-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className="font-medium"
                      dir={nm.rtl ? "rtl" : undefined}
                      lang={nm.rtl ? "he" : undefined}
                    >
                      {nm.text}
                    </span>
                    <span className="text-sm tabular-nums whitespace-nowrap">
                      <span className="font-semibold text-accent">{money(s.totalThousands)}</span>
                      <span className="text-muted"> · {pct.toFixed(1)}%</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-black/5" dir="ltr">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${(s.totalThousands / maxSection) * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold">{t("explorer")}</h3>
          <BudgetFilters
            sections={sections
              .filter((s) => s.code != null)
              .map((s) => ({ code: s.code as number, name: ln(s.nameHe).text || String(s.code) }))}
          />
          <p className="text-sm text-muted">{t("resultsCount", { count: total })}</p>

          {items.length === 0 ? (
            <p className="text-muted">{t("noResults")}</p>
          ) : (
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-start text-muted">
                    <th className="px-3 py-2 text-start">{t("colLine")}</th>
                    <th className="px-3 py-2 text-start hidden md:table-cell">{t("colMinistry")}</th>
                    <th className="px-3 py-2 text-start hidden sm:table-cell">{t("colCode")}</th>
                    <th className="px-3 py-2 text-end">{t("colNet")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((l: BudgetLine) => {
                    const primary = ln(l.takanaNameHe || l.programNameHe || l.sectionNameHe);
                    const sub =
                      l.takanaNameHe && l.programNameHe ? ln(l.programNameHe) : null;
                    const min = ln(l.sectionNameHe);
                    return (
                      <tr key={l.id} className="border-b border-black/5 last:border-0">
                        <td className="px-3 py-2">
                          <span dir={primary.rtl ? "rtl" : undefined} lang={primary.rtl ? "he" : undefined}>
                            {primary.text}
                          </span>
                          {sub && sub.text !== primary.text && (
                            <span
                              className="block text-xs text-muted"
                              dir={sub.rtl ? "rtl" : undefined}
                              lang={sub.rtl ? "he" : undefined}
                            >
                              {sub.text}
                            </span>
                          )}
                        </td>
                        <td
                          className="px-3 py-2 hidden md:table-cell text-muted"
                          dir={min.rtl ? "rtl" : undefined}
                          lang={min.rtl ? "he" : undefined}
                        >
                          {min.text}
                        </td>
                        <td className="px-3 py-2 hidden sm:table-cell text-muted tabular-nums">
                          {l.takanaCode}
                        </td>
                        <td className="px-3 py-2 text-end font-semibold text-accent tabular-nums whitespace-nowrap">
                          {money(l.netThousands ?? 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination page={page} pages={pages} basePath="/budget" query={query} />
        </div>
      </section>

      {/* Budget over time */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">{t("overTime")}</h2>
        <ul className="space-y-1.5">
          {[...timeline].reverse().map((y) => (
            <li key={y.year} className="rounded-lg bg-white p-2.5 shadow-sm">
              <div className="flex items-center gap-3 text-sm">
                <span className="w-10 font-medium tabular-nums">{y.year}</span>
                <div className="flex-1 h-2 rounded-full bg-black/5" dir="ltr">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${(y.totalThousands / maxTimeline) * 100}%` }}
                  />
                </div>
                <span className="tabular-nums font-semibold text-accent whitespace-nowrap">
                  {money(y.totalThousands)}
                </span>
                <span className="w-12 text-xs text-muted">
                  {y.basis === "gross" ? t("gross") : t("net")}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">{t("timelineNote")}</p>
      </section>

      <p className="text-xs text-muted">{t("note2026")}</p>
      <p className="text-xs text-muted">
        {t("source")}:{" "}
        <a
          href="https://data.gov.il/dataset/budget"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          {t("sourceName")}
        </a>
      </p>
    </div>
  );
}

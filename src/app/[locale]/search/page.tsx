import { after } from "next/server";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GlobalSearch } from "@/components/GlobalSearch";
import { searchAll } from "@/lib/queries";
import { translateQueryToHebrew } from "@/lib/translate-query";
import { localizeData, queueDataTranslations, resolveLocalized } from "@/lib/i18n-data";
import { getGlossary, partyText } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const t = await getTranslations();
  const locale = await getLocale();
  // Same 200-char cap as translateQueryToHebrew — bounds the LIKE scans too.
  const query = ((await searchParams).q ?? "").trim().slice(0, 200);
  const searchHe = await translateQueryToHebrew(query, locale);

  const r = searchAll(query, searchHe, locale);

  // Glossary lives in editorial content, not the DB — filter it here.
  const ql = query.toLowerCase();
  const qHe = (searchHe || query).toLowerCase();
  const glossary = query
    ? getGlossary()
        .filter((g) => {
          const term = partyText(g.term, locale).toLowerCase();
          const def = partyText(g.def, locale).toLowerCase();
          return (
            term.includes(ql) ||
            g.term.he.toLowerCase().includes(qHe) ||
            def.includes(ql)
          );
        })
        .slice(0, 8)
    : [];

  // Translate the Hebrew data text shown (vote/law/bill/committee names) on the fly.
  const dataHe = [
    ...r.votes.map((v) => v.titleHe),
    ...r.laws.map((l) => l.nameHe),
    ...r.bills.map((b) => b.nameHe),
    ...r.committees.map((c) => c.nameHe),
  ];
  const map = localizeData(dataHe, locale);
  if (locale !== "he") after(() => queueDataTranslations(dataHe, locale));
  const loc = (he: string | null) => resolveLocalized(map, he);

  const total =
    r.members.length +
    r.parties.length +
    r.votes.length +
    r.laws.length +
    r.bills.length +
    r.committees.length +
    r.lobbyists.length +
    glossary.length;

  // Each group: heading + list of links. Hebrew-data items carry dir/lang.
  // `more` = the group hit the search cap; a "showing top N" hint is rendered.
  const groups: { key: string; heading: string; more?: boolean; items: { href: string; label: string; sub?: string | null; rtl?: boolean }[] }[] = [
    {
      key: "members",
      heading: t("nav.members"),
      more: r.hasMore.members,
      items: r.members.map((m) => ({ href: `/members/${m.id}`, label: m.name, sub: m.sub, rtl: m.rtl })),
    },
    {
      key: "parties",
      heading: t("nav.parties"),
      more: r.hasMore.parties,
      items: r.parties.map((p) => ({ href: `/parties/${p.id}`, label: p.name, rtl: p.rtl })),
    },
    {
      key: "votes",
      heading: t("nav.votes"),
      more: r.hasMore.votes,
      items: r.votes.map((v) => {
        const l = loc(v.titleHe);
        return { href: `/votes/${v.id}`, label: l.text, rtl: l.rtl };
      }),
    },
    {
      key: "bills",
      heading: t("nav.laws"),
      more: r.hasMore.bills,
      items: r.bills.map((b) => {
        const l = loc(b.nameHe);
        return { href: `/laws/${b.id}`, label: l.text, rtl: l.rtl };
      }),
    },
    {
      key: "laws",
      heading: t("nav.lawbook"),
      more: r.hasMore.laws,
      items: r.laws.map((law) => {
        const l = loc(law.nameHe);
        return { href: `/lawbook?q=${encodeURIComponent(law.nameHe ?? "")}`, label: l.text, rtl: l.rtl };
      }),
    },
    {
      key: "committees",
      heading: t("nav.committees"),
      more: r.hasMore.committees,
      items: r.committees.map((c) => {
        const l = loc(c.nameHe);
        return { href: `/committees/${c.id}`, label: l.text, rtl: l.rtl };
      }),
    },
    {
      key: "lobbyists",
      heading: t("nav.lobbyists"),
      more: r.hasMore.lobbyists,
      items: r.lobbyists.map((l) => ({
        href: `/lobbyists?q=${encodeURIComponent(l.name)}`,
        label: l.name,
        rtl: l.rtl,
      })),
    },
    {
      key: "glossary",
      heading: t("nav.glossary"),
      items: glossary.map((g) => ({
        // Deep-link to the term itself (GlossaryBrowser scrolls + highlights it).
        href: `/glossary#g-${encodeURIComponent(g.term.he)}`,
        label: partyText(g.term, locale),
        sub: partyText(g.def, locale),
      })),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">{t("search.title")}</h1>
      <GlobalSearch initial={query} autoFocus={!query} />

      {!query ? (
        <p className="text-muted">{t("search.prompt")}</p>
      ) : total === 0 ? (
        <p className="text-muted">{t("search.noResults", { q: query })}</p>
      ) : (
        <>
          <p className="text-sm text-muted">{t("search.resultsFor", { q: query })}</p>
          {groups.map((g) => (
            <section key={g.key} className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                {g.heading}
              </h2>
              <ul className="divide-y divide-black/5 rounded-xl bg-white shadow-sm">
                {g.items.map((it, i) => (
                  <li key={i}>
                    <Link
                      href={it.href}
                      className="block px-4 py-2.5 hover:bg-black/[.02]"
                      dir={it.rtl ? "rtl" : undefined}
                      lang={it.rtl ? "he" : undefined}
                    >
                      <span className="font-medium">{it.label}</span>
                      {it.sub && (
                        <span className="ms-2 text-sm text-muted line-clamp-1">{it.sub}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
              {g.more && (
                <p className="text-xs text-muted">
                  {t("search.showingTop", { count: g.items.length })}
                </p>
              )}
            </section>
          ))}
        </>
      )}
    </div>
  );
}

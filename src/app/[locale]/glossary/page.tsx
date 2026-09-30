import { getTranslations, getLocale } from "next-intl/server";
import { getGlossary, partyText } from "@/lib/content";
import { GlossaryBrowser } from "./GlossaryBrowser";

export const dynamic = "force-dynamic";

export default async function GlossaryPage() {
  const t = await getTranslations("glossary");
  const locale = await getLocale();

  // Localize on the server (def/term fall back locale -> en -> he), then sort
  // by the localized term for a dictionary feel.
  const items = getGlossary()
    .map((g) => ({
      category: g.category,
      term: partyText(g.term, locale),
      termHe: g.term.he, // stable anchor key across locales (#g-<termHe>)
      def: partyText(g.def, locale),
      sources: [g.sourceUrl, ...(g.moreSources ?? [])],
    }))
    .sort((a, b) => a.term.localeCompare(b.term, locale));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </div>
      <GlossaryBrowser items={items} />
    </div>
  );
}

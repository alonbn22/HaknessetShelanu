import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rtlLocales } from "@/i18n/routing";
import { getQuizFile, getRunningLists, listHref, listName, partyText, publisherName, type QuizStance } from "@/lib/content";
import { isHebrew } from "@/lib/text";
import { PartyFinder, type Evidence, type FinderFilter, type FinderGroup, type FinderList } from "./PartyFinder";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("finder");
  return { title: t("title"), openGraph: { title: t("title") } };
}

// Quotes from platforms carry their own quotation marks; a vote tally is a
// record, not a quotation (the positions page's rule).
const quoted = (q: string, basis: string) => (basis === "vote" || /["“„«]/.test(q) ? q : `“${q}”`);

// "Find lists by what they say": tick positions, see which running lists hold
// them — each match shown in the list's own words with its source. Every
// position comes from the compass file (content/quiz.yaml), so the sourcing
// rules are the compass's: platform, leader's words or a Knesset vote.
export default async function FindPage() {
  const t = await getTranslations("finder");
  const tq = await getTranslations("quiz");
  const locale = await getLocale();
  const arrow = rtlLocales.has(locale) ? "←" : "→";
  const file = getQuizFile();

  const lists: FinderList[] = [...getRunningLists().values()].map((l) => ({ slug: l.slug, name: listName(l, locale), href: listHref(l) }));
  const evidence = (s: QuizStance): Evidence => ({
    quote: `${tq(`basis.${s.basis}`)} — ${quoted(partyText(s.quote, locale), s.basis)}`,
    sources: [s.source, ...(s.moreSources ?? [])].map((src) => {
      const publisher = publisherName(src.publisher, locale) ?? src.title;
      return { url: src.url, publisher, rtl: locale !== "he" && isHebrew(publisher) };
    }),
  });
  const groups: FinderGroup[] = [...new Set(file.questions.map((q) => q.topic))].map((id) => ({ id, label: t(`topics.${id}`) }));
  const filters: FinderFilter[] = file.questions.map((q) => {
    const stances = Object.entries(q.stances);
    const where = (keep: (v: number) => boolean) =>
      Object.fromEntries(stances.filter(([, s]) => keep(s.value)).map(([slug, s]) => [slug, evidence(s)]));
    return {
      id: q.id,
      group: q.topic,
      label: partyText(q.text, locale),
      options: [
        { id: "supports", label: t("supports"), lists: where((v) => v >= 1) },
        { id: "opposes", label: t("opposes"), lists: where((v) => v <= -1) },
      ],
      said: stances.map(([slug]) => slug),
    };
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold">{t("title")}</h1>
        <p className="max-w-prose text-muted">{t("subtitle")}</p>
        <p className="max-w-prose text-sm">{t("method")}</p>
        <p className="text-sm font-medium">{t("privacy")}</p>
        <p className="text-sm">
          <Link href="/quiz" className="text-accent-ink underline">
            {t("compassLink")} {arrow}
          </Link>
          {" · "}
          <Link href="/elections/positions" className="text-accent-ink underline">
            {t("positionsLink")} {arrow}
          </Link>
        </p>
      </div>
      <PartyFinder groups={groups} filters={filters} lists={lists} />
    </div>
  );
}

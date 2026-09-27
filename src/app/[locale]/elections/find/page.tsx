import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rtlLocales } from "@/i18n/routing";
import {
  getQuizFile,
  getRunningLists,
  getSelfDescriptions,
  listHref,
  listName,
  partyText,
  publisherName,
  SELF_DESCRIPTION_VALUES,
  type QuizStance,
  type SelfDescriptionDimension,
  type SelfDescriptionTag,
} from "@/lib/content";
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
// rules are the compass's: platform, leader's words or a Knesset vote. What
// the lists call themselves comes from content/self-descriptions.yaml.
export default async function FindPage() {
  const t = await getTranslations("finder");
  const tq = await getTranslations("quiz");
  const locale = await getLocale();
  const arrow = rtlLocales.has(locale) ? "←" : "→";
  const file = getQuizFile();

  const lists: FinderList[] = [...getRunningLists().values()].map((l) => ({ slug: l.slug, name: listName(l, locale), href: listHref(l) }));
  const credit = (src: { url: string; title: string; publisher?: string }) => {
    const publisher = publisherName(src.publisher, locale) ?? src.title;
    return { url: src.url, publisher, rtl: locale !== "he" && isHebrew(publisher) };
  };
  const basis = (s: QuizStance) => tq(`basis.${s.basis}`).replace(/^./, (c) => c.toLocaleUpperCase(locale));
  const evidence = (s: QuizStance): Evidence => ({
    quote: `${basis(s)} — ${quoted(partyText(s.quote, locale), s.basis)}`,
    sources: [s.source, ...(s.moreSources ?? [])].map(credit),
  });

  // First group, "how they describe themselves": one filter per dimension, an
  // option for each value some list uses, every match in the list's own words
  // (content/self-descriptions.yaml — the site assigns no label). Right and
  // left are opposites, so a list that said the other one differs; the other
  // values can go together, so a list that said something else there (national,
  // not Zionist) just didn't say the one ticked.
  const own = Object.entries(getSelfDescriptions().lists);
  const ownWords = (x: SelfDescriptionTag): Evidence => ({
    quote: partyText(x.quote, locale) + (x.note ? ` (${partyText(x.note, locale)})` : ""),
    sources: [credit(x.source)],
  });
  const selfFilters = (Object.keys(SELF_DESCRIPTION_VALUES) as SelfDescriptionDimension[]).flatMap((dim): FinderFilter[] => {
    const label = t(`self.dimensions.${dim}`);
    const tagged = own.flatMap(([slug, tags]) => tags.filter((x) => x.dimension === dim).map((x) => ({ slug, x })));
    const options = SELF_DESCRIPTION_VALUES[dim]
      .map((value) => {
        const name = t(`self.values.${value}`);
        const lists = Object.fromEntries(tagged.filter(({ x }) => x.value === value).map(({ slug, x }) => [slug, ownWords(x)]));
        return { id: value, label: name, claim: `${label}: ${name}`, lists };
      })
      .filter((o) => Object.keys(o.lists).length > 0);
    const said = [...new Set(tagged.map(({ slug }) => slug))];
    return options.length ? [{ id: `self-${dim}`, group: "self", label, options, said, overlap: dim !== "camp" }] : [];
  });

  const groups: FinderGroup[] = [
    { id: "self", label: t("self.group"), note: t("self.note") },
    ...[...new Set(file.questions.map((q) => q.topic))].map((id) => ({ id, label: t(`topics.${id}`) })),
  ];
  const quizFilters: FinderFilter[] = file.questions.map((q) => {
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
      <PartyFinder groups={groups} filters={[...selfFilters, ...quizFilters]} lists={lists} />
    </div>
  );
}

import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rtlLocales } from "@/i18n/routing";
import { getFactionMeta, getQuizFile, getRunningLists, listName, partyText } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { isHebrew } from "@/lib/text";
import { MIN_ANSWERS } from "@/lib/quiz";
import { PartyQuiz, type QuizList, type QuizQ } from "./PartyQuiz";

export const dynamic = "force-dynamic";

// The election compass: ten statements, every list's stance on each one
// sourced to a Knesset vote, its platform or a leader's statement — or shown
// as "no stated position". Nothing is stored or sent anywhere.
export default async function QuizPage() {
  const t = await getTranslations("quiz");
  const locale = await getLocale();
  const file = getQuizFile();
  const registry = getRunningLists();
  const factionColor = new Map([...getFactionMeta().values()].map((f) => [f.id, f.color]));
  const arrow = rtlLocales.has(locale) ? "←" : "→";

  const questions: QuizQ[] = file.questions.map((q) => ({
    id: q.id,
    text: partyText(q.text, locale),
    stances: Object.fromEntries(
      Object.entries(q.stances).map(([slug, s]) => [
        slug,
        {
          value: s.value,
          basis: s.basis,
          voteId: s.voteId,
          recordOf: s.recordOf ? partyText(s.recordOf, locale) : undefined,
          url: s.source.url,
          publisher: s.source.publisher ?? s.source.title,
          publisherRtl: locale !== "he" && isHebrew(s.source.publisher ?? s.source.title),
          quote: partyText(s.quote, locale),
        },
      ]),
    ),
  }));

  // Every running list, in registry order — including lists with few or no
  // sourced positions, which the results show as thinly compared, not hidden.
  const lists: QuizList[] = [...registry.values()].map((l) => ({
    slug: l.slug,
    name: listName(l, locale),
    color: (l.factionId != null && factionColor.get(l.factionId)) || l.color || "var(--neutral)",
    href: l.factionId != null ? `/parties/${l.factionId}` : undefined,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </div>

      <div className="rounded-card border border-line bg-surface p-4 text-sm leading-relaxed">
        <p>{t("intro", { min: MIN_ANSWERS, count: file.questions.length })}</p>
        <p className="mt-2 text-muted">{t("voteRule")}</p>
        <p className="mt-2 text-muted">{t("topicsNote")}</p>
        <p className="mt-2">
          <Link href="/elections/positions" className="text-accent-ink underline">
            {t("positionsLink")} {arrow}
          </Link>
        </p>
      </div>

      <PartyQuiz questions={questions} lists={lists} />

      <p className="text-xs text-muted">{t("disclaimer")}</p>
      <p className="text-xs text-muted">
        {t("sourcesNote")} {t("lastReviewed", { date: formatDate(file.lastReviewed, locale) })}
      </p>
    </div>
  );
}

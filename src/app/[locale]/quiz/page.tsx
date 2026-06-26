import { getTranslations, getLocale } from "next-intl/server";
import { getQuiz, partyText, getPartyProfile } from "@/lib/content";
import { getFaction, factionName, factionColor } from "@/lib/queries";
import { PartyQuiz, type QuizFaction, type QuizQ } from "./PartyQuiz";

export const dynamic = "force-dynamic";

export default async function QuizPage() {
  const t = await getTranslations("quiz");
  const locale = await getLocale();
  const questions = getQuiz();

  // Localize each statement; keep the per-faction stance map.
  const qs: QuizQ[] = questions.map((q) => ({
    id: q.id,
    text: partyText(q.text, locale),
    stances: Object.fromEntries(
      Object.entries(q.stances).map(([k, v]) => [Number(k), v]),
    ),
  }));

  // The set of factions that appear in the quiz.
  const ids = [...new Set(questions.flatMap((q) => Object.keys(q.stances).map(Number)))];
  const factions: QuizFaction[] = ids
    .map((id) => ({
      id,
      name: factionName(id, getFaction(id)?.nameHe ?? "", locale),
      color: factionColor(id),
      ballot: getPartyProfile(id)?.ballotLetters ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </div>

      <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm leading-relaxed">
        {t("intro")}
      </div>

      <PartyQuiz questions={qs} factions={factions} />

      <p className="text-xs text-muted">{t("disclaimer")}</p>
      <p className="text-xs text-muted">{t("sourcesNote")}</p>
    </div>
  );
}

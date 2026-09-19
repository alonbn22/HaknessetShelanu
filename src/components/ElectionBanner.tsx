import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rtlLocales } from "@/i18n/routing";
import { getElectionOutlook, getPolls, partyText, partyTextAttrs } from "@/lib/content";
import { formatDate, formatDateFull } from "@/lib/format";
import { ButtonLink } from "@/components/ui/ButtonLink";

// The one thing every visitor should see first until 27 October: how many
// days are left, what happens next, and the four doors — the election page,
// the compass, the polls and how to vote. Plain words, one number, no chart.
export async function ElectionBanner() {
  const outlook = getElectionOutlook();
  if (!outlook?.expectedDate) return null;
  const t = await getTranslations();
  const locale = await getLocale();
  const arrow = rtlLocales.has(locale) ? "←" : "→";

  // Whole days until election day (local midnight vs local midnight; 0 = today).
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const daysUntil = (iso: string) => Math.round((new Date(`${iso}T00:00:00`).getTime() - todayStart) / 86_400_000);
  const days = daysUntil(outlook.expectedDate);
  if (days < 0) return null; // after the vote the results, not the countdown, are the story

  // The next milestone that is not election day itself.
  const next = (outlook.keyDates ?? []).find(
    (d) => d.date && d.key !== "kd-election" && daysUntil(d.date) >= 0 && daysUntil(d.date) <= days,
  );
  const submitted = outlook.submittedLists?.lists.length ?? 0;
  const polled = outlook.parties.length;
  const polls = getPolls();
  const pollCount = polls?.polls.length ?? 0;

  return (
    <section
      aria-labelledby="election-banner"
      className="rounded-card border border-accent-line bg-accent-soft p-5 sm:p-6"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p id="election-banner" className="text-xs font-semibold uppercase tracking-wide text-accent-ink">
            {t("home.electionEyebrow")}
          </p>
          <p className="font-display text-3xl font-bold leading-tight sm:text-4xl">
            {t("home.daysToElection", { days })}
          </p>
          <p className="text-sm text-muted">
            <span className="font-semibold text-foreground">{formatDateFull(outlook.expectedDate, locale)}</span>
            {submitted > 0 && (
              <>
                {" · "}
                {t("home.listsSummary", { submitted, polled })}
              </>
            )}
            {pollCount > 0 && (
              <>
                {" · "}
                {t("home.pollsSummary", { count: pollCount })}
              </>
            )}
          </p>
          {next?.date && (
            <p className="text-sm">
              <span className="text-muted">{t("home.nextMilestone")}:</span>{" "}
              <span className="font-medium" {...partyTextAttrs(next.label, locale)}>
                {partyText(next.label, locale)}
              </span>
              <span className="text-muted">
                {" · "}
                {formatDate(next.date, locale)} ({t("election.inDays", { days: daysUntil(next.date) })})
              </span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 md:max-w-sm md:justify-end">
          <ButtonLink href="/elections" variant="primary" size="md">
            {t("election.homeCta")} {arrow}
          </ButtonLink>
          <ButtonLink href="/quiz" variant="secondary" size="md">
            {t("nav.quiz")}
          </ButtonLink>
          <ButtonLink href="/elections#polls" variant="secondary" size="md">
            {t("polls.title")}
          </ButtonLink>
          <ButtonLink href="/elections#how-to-vote" variant="secondary" size="md">
            {t("election.howToVote")}
          </ButtonLink>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        <Link href="/elections#all-lists" className="underline hover:text-accent">
          {t("election.allLists", { count: submitted })}
        </Link>
        {" · "}
        {t("election.lastReviewed", { date: formatDate(outlook.lastReviewed, locale) })}
      </p>
    </section>
  );
}

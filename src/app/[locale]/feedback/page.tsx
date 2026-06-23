import { getTranslations, setRequestLocale } from "next-intl/server";
import { FeedbackActions } from "@/components/FeedbackActions";

// Site-wide entry point for the two ticket flows (report incorrect info /
// suggest new info). Per-person pages embed FeedbackActions directly; this page
// is the "site in general" home for both, with the review/sourcing process spelled out.
export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("feedback");

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="leading-relaxed text-lg text-black/70">{t("intro")}</p>

      <section className="space-y-3 rounded-xl bg-white p-6 shadow-sm">
        <FeedbackActions subject="site" />
        <p className="leading-relaxed text-sm text-muted">{t("note")}</p>
        <p className="text-sm text-muted">{t("needGithub")}</p>
      </section>
    </article>
  );
}

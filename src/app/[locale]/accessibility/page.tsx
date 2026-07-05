import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function AccessibilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("a11y.statement");

  const sections = [
    { title: t("conformanceTitle"), body: t("conformance") },
    { title: t("featuresTitle"), body: t("features") },
    { title: t("limitationsTitle"), body: t("limitations") },
  ];

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="leading-relaxed text-lg text-black/70">{t("intro")}</p>

      {sections.map((s) => (
        <section key={s.title} className="space-y-1">
          <h2 className="text-xl font-semibold">{s.title}</h2>
          <p className="leading-relaxed">{s.body}</p>
        </section>
      ))}

      <section className="space-y-2 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">{t("contactTitle")}</h2>
        <p className="leading-relaxed">{t("contact")}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm pt-2">
          <dt className="font-medium text-muted">{t("coordinator")}</dt>
          <dd>{t("coordinatorName")}</dd>
          <dt className="font-medium text-muted">{t("email")}</dt>
          <dd>
            <a className="text-accent hover:underline" href={`mailto:${t("emailValue")}`}>
              {t("emailValue")}
            </a>
          </dd>
          <dt className="font-medium text-muted">{t("phone")}</dt>
          <dd>{t("phoneValue")}</dd>
          <dt className="font-medium text-muted">{t("updated")}</dt>
          <dd>{t("updatedValue")}</dd>
        </dl>
      </section>
    </article>
  );
}

import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalContact, LegalSection, outLink, siteLink } from "@/components/LegalPage";
import { GITHUB_REPO } from "@/lib/constants";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "terms" });
  return { title: t("title") };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("terms");

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="text-lg leading-relaxed text-muted">{t("intro")}</p>

      <LegalSection title={t("unofficialTitle")}>
        <p>{t("unofficial")}</p>
      </LegalSection>

      <LegalSection title={t("infoTitle")}>
        <p>{t("info")}</p>
      </LegalSection>

      <LegalSection title={t("correctionsTitle")}>
        <p>{t.rich("corrections", { link: siteLink("/tickets") })}</p>
        <p>{t("correctionsHow")}</p>
      </LegalSection>

      <LegalSection title={t("sourcesTitle")}>
        <p>{t.rich("sources", { link: siteLink("/sources"), report: siteLink("/tickets") })}</p>
      </LegalSection>

      <LegalSection title={t("compassTitle")}>
        <p>{t.rich("compass", { link: siteLink("/quiz") })}</p>
      </LegalSection>

      <LegalSection title={t("licensesTitle")}>
        <ul className="list-disc space-y-1 ps-6">
          <li>
            {t.rich("licensesCode", {
              license: outLink("https://www.gnu.org/licenses/agpl-3.0.html"),
              link: outLink(`https://github.com/${GITHUB_REPO}`),
            })}
          </li>
          <li>{t.rich("licensesText", { link: outLink("https://creativecommons.org/licenses/by-sa/4.0/") })}</li>
          <li>{t.rich("licensesData", { sources: siteLink("/sources"), credits: siteLink("/credits") })}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("endorseTitle")}>
        <p>{t("endorse")}</p>
      </LegalSection>

      <LegalSection title={t("lawTitle")}>
        <p>{t("law")}</p>
      </LegalSection>

      <LegalContact title={t("contactTitle")} lead={t("contact")} />

      <p className="text-sm text-muted">{t("updated")}</p>
    </article>
  );
}

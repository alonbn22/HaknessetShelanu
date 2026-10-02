import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalContact, LegalSection, outLink, siteLink } from "@/components/LegalPage";

const GITHUB_PRIVACY = "https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement";
const VERCEL_PRIVACY = "https://vercel.com/legal/privacy-notice";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return { title: t("title") };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");
  const code = (chunks: ReactNode) => <code className="rounded-chip bg-surface-sunken px-1">{chunks}</code>;

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="text-lg leading-relaxed text-muted">{t("intro")}</p>

      <LegalSection title={t("keepTitle")}>
        <p>{t("keep")}</p>
      </LegalSection>

      <LegalSection title={t("logsTitle")}>
        <p>{t.rich("logs", { link: outLink(VERCEL_PRIVACY) })}</p>
      </LegalSection>

      <LegalSection id="cookies" title={t("cookiesTitle")}>
        <p>{t("cookies")}</p>
        <p>{t("storage")}</p>
        <ul className="list-disc space-y-1 ps-6">
          <li>{t.rich("storageTheme", { code })}</li>
          <li>{t.rich("storageA11y", { code })}</li>
        </ul>
        <p>{t("clear")}</p>
      </LegalSection>

      <LegalSection title={t("trackingTitle")}>
        <p>{t("tracking")}</p>
      </LegalSection>

      <LegalSection title={t("othersTitle")}>
        <p>{t("othersWikimedia")}</p>
        <p>{t.rich("othersGithub", { link: outLink(GITHUB_PRIVACY) })}</p>
        <p>{t("othersSearch")}</p>
      </LegalSection>

      <LegalSection title={t("compassTitle")}>
        <p>{t.rich("compass", { link: siteLink("/quiz") })}</p>
      </LegalSection>

      <LegalSection title={t("recordsTitle")}>
        <p>{t("records")}</p>
        <p>{t("rights")}</p>
      </LegalSection>

      <LegalContact title={t("contactTitle")} lead={t("contact")} />

      <p className="text-sm text-muted">{t("updated")}</p>
    </article>
  );
}

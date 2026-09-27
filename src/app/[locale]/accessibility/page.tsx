import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalContact, LegalSection, siteLink } from "@/components/LegalPage";

// The accessibility menu's options in its own order and words
// (AccessibilityMenu.tsx), so the statement cannot drift from the menu.
const MENU = [
  "keyboardNav",
  "stopMotion",
  "contrast",
  "textSize",
  "readableFont",
  "highlightHeadings",
  "highlightLinksButtons",
  "grayscale",
  "reset",
] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "a11y.statement" });
  return { title: t("title") };
}

export default async function AccessibilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("a11y");

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">{t("statement.title")}</h1>
      <p className="text-lg leading-relaxed text-muted">{t("statement.intro")}</p>

      <LegalSection title={t("statement.conformanceTitle")}>
        <p>{t("statement.conformance")}</p>
      </LegalSection>

      <LegalSection title={t("statement.testingTitle")}>
        <p>{t("statement.testing")}</p>
      </LegalSection>

      <LegalSection title={t("statement.featuresTitle")}>
        <p>{t("statement.features")}</p>
        <ul className="list-disc space-y-1 ps-6">
          {MENU.map((k) => (
            <li key={k}>{t(k)}</li>
          ))}
        </ul>
        <p>{t.rich("statement.featuresSaved", { link: siteLink("/privacy#cookies") })}</p>
      </LegalSection>

      <LegalSection title={t("statement.limitationsTitle")}>
        <p>{t("statement.limitations")}</p>
      </LegalSection>

      <LegalContact title={t("statement.contactTitle")} lead={t("statement.contact")}>
        <p>{t("statement.fix")}</p>
      </LegalContact>

      <p className="text-sm text-muted">{t("statement.updated")}</p>
    </article>
  );
}

import { getTranslations, setRequestLocale } from "next-intl/server";

const SOURCES = [
  {
    name: "Knesset Open Data (OData V4)",
    url: "https://knesset.gov.il/OdataV4/ParliamentInfo/",
    powersKey: "p_knesset",
    licenseKey: "openData",
  },
  {
    name: "Wikidata / Wikimedia Commons",
    url: "https://www.wikidata.org",
    powersKey: "p_wikidata",
    license: "CC BY-SA (per-file)",
  },
  {
    name: "Google Translate",
    url: "https://translate.google.com",
    powersKey: "p_translate",
    licenseKey: "autoTransNote",
  },
  {
    name: "Claude (Anthropic)",
    url: "https://www.anthropic.com/claude",
    powersKey: "p_translateAi",
    licenseKey: "autoTransNote",
  },
  {
    name: "Ministry of Finance — data.gov.il",
    url: "https://data.gov.il",
    powersKey: "p_finance",
    licenseKey: "openData",
  },
] as const;

export default async function SourcesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sources");

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="text-lg leading-relaxed text-muted">{t("intro")}</p>

      <ul className="space-y-4">
        {SOURCES.map((s) => (
          <li key={s.name} className="rounded-xl bg-white p-5 shadow-sm">
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-fit text-lg font-semibold text-accent-ink hover:underline"
            >
              {s.name}
            </a>
            <p className="mt-1">
              <span className="font-medium">{t("powers")}: </span>
              {t(s.powersKey)}
            </p>
            <p className="mt-1 text-sm text-muted">
              <span className="font-medium">{t("license")}: </span>
              {"license" in s ? s.license : t(s.licenseKey)}
            </p>
          </li>
        ))}
      </ul>

      <section className="rounded-xl border border-black/10 bg-white p-5 space-y-2">
        <h2 className="text-xl font-semibold">{t("editorialTitle")}</h2>
        <p className="leading-relaxed">{t("editorialNote")}</p>
      </section>

      <p className="text-sm text-muted">{t("notOfficial")}</p>
    </article>
  );
}

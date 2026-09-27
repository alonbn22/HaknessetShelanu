import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TableFrame } from "@/components/ui/TableFrame";
import { SourceLinks } from "@/components/SourceLinks";
import { outLink, siteLink } from "@/components/LegalPage";
import { getPhotoCredits, personName } from "@/lib/queries";
import { getRunningLists, listName, listNameAttrs } from "@/lib/content";
import { commonsFilePage, licenseUrl, rtlAttrs } from "@/lib/text";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "credits" });
  return { title: t("title") };
}

const CELL = "px-3 py-2 text-start align-top";

export default async function CreditsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("credits");
  const tc = await getTranslations("common");
  const photos = getPhotoCredits()
    .map((p) => ({ ...p, name: personName(p, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  const logos = [...getRunningLists().values()].flatMap((l) => (l.logo ? [{ list: l, source: l.logo.source }] : []));

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="text-lg leading-relaxed text-muted">{t.rich("intro", { link: siteLink("/sources") })}</p>

      <section className="space-y-3">
        <SectionHeading>{t("photosTitle")}</SectionHeading>
        <p className="leading-relaxed">{t("photosIntro")}</p>
        <TableFrame>
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken">
              <tr>
                <th scope="col" className={CELL}>{t("name")}</th>
                <th scope="col" className={CELL}>{t("author")}</th>
                <th scope="col" className={CELL}>{t("license")}</th>
                <th scope="col" className={CELL}>{t("file")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {photos.map((p) => {
                const deed = licenseUrl(p.photoLicense);
                const file = commonsFilePage(p.photoUrl);
                return (
                  <tr key={p.id}>
                    <th scope="row" className={`${CELL} font-medium`}>
                      <Link href={`/members/${p.id}`} className="text-accent-ink underline" {...rtlAttrs(p.name)}>
                        {p.name}
                      </Link>
                    </th>
                    <td className={CELL}>
                      {/* The author as Commons credits them, in whatever script. */}
                      <span {...rtlAttrs(p.photoAttribution)}>{p.photoAttribution ?? "—"}</span>
                    </td>
                    <td className={`${CELL} whitespace-nowrap`}>
                      {deed ? outLink(deed)(p.photoLicense) : p.photoLicense}
                    </td>
                    <td className={`${CELL} whitespace-nowrap`}>{file && outLink(file)(t("fileLink"))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableFrame>
      </section>

      <section className="space-y-3">
        <SectionHeading>{t("logosTitle")}</SectionHeading>
        <p className="leading-relaxed">{t("logosIntro")}</p>
        <ul className="space-y-1.5">
          {logos.map(({ list, source }) => (
            <li key={list.slug} className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium" {...listNameAttrs(list, locale)}>
                {listName(list, locale)}
              </span>
              <SourceLinks sources={[source]} label={tc("source")} className="text-sm text-muted" />
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}

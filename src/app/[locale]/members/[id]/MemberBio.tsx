import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/format";
import { localizedAttrs } from "@/lib/text";
import type { Localized } from "@/lib/i18n-data";
import type { KnessetBioRow } from "@/lib/queries";

// "Biography & background": born, education, occupation, military service, as
// the Knesset's page for the member states them (scripts/sync/knesset-bio.ts).
//
// A field the Knesset leaves empty is left out, not filled from Wikidata.
// Wikidata is community-edited, and where the two overlap they disagree (Oct
// 2026: 8 of the 155 birth dates both have, 2 of them by a year). Mixing them
// in one block would set unverified claims beside the Knesset's, under a source
// line that links a page which doesn't say them. Leaving them out loses little:
// mostly "politician" as an occupation, plus a few schools; the newest members,
// whose Knesset page has no details yet, show no block until it does.

const FIELDS = ["birthPlace", "education", "professions", "militaryService"] as const;
type Field = (typeof FIELDS)[number];

const lines = (s: string | null | undefined) => (s ?? "").split("\n").filter(Boolean);
const native = (text: string): Localized => ({ text, translated: false, rtl: false });

// The Hebrew lines the block may show, for the page's one translation-cache lookup.
export function knessetBioHebrew(rows: KnessetBioRow[]): string[] {
  const he = rows.find((r) => r.lang === "he");
  return he ? FIELDS.flatMap((f) => lines(he[f])) : [];
}

// One field in the reader's language: the Knesset's own words where it serves
// that language (he/en/ar/ru); else its Hebrew through the translation cache,
// when every line is translated (es/fr, and gaps); else its own English, marked
// as English; else the Hebrew as the cache has it (in English or Hebrew, marked).
export function bioField(
  rows: KnessetBioRow[],
  field: Field,
  locale: string,
  localOf: (he: string) => Localized,
): Localized[] {
  const text = (lang: string) => lines(rows.find((r) => r.lang === lang)?.[field]);
  const own = text(locale);
  if (own.length > 0 || locale === "he") return own.map(native);
  const he = text("he").map(localOf);
  if (he.length > 0 && he.every((l) => l.translated && !l.lang)) return he;
  const en = text("en");
  if (en.length > 0) return en.map((t) => ({ ...native(t), lang: "en" as const }));
  return he;
}

// The member's page on the Knesset website in the reader's language when the
// Knesset has it for this member, else in English, else in Hebrew.
export function knessetPageUrl(rows: KnessetBioRow[], siteCode: number, locale: string): string {
  const lang = [locale, "en"].find((l) => rows.some((r) => r.lang === l)) ?? "he";
  return `https://main.knesset.gov.il/${lang === "he" ? "" : `${lang}/`}mk/apps/mk/mk-personal-details/${siteCode}`;
}

export function MemberBio({
  rows,
  siteCode,
  locale,
  localOf,
}: {
  rows: KnessetBioRow[];
  siteCode: number;
  locale: string;
  localOf: (he: string) => Localized;
}) {
  const t = useTranslations("member");
  const dateOfBirth = rows.find((r) => r.dateOfBirth)?.dateOfBirth ?? null;
  const [place, education, professions, military] = FIELDS.map((f) => bioField(rows, f, locale, localOf));
  const lists = [
    { label: t("education"), items: education },
    { label: t("occupation"), items: professions },
    { label: t("military"), items: military },
  ].filter((row) => row.items.length > 0);
  if (!dateOfBirth && place.length === 0 && lists.length === 0) return null;

  return (
    <Card as="section" className="space-y-4">
      <h2 className="text-xl font-semibold">{t("bioTitle")}</h2>
      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
        {(dateOfBirth || place.length > 0) && (
          <>
            <dt className="font-medium text-muted">{t("born")}</dt>
            <dd className="flex flex-wrap gap-x-2">
              {dateOfBirth && <span>{formatDate(dateOfBirth, locale)}</span>}
              {place.map((p, i) => (
                <span key={i} {...localizedAttrs(p)}>
                  {dateOfBirth || i > 0 ? "· " : ""}
                  {p.text}
                </span>
              ))}
            </dd>
          </>
        )}
        {lists.map((row) => (
          <Fragment key={row.label}>
            <dt className="font-medium text-muted">{row.label}</dt>
            <dd>
              <ul className="space-y-0.5">
                {row.items.map((it, i) => (
                  <li key={i} {...localizedAttrs(it)}>
                    {it.text}
                  </li>
                ))}
              </ul>
            </dd>
          </Fragment>
        ))}
      </dl>
      <p className="text-xs text-muted">
        {t.rich("bioSource", {
          link: (chunks) => (
            <a
              className="text-accent hover:underline"
              href={knessetPageUrl(rows, siteCode, locale)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {chunks}
            </a>
          ),
        })}
      </p>
    </Card>
  );
}

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { rtlLocales } from "@/i18n/routing";

export function Pagination({
  page,
  pages,
  basePath,
  query = {},
}: {
  page: number;
  pages: number;
  basePath: string;
  query?: Record<string, string>;
}) {
  const t = useTranslations("common");
  const locale = useLocale();
  if (pages <= 1) return null;

  // Arrows follow the reading direction, not the page order: in he/ar the
  // previous page lies to the right. The rest of the app already flips this way.
  const rtl = rtlLocales.has(locale);
  const back = rtl ? "→" : "←";
  const forward = rtl ? "←" : "→";

  const href = (p: number) => ({
    pathname: basePath,
    query: { ...query, page: String(p) },
  });

  // The ends of the range are announced as disabled rather than only greyed out,
  // so the state reaches screen readers too. --muted is a themed token that
  // clears AA; the affordance comes from not being a link, not from being faint.
  return (
    <nav className="mt-6 flex items-center justify-center gap-4 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className="text-accent hover:underline">
          {back} {t("previous")}
        </Link>
      ) : (
        <span aria-disabled className="text-muted">
          {back} {t("previous")}
        </span>
      )}
      <span className="text-muted tabular-nums">{t("page", { page, total: pages })}</span>
      {page < pages ? (
        <Link href={href(page + 1)} className="text-accent hover:underline">
          {t("next")} {forward}
        </Link>
      ) : (
        <span aria-disabled className="text-muted">
          {t("next")} {forward}
        </span>
      )}
    </nav>
  );
}

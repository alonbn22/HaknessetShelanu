import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

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
  if (pages <= 1) return null;

  const href = (p: number) => ({
    pathname: basePath,
    query: { ...query, page: String(p) },
  });

  return (
    <nav className="mt-6 flex items-center justify-center gap-4 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className="text-accent hover:underline">
          ← {t("previous")}
        </Link>
      ) : (
        <span className="text-black/30">← {t("previous")}</span>
      )}
      <span className="text-muted">{t("page", { page, total: pages })}</span>
      {page < pages ? (
        <Link href={href(page + 1)} className="text-accent hover:underline">
          {t("next")} →
        </Link>
      ) : (
        <span className="text-black/30">{t("next")} →</span>
      )}
    </nav>
  );
}

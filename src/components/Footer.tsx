import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ReportButton } from "./ReportButton";
import { getLastSyncDate } from "@/lib/queries";

export async function Footer() {
  const t = await getTranslations("footer");
  const locale = await getLocale();
  const lastSync = getLastSyncDate();

  return (
    <footer className="border-t border-black/10 bg-white/60 text-sm text-muted">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-1">
        <p>{t("dataSource")}</p>
        <p>{t("disclaimer")}</p>
        {lastSync && (
          <p>
            {t("lastSync", {
              date: new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(lastSync)),
            })}
          </p>
        )}
        <p className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
          <Link href="/sources" className="text-accent hover:underline">
            {t("sources")}
          </Link>
          <Link href="/accessibility" className="text-accent hover:underline">
            {t("accessibility")}
          </Link>
          <ReportButton variant="link" />
        </p>
      </div>
    </footer>
  );
}

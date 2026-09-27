import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getLastSyncDate } from "@/lib/queries";
import { formatDate } from "@/lib/format";

// Each key is both the page's path and its label in the `footer` namespace.
const PAGES = ["sources", "credits", "privacy", "terms", "accessibility", "tickets"] as const;

export async function Footer() {
  const t = await getTranslations("footer");
  const locale = await getLocale();
  // Members and votes sync separately; each date says when that data was pulled.
  const members = getLastSyncDate("members");
  const votes = getLastSyncDate("KNS_PlenumVote");

  return (
    <footer className="border-t border-black/10 bg-white text-sm text-muted">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-1">
        <p>{t("dataSource")}</p>
        <p>{t("disclaimer")}</p>
        {members && votes && (
          <p>{t("lastSync", { members: formatDate(members, locale), votes: formatDate(votes, locale) })}</p>
        )}
        <p className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
          {PAGES.map((page) => (
            <Link key={page} href={`/${page}`} className="text-accent hover:underline">
              {t(page)}
            </Link>
          ))}
        </p>
      </div>
    </footer>
  );
}

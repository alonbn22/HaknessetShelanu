import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentCommittees, getCommitteeMeetingCounts } from "@/lib/queries";
import { localizePage, committeeLabel } from "@/lib/i18n-data";

export const dynamic = "force-dynamic";

export default async function CommitteesPage() {
  const t = await getTranslations("committees");
  const locale = await getLocale();
  const committees = getCurrentCommittees();
  const counts = getCommitteeMeetingCounts();
  // Most-active first — turns the directory into an activity view. Committees with
  // no materialized sittings (count 0) fall to the bottom, keeping their alpha order.
  const sorted = [...committees].sort(
    (a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0),
  );
  const { cache } = localizePage(committees.map((c) => c.nameHe), locale);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((c) => {
          const name = committeeLabel(c.nameHe, locale, cache);
          const n = counts.get(c.id) ?? 0;
          return (
            <Link
              key={c.id}
              href={`/committees/${c.id}`}
              className="rounded-xl bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className="font-semibold leading-snug"
                dir={name.rtl ? "rtl" : undefined}
                lang={name.rtl ? "he" : undefined}
              >
                {name.text}
              </div>
              {n > 0 && (
                <div className="mt-1 text-xs text-muted">{t("meetingCount", { count: n })}</div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

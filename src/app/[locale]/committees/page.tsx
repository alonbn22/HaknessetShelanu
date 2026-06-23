import { after } from "next/server";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentCommittees } from "@/lib/queries";
import { localizeData, committeeLabel, queueDataTranslations } from "@/lib/i18n-data";

export const dynamic = "force-dynamic";

export default async function CommitteesPage() {
  const t = await getTranslations("committees");
  const locale = await getLocale();
  const committees = getCurrentCommittees();
  const cache = localizeData(committees.map((c) => c.nameHe), locale);
  if (locale !== "he")
    after(() => queueDataTranslations(committees.map((c) => c.nameHe), locale));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {committees.map((c) => {
          const name = committeeLabel(c.nameHe, locale, cache);
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
            </Link>
          );
        })}
      </div>
    </div>
  );
}

import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MemberAvatar } from "@/components/MemberCard";
import { getMostActiveLegislators, personName, factionName } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function LegislatorsPage() {
  const t = await getTranslations("legislators");
  const locale = await getLocale();
  const rows = getMostActiveLegislators(30);
  const max = rows[0]?.billCount ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-black/60">{t("subtitle")}</p>
      </div>

      <ol className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.person.id}>
            <Link
              href={`/members/${r.person.id}`}
              className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="w-6 text-center text-muted">{i + 1}</span>
              <MemberAvatar person={r.person} size={40} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{personName(r.person, locale)}</div>
                {r.factionId != null && (
                  <div className="text-sm text-muted truncate">
                    {factionName(r.factionId, r.factionNameHe ?? "", locale)}
                  </div>
                )}
                <div className="mt-1 h-1.5 rounded-full bg-black/5" dir="ltr">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${(r.billCount / max) * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-end">
                <div className="text-xl font-bold text-accent">{r.billCount}</div>
                <div className="text-xs text-muted">{t("bills")}</div>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

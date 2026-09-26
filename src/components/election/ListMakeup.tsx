import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getRunningLists, partnerFactionIds } from "@/lib/content";
import { localizePage } from "@/lib/i18n-data";
import { factionName, getCurrentFactionsWithSeats } from "@/lib/queries";
import { localizedAttrs } from "@/lib/text";

// Who a list is made of: the registered parties that submitted it together
// (the Central Elections Committee's record), and any sitting Knesset faction
// that runs inside it. Nothing when it is one party on its own.
export async function ListMakeup({
  slug,
  exceptFaction,
  className = "text-xs",
}: {
  slug: string;
  exceptFaction?: number; // the page's own faction, not repeated as a partner
  className?: string;
}) {
  const list = getRunningLists().get(slug);
  if (!list) return null;
  const parties = list.cec?.submittedBy ?? [];
  const partners = partnerFactionIds(slug).filter((id) => id !== exceptFaction);
  if (parties.length < 2 && partners.length === 0) return null;
  const te = await getTranslations("election");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const { loc } = localizePage(parties, locale);
  const factions = new Map(getCurrentFactionsWithSeats().map((f) => [f.id, f]));
  return (
    <div className={`space-y-0.5 ${className}`}>
      {parties.length > 1 && (
        <p>
          <span className="font-semibold">{te("jointList")}:</span>{" "}
          {parties.map((b, k) => (
            <span key={b}>
              {k > 0 && " + "}
              <span {...localizedAttrs(loc(b))}>{loc(b).text}</span>
            </span>
          ))}
        </p>
      )}
      {partners.map((id) => {
        const f = factions.get(id);
        return (
          f && (
            <p key={id}>
              <span className="font-semibold">{te("includesFaction")}:</span>{" "}
              <Link href={`/parties/${id}`} className="text-accent-ink underline">
                {factionName(id, f.nameHe, locale)}
              </Link>{" "}
              <span className="text-muted">({tc("mandates", { count: f.seats })})</span>
            </p>
          )
        );
      })}
    </div>
  );
}

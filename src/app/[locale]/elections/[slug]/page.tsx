import { localizePage } from "@/lib/i18n-data";
import { ListLogo } from "@/components/election/ListLogo";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { rtlLocales } from "@/i18n/routing";
import { PartyEmblem } from "@/components/PartyEmblem";
import { SourceLinks } from "@/components/SourceLinks";
import { ListSections } from "@/components/election/ListSections";
import { ListMakeup } from "@/components/election/ListMakeup";
import {
  getElectionOutlook,
  getRunningLists,
  partyText,
  partyTextAttrs,
  partnerFactionIds,
} from "@/lib/content";
import { formatDate } from "@/lib/format";
import { rtlAttrs, localizedAttrs } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params;
  const list = getRunningLists().get(slug);
  if (!list) return {};
  const name = partyText(list.name, locale);
  return { title: name, openGraph: { title: name } };
}

// One page per list running in the election, in the fashion of the faction
// pages: who it is, what it promises, where the polls put it, where it stands
// on the compass statements, and who is on it. Everything shown is sourced.
export default async function ListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const list = getRunningLists().get(slug);
  if (!list) notFound();

  const t = await getTranslations();
  const locale = await getLocale();
  // A list that continues a sitting faction has one page: the faction's.
  if (list.factionId != null) redirect({ href: `/parties/${list.factionId}`, locale });
  const outlook = getElectionOutlook();
  const approval = outlook?.keyDates?.find((d) => d.key === "kd-approval")?.date;
  const color = list.color ?? "#888888";
  // The CEC's registered list name is data text: translated by the unified cache.
  const { loc } = localizePage([list.cec?.listName.he], locale);
  const surplus = outlook?.surplusAgreements.find((a) => a.between.includes(slug));
  const surplusOther = surplus ? outlook?.parties.find((o) => o.slug === surplus.between.find((s) => s !== slug)) : undefined;

  return (
    <div className="space-y-6">
      <Link href={`/elections#list-${slug}`} className="text-sm text-accent-ink underline">
        {rtlLocales.has(locale) ? "→" : "←"} {t("election.parties")}
      </Link>

      <section className="rounded-xl bg-surface p-6 shadow-sm border-s-4 space-y-3" style={{ borderInlineStartColor: color }}>
        <div className="flex flex-wrap items-center gap-4">
          {list.logo ? (
            <ListLogo logo={list.logo} alt={t("election.logoAlt", { name: partyText(list.name, locale) })} height={64} maxWidth={220} />
          ) : (
            <PartyEmblem factionId={list.factionId ?? 0} nameHe={list.name.he} color={color} size={72} alt={partyText(list.name, locale)} />
          )}
          <div className="min-w-0 space-y-1">
            <h1 className="text-3xl font-bold" {...partyTextAttrs(list.name, locale)}>
              {partyText(list.name, locale)}
            </h1>
            {list.cec && (
              <p className="text-sm text-muted">
                <span {...localizedAttrs(loc(list.cec.listName.he))}>{loc(list.cec.listName.he).text}</span>
                {" · "}
                <a href={list.cec.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-accent-ink">
                  <span dir="rtl" lang="he" className="font-bold">{list.cec.letters}</span>{" "}
                  {list.cec.lettersStatus === "approved"
                    ? t("party.lettersApproved")
                    : t("election.lettersBadgeTitle", { date: approval ? formatDate(approval, locale) : "" })}
                </a>
              </p>
            )}
          </div>
        </div>
        <ListMakeup slug={slug} className="text-sm" />
        {list.logo && (
          <p className="text-xs text-muted">
            <SourceLinks sources={[list.logo.source]} label={t("election.logoCredit")} />
          </p>
        )}
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          {list.leader && (
            <div>
              <div className="text-muted">{t("election.leader")}</div>
              <div className="font-semibold">
                {list.leaderPersonId != null ? (
                  <Link href={`/members/${list.leaderPersonId}`} className="text-accent-ink underline">
                    {partyText(list.leader, locale)}
                  </Link>
                ) : (
                  partyText(list.leader, locale)
                )}
              </div>
            </div>
          )}
          {list.website && (
            <div>
              <div className="text-muted">{t("election.officialSite")}</div>
              <a href={list.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-ink underline" dir="ltr">
                {new URL(list.website).hostname.replace(/^www\./, "")}
              </a>
            </div>
          )}
          {partnerFactionIds(slug).length === 0 && (
            <div>
              <span className="inline-block rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium text-muted">{t("election.newList")}</span>
            </div>
          )}
          {surplus && (
            <div>
              <div className="text-muted">{t("election.surplusWith")}</div>
              <div className="font-semibold">
                {surplusOther ? (
                  <Link href={`/elections/${surplusOther.slug}`} className="text-accent-ink underline">
                    {partyText(surplusOther.name, locale)}
                  </Link>
                ) : (
                  surplus.between.join(" – ")
                )}
              </div>
              <SourceLinks sources={surplus.sources} label={t("common.source")} />
            </div>
          )}
        </div>
        {list.note && (
          <p className="text-sm leading-relaxed" {...partyTextAttrs(list.note, locale)}>
            {partyText(list.note, locale)}
          </p>
        )}
      </section>

      <ListSections slug={slug} />

      <p className="text-xs text-muted">
        <SourceLinks sources={list.sources} label={t("common.source")} />
        {" · "}
        <span {...rtlAttrs(t("election.lastReviewed", { date: formatDate(outlook?.lastReviewed ?? "", locale) }))}>
          {t("election.lastReviewed", { date: formatDate(outlook?.lastReviewed ?? "", locale) })}
        </span>
      </p>
    </div>
  );
}

import { notFound } from "next/navigation";
import { after } from "next/server";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MemberAvatar } from "@/components/MemberAvatar";
import { ReadingBadge, VoteMeaning } from "@/components/ReadingBadge";
import { FeedbackActions } from "@/components/FeedbackActions";
import { VoteRollCall, type Voter } from "./VoteRollCall";
import { formatDateTime } from "@/lib/format";
import { govVoteItemType } from "@/lib/gov-terms";
import {
  getVote,
  getVoteResults,
  getBillForVote,
  getBillSponsors,
  personName,
  factionName,
  factionColor,
} from "@/lib/queries";
import { localizeData, queueDataTranslations, resolveLocalized, type Localized } from "@/lib/i18n-data";
import { localizedAttrs } from "@/lib/text";
import { VOTE_FOR, VOTE_AGAINST, VOTE_ABSTAIN } from "@/lib/constants";

export const dynamic = "force-dynamic";

// Page title/description/OG for search results and social shares. getVote is
// cache()-wrapped, so this and the page body share one lookup; the title uses
// the unified translation cache (Hebrew fallback when untranslated).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const voteId = parseInt(id, 10);
  const vote = Number.isNaN(voteId) ? undefined : getVote(voteId);
  if (!vote) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  const title = resolveLocalized(localizeData([vote.titleHe], locale), vote.titleHe).text;
  const description = t("vote", { title });
  return { title, description, openGraph: { title, description } };
}

export default async function VotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const voteId = parseInt(id, 10);
  const vote = Number.isNaN(voteId) ? undefined : getVote(voteId);
  if (!vote) notFound();

  const t = await getTranslations();
  const locale = await getLocale();
  const results = getVoteResults(voteId);
  const bill = getBillForVote(vote);
  const sponsors = bill ? getBillSponsors(bill.id) : [];

  // Translate the free-text Hebrew on this page (vote title, item name, bill
  // sub-type, and any uncurated faction names) on the fly — one batched lookup,
  // one post-response fill.
  const dataHe = [
    vote.titleHe,
    vote.itemName,
    bill?.subTypeDesc,
    ...results.map((r) => r.factionNameHe),
  ];
  const dataMap = localizeData(dataHe, locale);
  if (locale !== "he") after(() => queueDataTranslations(dataHe, locale));
  const localOf = (he: string | null | undefined) => resolveLocalized(dataMap, he);
  const title = localOf(vote.titleHe);
  const itemName = localOf(vote.itemName);
  const subType = localOf(bill?.subTypeDesc);
  // Faction label: curated metadata first; for an uncurated or null-id faction
  // fall back to the unified cache so non-he users don't see raw Hebrew.
  const factionLabelOf = (fid: number | null, fhe: string | null): Localized => {
    const he = (fhe ?? "").trim();
    if (locale === "he")
      return { text: fid != null ? factionName(fid, he, "he") : he, translated: false, rtl: true };
    if (fid != null) {
      const curated = factionName(fid, he, locale);
      if (curated && curated !== he) return { text: curated, translated: true, rtl: false };
    }
    return localOf(he);
  };
  const billDocs = bill
    ? ([
        { url: bill.explanatoryUrl, label: t("votes.explanatoryNotes") },
        { url: bill.finalLawUrl, label: t("votes.publishedLaw") },
      ].filter((d) => d.url) as { url: string; label: string }[])
    : [];

  // Serializable voter list for the interactive (clickable) roll-call.
  const voters: Voter[] = results.map((r) => {
    const fl = factionLabelOf(r.factionId, r.factionNameHe);
    return {
      id: r.person.id,
      name: personName(r.person, locale),
      firstNameHe: r.person.firstNameHe,
      lastNameHe: r.person.lastNameHe,
      photoUrl: r.person.photoUrl,
      resultCode: r.resultCode,
      factionId: r.factionId,
      factionLabel: fl.text,
      factionLabelRtl: fl.rtl,
      factionColor: r.factionId != null ? factionColor(r.factionId) : "#999999",
    };
  });

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-white p-6 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <ReadingBadge forDesc={vote.forDesc} titleHe={vote.titleHe} />
          {vote.isAccepted != null && (
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                vote.isAccepted
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {vote.isAccepted ? t("votes.accepted") : t("votes.rejected")}
            </span>
          )}
        </div>
        <h1
          className="text-2xl font-bold leading-snug"
          dir={title.translated ? undefined : "rtl"}
          lang={title.translated ? locale : "he"}
        >
          {title.text}
        </h1>
        {title.translated && (
          <p className="text-sm text-muted" dir="rtl" lang="he">
            {t("votes.autoTranslated")} · {t("votes.originalHebrew")}: {vote.titleHe}
          </p>
        )}
        {/* When the vote took place */}
        <div className="rounded-lg bg-black/3 px-4 py-2">
          <div className="text-xs font-semibold text-muted">{t("votes.when")}</div>
          <div className="text-lg font-medium">
            {formatDateTime(vote.dateTime, locale)}
          </div>
        </div>
        {(vote.itemName || vote.itemTypeDesc) && (
          <div className="rounded-lg bg-accent/5 border border-accent/15 p-4 space-y-1">
            <div className="text-sm font-semibold text-accent">
              {t("votes.aboutTitle")}
            </div>
            {vote.itemTypeDesc &&
              (() => {
                const g = govVoteItemType(vote.itemTypeDesc, locale);
                return (
                  <div
                    className="text-xs text-muted"
                    {...localizedAttrs(g)}
                  >
                    {g.text}
                  </div>
                );
              })()}
            {vote.itemName && (
              <p
                className="leading-snug"
                {...localizedAttrs(itemName)}
              >
                {itemName.text}
              </p>
            )}
            <p className="text-xs text-muted pt-1">{t("votes.aboutNote")}</p>
          </div>
        )}
        <VoteMeaning forDesc={vote.forDesc} titleHe={vote.titleHe} />
      </section>

      {bill && (
        <section className="rounded-xl bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{t("votes.whatItSays")}</h2>
            <Link
              href={`/laws/${bill.id}`}
              className="whitespace-nowrap text-sm text-accent hover:underline"
            >
              {t("bill.journey")} →
            </Link>
          </div>
          {bill.subTypeDesc && (
            <div
              className="text-sm text-muted"
              {...localizedAttrs(subType)}
            >
              {subType.text}
            </div>
          )}
          {billDocs.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {billDocs.map((d) => (
                <a
                  key={d.url}
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent hover:bg-accent/10"
                >
                  📄 {d.label}
                </a>
              ))}
            </div>
          )}
          {sponsors.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted">
                {t("votes.sponsors")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {sponsors.map((p) => (
                  <Link
                    key={p.id}
                    href={`/members/${p.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-black/5 py-1 pe-3 ps-1 text-sm hover:bg-black/10"
                  >
                    <MemberAvatar person={p} size={24} />
                    {personName(p, locale)}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t("votes.breakdown")}</h2>
        <VoteRollCall
          voters={voters}
          official={{
            [VOTE_FOR]: vote.totalFor ?? 0,
            [VOTE_AGAINST]: vote.totalAgainst ?? 0,
            [VOTE_ABSTAIN]: vote.totalAbstain ?? 0,
          }}
        />
      </section>

      <div className="pt-2">
        <FeedbackActions context={vote.titleHe ?? `Vote ${vote.id}`} subject="vote" />
      </div>
    </div>
  );
}

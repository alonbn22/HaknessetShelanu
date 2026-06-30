import { notFound } from "next/navigation";
import { after } from "next/server";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MemberAvatar } from "@/components/MemberCard";
import { ReadingBadge } from "@/components/ReadingBadge";
import { getBill, getBillVotes, getBillSponsors, personName } from "@/lib/queries";
import { voteKind, type VoteKind } from "@/lib/votes-meta";
import { localizeData, queueDataTranslations, resolveLocalized } from "@/lib/i18n-data";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

// Canonical legislative order; stages are then sorted by their actual vote date.
const MILESTONES: VoteKind[] = [
  "preliminary",
  "committeeReferral",
  "first",
  "second",
  "second_third",
  "third",
];

export default async function BillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const billId = parseInt(id, 10);
  const bill = Number.isNaN(billId) ? undefined : getBill(billId);
  if (!bill) notFound();

  const t = await getTranslations();
  const locale = await getLocale();

  const votes = getBillVotes(billId);
  const sponsors = getBillSponsors(billId);

  // Localize the Hebrew free-text (name + type + status) via the unified cache.
  const heStrings = [bill.nameHe, bill.subTypeDesc, bill.statusDesc];
  const loc = localizeData(heStrings, locale);
  const name = resolveLocalized(loc, bill.nameHe);
  const subType = resolveLocalized(loc, bill.subTypeDesc);
  const status = resolveLocalized(loc, bill.statusDesc);
  if (locale !== "he") after(() => queueDataTranslations(heStrings, locale));

  // Group the bill's votes into milestone reading stages (chronological); the
  // rest (reservations, clause votes, …) are collapsed into a single count.
  const classified = votes.map((v) => ({ vote: v, kind: voteKind(v.forDesc, v.titleHe) }));
  const stages = MILESTONES.map((kind) => {
    const vs = classified.filter((c) => c.kind === kind).map((c) => c.vote);
    return vs.length ? { kind, count: vs.length, vote: vs[vs.length - 1] } : null;
  })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => String(a.vote.dateTime).localeCompare(String(b.vote.dateTime)));
  const otherCount = votes.length - stages.reduce((sum, st) => sum + st.count, 0);

  // explanatory + first-reading sometimes point to the SAME PDF — dedupe by URL
  // so we don't render a duplicate button (and collide on the React key).
  const seenDoc = new Set<string>();
  const docs = [
    { url: bill.explanatoryUrl, label: t("votes.explanatoryNotes") },
    { url: bill.firstReadingUrl, label: t("bill.firstReadingText") },
    { url: bill.finalLawUrl, label: t("votes.publishedLaw") },
  ].filter(
    (d): d is { url: string; label: string } =>
      Boolean(d.url) && !seenDoc.has(d.url!) && (seenDoc.add(d.url!), true),
  );

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-white p-6 shadow-sm space-y-3">
        <h1
          className="text-2xl font-bold leading-snug"
          dir={name.rtl ? "rtl" : undefined}
          lang={name.rtl ? "he" : undefined}
        >
          {name.text}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {subType.text && (
            <span
              className="rounded-full bg-black/5 px-3 py-1 text-muted"
              dir={subType.rtl ? "rtl" : undefined}
              lang={subType.rtl ? "he" : undefined}
            >
              {subType.text}
            </span>
          )}
          {/* statusDesc is a raw numeric StatusID from the API (not yet decoded
              via KNS_Status), so only show it when it's human-readable text. */}
          {status.text && !/^\d+$/.test(status.text) && (
            <span
              className="rounded-full bg-accent/10 px-3 py-1 font-medium text-accent"
              dir={status.rtl ? "rtl" : undefined}
              lang={status.rtl ? "he" : undefined}
            >
              {status.text}
            </span>
          )}
          {bill.finalLawUrl && (
            <span className="rounded-full bg-green-100 px-3 py-1 font-medium text-green-800">
              {t("votes.becameLaw")}
            </span>
          )}
        </div>
        {docs.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-1">
            {docs.map((d) => (
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
      </section>

      {sponsors.length > 0 && (
        <section className="rounded-xl bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold">{t("votes.sponsors")}</h2>
          <div className="flex flex-wrap gap-2">
            {sponsors.map((p) => (
              <Link
                key={p.id}
                href={`/members/${p.id}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-black/5 py-1 pe-3 ps-1 text-sm hover:bg-black/10"
              >
                <MemberAvatar person={p} size={24} alt={personName(p, locale)} />
                {personName(p, locale)}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t("bill.journey")}</h2>
        {stages.length === 0 ? (
          <p className="text-sm text-muted">{t("bill.noJourney")}</p>
        ) : (
          <ol className="relative space-y-3 border-s-2 border-black/10 ps-5">
            {stages.map((st) => (
              <li key={st.kind} className="relative">
                {/* timeline dot */}
                <span
                  className={`absolute -start-[26px] top-1.5 h-3 w-3 rounded-full ring-4 ring-white ${
                    st.vote.isAccepted ? "bg-green-500" : "bg-red-400"
                  }`}
                />
                <Link
                  href={`/votes/${st.vote.id}`}
                  className="block rounded-xl bg-white p-4 shadow-sm hover:bg-black/[.02]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <ReadingBadge forDesc={st.vote.forDesc} titleHe={st.vote.titleHe} />
                    <span className="text-sm text-muted">
                      {formatDate(st.vote.dateTime, locale)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        st.vote.isAccepted
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {st.vote.isAccepted ? t("votes.accepted") : t("votes.rejected")}
                    </span>
                  </div>
                  <div className="mt-1 text-sm tabular-nums text-muted">
                    {t("votes.for")} {st.vote.totalFor} · {t("votes.against")}{" "}
                    {st.vote.totalAgainst} · {t("votes.abstain")} {st.vote.totalAbstain}
                    {st.count > 1 && ` · ${t("bill.atStage", { count: st.count })}`}
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
        {otherCount > 0 && (
          <p className="text-sm text-muted">{t("bill.relatedVotes", { count: otherCount })}</p>
        )}
      </section>
    </div>
  );
}

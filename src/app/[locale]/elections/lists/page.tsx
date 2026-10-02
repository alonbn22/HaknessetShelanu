import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rtlLocales } from "@/i18n/routing";
import { getElectionOutlook, publisherName } from "@/lib/content";
import { localizeData, localizePage } from "@/lib/i18n-data";
import { formatDate } from "@/lib/format";
import { ListRosters } from "@/components/election/SubmittedLists";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("election");
  return { title: t("allCandidates"), openGraph: { title: t("allCandidates") } };
}

// Every list that submitted for the election, each with its full roster as the
// Central Elections Committee prints it. /elections keeps a compact table of
// the lists (letters, name, head) and links here; each list's section has a
// stable id, "list-<the committee's number>".
export default async function ListsPage() {
  const te = await getTranslations("election");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const outlook = getElectionOutlook();
  const table = outlook?.submittedLists;
  if (!table || table.lists.length === 0) notFound();
  const approval = outlook?.keyDates?.find((d) => d.key === "kd-approval")?.date;
  // List and party names are data text (the unified cache); people's names are
  // the site's transliterations, never machine-translated (candidateName).
  const { loc } = localizePage(
    table.lists.flatMap((l) => [l.name.he, ...(l.submittedBy ?? []), ...(l.candidates ?? []).map((c) => c.party)]),
    locale,
  );
  const names = localizeData(table.lists.flatMap((l) => (l.candidates ?? []).map((c) => c.he)), locale);

  return (
    <div className="space-y-6">
      <Link href="/elections#all-lists" className="inline-block py-1 text-sm text-accent-ink underline">
        {rtlLocales.has(locale) ? "→" : "←"} {te("title")}
      </Link>
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold">{te("allCandidates")}</h1>
        <p className="max-w-prose text-sm text-muted">
          {te("allListsIntro", { date: approval ? formatDate(approval, locale) : "" })}
        </p>
        {locale !== "he" && <p className="max-w-prose text-xs text-muted">{te("namesTransliterated")}</p>}
      </div>
      <ListRosters lists={table.lists} loc={loc} names={names} />
      <p className="text-xs text-muted">
        {te("cecSourceLine")}{" "}
        <a className="underline hover:text-accent-ink" href={table.source.url} target="_blank" rel="noopener noreferrer">
          {publisherName(table.source.publisher, locale) ?? table.source.title}
        </a>
        {" · "}
        {tc("lastChecked", { date: formatDate(table.asOf, locale) })}
      </p>
    </div>
  );
}

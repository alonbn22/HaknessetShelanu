import { getLocale, getTranslations } from "next-intl/server";
import { SourceLinks } from "@/components/SourceLinks";
import { getLastSyncDate } from "@/lib/queries";
import { formatDate } from "@/lib/format";

// The Knesset open-data tables behind a figure the site computes (vote
// participation, party-line voting, bills sponsored, committee seats).
const ODATA = "https://knesset.gov.il/OdataV4/ParliamentInfo/";
export const KNESSET_DATA = {
  votes: { url: `${ODATA}KNS_PlenumVoteResult`, title: "Knesset open data: plenum votes and how each member voted (KNS_PlenumVote, KNS_PlenumVoteResult)", publisher: "Knesset OData" },
  bills: { url: `${ODATA}KNS_BillInitiator`, title: "Knesset open data: bills and their initiators (KNS_Bill, KNS_BillInitiator)", publisher: "Knesset OData" },
  positions: { url: `${ODATA}KNS_PersonToPosition`, title: "Knesset open data: members' positions and committees (KNS_PersonToPosition)", publisher: "Knesset OData" },
};

// "Source: The Knesset (OData) · data as of <vote pull>" under such a figure.
export async function KnessetDataSource({ data }: { data: (keyof typeof KNESSET_DATA)[] }) {
  const t = await getTranslations("common");
  const locale = await getLocale();
  const votesAt = data.includes("votes") ? getLastSyncDate("KNS_PlenumVote") : null;
  return (
    <p className="text-xs text-muted">
      <SourceLinks label={t("source")} sources={data.map((d) => KNESSET_DATA[d])} className="" />
      {votesAt && <> · {t("dataAsOf", { date: formatDate(votesAt, locale) })}</>}
    </p>
  );
}

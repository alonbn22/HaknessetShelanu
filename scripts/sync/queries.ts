import { getDb, schema } from "../../src/db";
import { fetchAllRows, entityUrl } from "./odata";
import { CURRENT_KNESSET } from "../../src/lib/constants";

type Row = Record<string, any>;

// Parliamentary questions (KNS_Query): MK → ministry, with submit/reply dates.
export async function syncQueries() {
  const db = getDb();
  console.log("Syncing parliamentary questions…");
  let n = 0;
  for await (const row of fetchAllRows<Row>(
    entityUrl("KNS_Query", { $filter: `KnessetNum eq ${CURRENT_KNESSET}` }),
  )) {
    const values = {
      knessetNum: row.KnessetNum,
      personId: row.PersonID,
      nameHe: (row.Name ?? "").trim(),
      typeDesc: row.TypeDesc ?? null,
      govMinistryId: row.GovMinistryID ?? null,
      submitDate: row.SubmitDate ?? null,
      replyDate: row.ReplyMinisterDate ?? null,
      lastUpdated: row.LastUpdatedDate,
    };
    db.insert(schema.queries)
      .values({ id: row.Id, ...values })
      .onConflictDoUpdate({ target: schema.queries.id, set: values })
      .run();
    n++;
  }
  console.log(`  ${n} questions`);
}

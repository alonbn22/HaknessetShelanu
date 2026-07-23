import { getDb, schema } from "../../src/db";
import { fetchAllRows, entityUrl } from "./odata";
import { CURRENT_KNESSET } from "../../src/lib/constants";

type Row = Record<string, any>;

export async function syncCommittees() {
  const db = getDb();
  console.log("Syncing committees…");
  let n = 0;
  for await (const row of fetchAllRows<Row>(
    entityUrl("KNS_Committee", { $filter: `KnessetNum eq ${CURRENT_KNESSET}` }),
  )) {
    const values = {
      knessetNum: row.KnessetNum,
      nameHe: (row.Name ?? "").trim(),
      categoryDesc: row.CategoryDesc ?? null,
      typeDesc: row.CommitteeTypeDesc ?? null,
      email: row.Email ?? null,
      isCurrent: !!row.IsCurrent,
      lastUpdated: row.LastUpdatedDate,
    };
    db.insert(schema.committees)
      .values({ id: row.Id, ...values })
      .onConflictDoUpdate({ target: schema.committees.id, set: values })
      .run();
    n++;
  }
  console.log(`  ${n} committees`);
}

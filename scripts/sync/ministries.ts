import { getDb, schema } from "../../src/db";
import { fetchAllRows, entityUrl } from "./odata";

type Row = Record<string, any>;

// Government-ministry registry (KNS_GovMinistry): a few hundred near-static
// rows resolving queries.gov_ministry_id to a name — full refetch each run.
export async function syncGovMinistries() {
  const db = getDb();
  // Self-sufficient DDL (schema-exact) so an un-pushed DB still works.
  db.$client.exec(
    `CREATE TABLE IF NOT EXISTS gov_ministries (
       id integer PRIMARY KEY NOT NULL, name_he text, is_active integer, last_updated text
     )`,
  );
  console.log("Syncing government ministries…");
  let n = 0;
  for await (const row of fetchAllRows<Row>(
    entityUrl("KNS_GovMinistry", { $select: "Id,Name,IsActive,LastUpdatedDate" }),
  )) {
    const values = {
      nameHe: (row.Name ?? "").trim() || null,
      isActive: !!row.IsActive,
      lastUpdated: row.LastUpdatedDate,
    };
    db.insert(schema.govMinistries)
      .values({ id: row.Id, ...values })
      .onConflictDoUpdate({ target: schema.govMinistries.id, set: values })
      .run();
    n++;
  }
  console.log(`  ${n} ministries`);
}

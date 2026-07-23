import { getDb, schema } from "../../src/db";
import { fetchAllRows, entityUrl } from "./odata";

type Row = Record<string, any>;

// The consolidated Israel law book (KNS_IsraelLaw): all Knessets, not filtered.
export async function syncIsraelLaws() {
  const db = getDb();
  // Self-sufficient DDL + indexes (schema-exact) so an un-pushed DB still works.
  db.$client.exec(
    `CREATE TABLE IF NOT EXISTS israel_laws (
       id integer PRIMARY KEY NOT NULL, knesset_num integer, name_he text,
       is_basic_law integer, is_budget_law integer, publication_date text,
       validity_desc text, last_updated text
     )`,
  );
  db.$client.exec("CREATE INDEX IF NOT EXISTS law_name_idx ON israel_laws (name_he)");
  db.$client.exec("CREATE INDEX IF NOT EXISTS law_pubdate_idx ON israel_laws (publication_date)");
  console.log("Syncing Israel law book…");
  let n = 0;
  for await (const row of fetchAllRows<Row>(entityUrl("KNS_IsraelLaw"))) {
    const values = {
      knessetNum: row.KnessetNum ?? null,
      nameHe: (row.Name ?? "").trim(),
      isBasicLaw: !!row.IsBasicLaw,
      isBudgetLaw: !!row.IsBudgetLaw,
      publicationDate: row.PublicationDate ?? null,
      validityDesc: row.LawValidityDesc ?? null,
      lastUpdated: row.LastUpdatedDate,
    };
    db.insert(schema.israelLaws)
      .values({ id: row.Id, ...values })
      .onConflictDoUpdate({ target: schema.israelLaws.id, set: values })
      .run();
    n++;
    if (n % 500 === 0) console.log(`  …${n} laws`);
  }
  console.log(`  ${n} laws`);
}

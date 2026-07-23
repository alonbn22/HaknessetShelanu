import { getDb, schema } from "../../src/db";
import { fetchAllRows, entityUrl } from "./odata";
import { CURRENT_KNESSET } from "../../src/lib/constants";

type Row = Record<string, any>;

// Agenda motions (KNS_Agenda): items an MK moves onto the plenum agenda.
export async function syncAgendas() {
  const db = getDb();
  console.log("Syncing agenda motions…");
  let n = 0;
  for await (const row of fetchAllRows<Row>(
    entityUrl("KNS_Agenda", { $filter: `KnessetNum eq ${CURRENT_KNESSET}` }),
  )) {
    const values = {
      knessetNum: row.KnessetNum,
      initiatorPersonId: row.InitiatorPersonID ?? null,
      nameHe: (row.Name ?? "").trim(),
      subTypeDesc: row.SubTypeDesc ?? null,
      classificationDesc: row.ClassificationDesc ?? null,
      lastUpdated: row.LastUpdatedDate,
    };
    db.insert(schema.agendas)
      .values({ id: row.Id, ...values })
      .onConflictDoUpdate({ target: schema.agendas.id, set: values })
      .run();
    n++;
  }
  console.log(`  ${n} agenda motions`);
}

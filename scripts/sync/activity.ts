import { getDb, schema } from "../../src/db";
import { fetchAllRows, entityUrl } from "./odata";
import { CURRENT_KNESSET } from "../../src/lib/constants";

type Row = Record<string, any>;

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

export async function syncIsraelLaws() {
  const db = getDb();
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

import { getDb, schema } from "../../src/db";
import { fetchAllRows, entityUrl } from "./odata";
import { CURRENT_KNESSET } from "../../src/lib/constants";

type Row = Record<string, any>;

// Committee meetings (KNS_CommitteeSession): past sittings + future scheduled
// ones. ~10.7k rows for the current Knesset; only id-select fields we render.
export async function syncCommitteeSessions() {
  const db = getDb();
  // Self-sufficient DDL (schema-exact) so an un-pushed DB still works.
  db.$client.exec(
    `CREATE TABLE IF NOT EXISTS committee_sessions (
       id integer PRIMARY KEY, committee_id integer, knesset_num integer,
       start_date text, finish_date text, type_desc text, status_desc text,
       location text, session_url text, broadcast_url text, last_updated text
     )`,
  );
  db.$client.exec(
    "CREATE INDEX IF NOT EXISTS cmt_session_committee_idx ON committee_sessions (committee_id)",
  );
  console.log("Syncing committee sessions…");
  let n = 0;
  for await (const row of fetchAllRows<Row>(
    entityUrl("KNS_CommitteeSession", {
      $filter: `KnessetNum eq ${CURRENT_KNESSET}`,
      $select:
        "Id,CommitteeID,KnessetNum,StartDate,FinishDate,TypeDesc,StatusDesc,Location,SessionUrl,BroadcastUrl,LastUpdatedDate",
    }),
  )) {
    const values = {
      committeeId: row.CommitteeID ?? null,
      knessetNum: row.KnessetNum,
      startDate: row.StartDate ?? null,
      finishDate: row.FinishDate ?? null,
      typeDesc: row.TypeDesc ?? null,
      statusDesc: row.StatusDesc ?? null,
      location: row.Location ?? null,
      // The agenda URL uses http; upgrade so the link isn't blocked/mixed-content.
      sessionUrl: row.SessionUrl ? row.SessionUrl.replace(/^http:/, "https:") : null,
      broadcastUrl: row.BroadcastUrl ?? null,
      lastUpdated: row.LastUpdatedDate,
    };
    db.insert(schema.committeeSessions)
      .values({ id: row.Id, ...values })
      .onConflictDoUpdate({ target: schema.committeeSessions.id, set: values })
      .run();
    n++;
    if (n % 2000 === 0) console.log(`  …${n} sessions`);
  }
  console.log(`  ${n} committee sessions`);
}

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

import { getDb, schema } from "../../src/db";
import { fetchAllRows, fetchAll, entityUrl } from "./odata";
import { CURRENT_KNESSET } from "../../src/lib/constants";

type Row = Record<string, any>;

// Committee meetings (KNS_CommitteeSession): past sittings + future scheduled
// ones. ~10.7k rows for the current Knesset; only id-select fields we render.
export async function syncCommitteeSessions() {
  const db = getDb();
  // Self-sufficient DDL (schema-exact) so an un-pushed DB still works.
  db.$client.exec(
    `CREATE TABLE IF NOT EXISTS committee_sessions (
       id integer PRIMARY KEY NOT NULL, committee_id integer, knesset_num integer,
       start_date text, finish_date text, type_desc text, status_desc text,
       location text, session_url text, broadcast_url text, last_updated text
     )`,
  );
  db.$client.exec(
    "CREATE INDEX IF NOT EXISTS cmt_session_committee_idx ON committee_sessions (committee_id, start_date)",
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

// Normalize a Knesset file link: fix backslashes, force https, and collapse the
// accidental double slash some paths carry (e.g. fs.knesset.gov.il//16/…)
// without touching the protocol separator.
const fixDocUrl = (p: string | null | undefined) =>
  p ? p.replace(/\\/g, "/").replace(/^http:/, "https:").replace(/([^:])\/\/+/g, "$1/") : null;

// Agenda items + documents for committee meetings (KNS_CmtSessionItem,
// KNS_DocumentCommitteeSession). Neither entity carries KnessetNum, and only
// eq/in() filters are supported on them — so we batch by the CommitteeSessionID
// values we hold (current-Knesset sittings), mirroring bills.ts. Rows per
// meeting are tiny (≈1 agenda item, ≈1-2 docs), so a 50-id batch is usually a
// single page.
//
// SCOPE: by default only recent + upcoming meetings (`sinceDays`), because the
// source API is slow (multi-second latency spikes) and a full 10.7k-meeting pass
// runs ~30-40 min — too long for the ~6h sync's budget. That window is exactly
// what the UI surfaces (each committee shows its most-recent + next meetings);
// older meetings are finalized, so their agendas/protocols are captured once and
// don't change. Pass `sinceDays: null` for a one-off full backfill. Protocols
// lag the meeting by days-to-weeks; a meeting with no docs yet is "not finalized
// yet", not an error — a later sync backfills it while it's still in-window.
export async function syncCommitteeSessionDetails(sinceDays: number | null = 120) {
  const db = getDb();
  // Self-sufficient DDL (schema-exact) so an un-pushed DB still works.
  db.$client.exec(
    `CREATE TABLE IF NOT EXISTS committee_session_items (
       id integer PRIMARY KEY NOT NULL, session_id integer, ordinal integer,
       name_he text, item_type_id integer, last_updated text
     )`,
  );
  db.$client.exec(
    "CREATE INDEX IF NOT EXISTS cmt_item_session_idx ON committee_session_items (session_id)",
  );
  db.$client.exec(
    `CREATE TABLE IF NOT EXISTS committee_session_docs (
       id integer PRIMARY KEY NOT NULL, session_id integer, group_type_id integer,
       group_type_desc text, name_he text, application_desc text,
       file_path text, last_updated text
     )`,
  );
  db.$client.exec(
    "CREATE INDEX IF NOT EXISTS cmt_doc_session_idx ON committee_session_docs (session_id)",
  );

  // The session ids we hold are already current-Knesset only. Restrict to the
  // recency window (recent past + all future) unless a full backfill is asked
  // for. start_date is ISO text, compared lexically against the cutoff — the
  // same coarse string compare getCommitteeSessions() uses (offset skew is
  // irrelevant across a 120-day window).
  const ids = (
    sinceDays == null
      ? db.$client.prepare("SELECT id FROM committee_sessions").all()
      : db.$client
          .prepare("SELECT id FROM committee_sessions WHERE start_date >= ?")
          .all(new Date(Date.now() - sinceDays * 86_400_000).toISOString())
  ).map((r) => (r as { id: number }).id);
  if (ids.length === 0) {
    console.log("Skipping committee session details — no sessions in window yet.");
    return;
  }

  console.log(`Syncing committee agendas + documents for ${ids.length} meetings…`);
  let items = 0;
  let docs = 0;
  for (let i = 0; i < ids.length; i += 50) {
    const inList = `(${ids.slice(i, i + 50).join(",")})`;
    const [itemRows, docRows] = await Promise.all([
      fetchAll<Row>(
        entityUrl("KNS_CmtSessionItem", {
          $filter: `CommitteeSessionID in ${inList}`,
          $select: "Id,CommitteeSessionID,Ordinal,Name,ItemTypeID,LastUpdatedDate",
        }),
      ),
      fetchAll<Row>(
        entityUrl("KNS_DocumentCommitteeSession", {
          $filter: `CommitteeSessionID in ${inList}`,
          $select:
            "Id,CommitteeSessionID,GroupTypeID,GroupTypeDesc,DocumentName,ApplicationDesc,FilePath,LastUpdatedDate",
        }),
      ),
    ]);

    for (const row of itemRows) {
      const values = {
        sessionId: row.CommitteeSessionID ?? null,
        ordinal: row.Ordinal ?? null,
        nameHe: (row.Name ?? "").trim() || null,
        itemTypeId: row.ItemTypeID ?? null,
        lastUpdated: row.LastUpdatedDate,
      };
      db.insert(schema.committeeSessionItems)
        .values({ id: row.Id, ...values })
        .onConflictDoUpdate({ target: schema.committeeSessionItems.id, set: values })
        .run();
      items++;
    }
    for (const row of docRows) {
      const values = {
        sessionId: row.CommitteeSessionID ?? null,
        groupTypeId: row.GroupTypeID ?? null,
        groupTypeDesc: (row.GroupTypeDesc ?? "").trim() || null,
        nameHe: (row.DocumentName ?? "").trim() || null,
        applicationDesc: row.ApplicationDesc ?? null,
        filePath: fixDocUrl(row.FilePath),
        lastUpdated: row.LastUpdatedDate,
      };
      db.insert(schema.committeeSessionDocs)
        .values({ id: row.Id, ...values })
        .onConflictDoUpdate({ target: schema.committeeSessionDocs.id, set: values })
        .run();
      docs++;
    }
    if (i > 0 && i % 2000 === 0) console.log(`  …${i}/${ids.length} meetings`);
  }
  console.log(`  ${items} agenda items, ${docs} committee documents`);
}

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

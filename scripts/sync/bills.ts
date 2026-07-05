import { sql, eq } from "drizzle-orm";
import { getDb, schema } from "../../src/db";
import { fetchAll, entityUrl } from "./odata";

type Row = Record<string, any>;

const fixUrl = (p: string | null | undefined) =>
  p ? p.replace(/\\/g, "/").replace(/([^:])\/\/+/g, "$1/") : null;

// Pick the best "what it means" document and the final-law document from a
// bill's document set. Prefer PDFs.
function pickDocs(docs: Row[]) {
  const byType = (substr: string, ext?: string) =>
    docs.find(
      (d) =>
        (d.GroupTypeDesc ?? "").includes(substr) &&
        (!ext || (d.FilePath ?? "").toLowerCase().endsWith(ext)),
    );
  const explanatory =
    byType("לקריאה הראשונה", ".pdf") ||
    byType("לדיון מוקדם", ".pdf") ||
    byType("לקריאה השנייה", ".pdf") ||
    byType("לקריאה הראשונה") ||
    byType("לדיון מוקדם");
  const firstReading = byType("לקריאה הראשונה", ".pdf") || byType("לקריאה הראשונה");
  const finalLaw = byType("פרסום ברשומות", ".pdf") || byType("פרסום ברשומות");
  return {
    explanatoryUrl: fixUrl(explanatory?.FilePath),
    firstReadingUrl: fixUrl(firstReading?.FilePath),
    finalLawUrl: fixUrl(finalLaw?.FilePath),
  };
}

// Sync bills referenced by our bill-reading votes (votes.itemId === BillID),
// with their sponsors and key document links.
export async function syncBills() {
  const db = getDb();
  console.log("Syncing bills (legislation referenced by votes)…");

  // KNS_Status decodes the numeric StatusID into its official Hebrew label
  // (which then localizes via the unified translation cache). Fetched fresh
  // each run — it's one small page and the statuses rarely change.
  const statusMap = new Map<number, string>();
  try {
    for (const s of await fetchAll<Row>(entityUrl("KNS_Status"))) {
      if (s.Id != null && s.Desc) statusMap.set(s.Id, String(s.Desc).trim());
    }
    console.log(`  ${statusMap.size} status labels loaded`);
  } catch (err) {
    // Non-fatal: bills fall back to the numeric id (the UI hides numerics).
    console.warn("  KNS_Status fetch failed; keeping numeric statuses", err);
  }

  // Distinct bill IDs = item ids of bill-reading votes.
  const billIds = db
    .selectDistinct({ id: schema.votes.itemId })
    .from(schema.votes)
    .where(sql`${schema.votes.forDesc} LIKE '%קריאה%' AND ${schema.votes.itemId} IS NOT NULL`)
    .all()
    .map((r) => r.id as number);
  console.log(`  ${billIds.length} candidate bills`);

  let bills = 0;
  let initiators = 0;

  for (let i = 0; i < billIds.length; i += 25) {
    const batch = billIds.slice(i, i + 25);
    const inList = `(${batch.join(",")})`;

    const [billRows, docRows, initRows] = await Promise.all([
      fetchAll<Row>(entityUrl("KNS_Bill", { $filter: `Id in ${inList}` })),
      fetchAll<Row>(entityUrl("KNS_DocumentBill", { $filter: `BillID in ${inList}` })),
      fetchAll<Row>(entityUrl("KNS_BillInitiator", { $filter: `BillID in ${inList}` })),
    ]);

    const docsByBill = new Map<number, Row[]>();
    for (const d of docRows) {
      if (!docsByBill.has(d.BillID)) docsByBill.set(d.BillID, []);
      docsByBill.get(d.BillID)!.push(d);
    }

    for (const b of billRows) {
      const docs = pickDocs(docsByBill.get(b.Id) ?? []);
      const values = {
        knessetNum: b.KnessetNum,
        nameHe: (b.Name ?? "").trim(),
        subTypeDesc: b.SubTypeDesc ?? null,
        // Official Hebrew status label; numeric fallback only if the lookup
        // failed (the bill page hides pure-numeric statuses).
        statusDesc: b.StatusID ? (statusMap.get(b.StatusID) ?? String(b.StatusID)) : null,
        ...docs,
        lastUpdated: b.LastUpdatedDate,
      };
      db.insert(schema.bills)
        .values({ id: b.Id, ...values })
        .onConflictDoUpdate({ target: schema.bills.id, set: values })
        .run();
      bills++;
    }

    for (const it of initRows) {
      const values = {
        isInitiator: !!it.IsInitiator,
        ordinal: it.Ordinal ?? null,
      };
      db.insert(schema.billInitiators)
        .values({ billId: it.BillID, personId: it.PersonID, ...values })
        .onConflictDoUpdate({
          target: [schema.billInitiators.billId, schema.billInitiators.personId],
          set: values,
        })
        .run();
      initiators++;
    }
    if (i % 250 === 0 && i > 0) console.log(`  …${i}/${billIds.length} bills`);
  }
  console.log(`  ${bills} bills, ${initiators} sponsor links`);
}

void eq;

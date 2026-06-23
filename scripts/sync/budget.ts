import { sql } from "drizzle-orm";
import { getDb, schema } from "../../src/db";

// State budget from the Ministry of Finance open data on data.gov.il.
//
// Detailed itemized budgets (ministry→area→program→line, WITH names) are
// published as open data through 2018. We load the last 10 such years
// (2009–2018) at line level (net expenditure, NIS thousands).
//
// For more recent years (2019→) only the Accountant-General execution reports
// are open (program codes, no names, in shekels). From those we take the
// approved gross total per year for the timeline + the current-Knesset total.

// data.gov.il records have dynamic Hebrew keys.
type Row = Record<string, string | number | null>;

// Detailed named datasets → which years each one contains.
const DETAILED: { res: string; years: number[] }[] = [
  { res: "3995b82f-8713-4185-a0ee-26a8c79ca561", years: [2009, 2010, 2011, 2012] },
  { res: "a1b33128-ed29-496a-93a6-d87a788bb681", years: [2013, 2014, 2015] },
  { res: "c59d89ca-f38e-4a6a-b542-4f91054ccdc1", years: [2016] },
  { res: "01d99090-aee0-45e8-8817-de404371d636", years: [2017, 2018] },
];

// Recent execution reports → approved gross total only.
const RECENT: { year: number; res: string }[] = [
  { year: 2019, res: "053eeabf-7cb3-4b90-b553-5a5d1f01c605" },
  { year: 2022, res: "1ce4281d-a8f5-4800-8f34-d1f90d94774e" },
  { year: 2023, res: "087ff227-cd67-489c-a32b-830c6e40a7eb" },
  { year: 2024, res: "0a82e97f-a9dc-4c6d-9351-8ad24c78129c" },
  { year: 2025, res: "ae57077c-3c53-42c0-8e29-e618c5fc8c30" },
];

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const str = (v: unknown): string | null => String(v ?? "").trim() || null;

async function fetchFiltered(res: string, filters: Record<string, unknown>): Promise<Row[]> {
  const out: Row[] = [];
  let offset = 0;
  for (;;) {
    const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${res}&limit=10000&offset=${offset}&filters=${encodeURIComponent(JSON.stringify(filters))}`;
    const res2 = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!res2.ok) throw new Error(`data.gov.il HTTP ${res2.status}`);
    const json = (await res2.json()) as { result: { records: Row[]; total: number } };
    out.push(...json.result.records);
    offset += 10000;
    if (offset >= json.result.total) break;
  }
  return out;
}

async function fetchAll(res: string): Promise<Row[]> {
  return fetchFiltered(res, {});
}

function ensureTables() {
  const db = getDb();
  db.run(sql`CREATE TABLE IF NOT EXISTS budget_lines (
    id integer PRIMARY KEY AUTOINCREMENT, year integer NOT NULL,
    section_code integer, section_name_he text, area_code integer, area_name_he text,
    program_code integer, program_name_he text, takana_code integer, takana_name_he text,
    net_thousands integer)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS budget_section_idx ON budget_lines (year, section_code)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS budget_year_idx ON budget_lines (year)`);
  db.run(sql`CREATE TABLE IF NOT EXISTS budget_totals (
    year integer PRIMARY KEY, total_thousands integer, basis text, detailed integer NOT NULL DEFAULT 0)`);
}

export async function syncBudget() {
  const db = getDb();
  ensureTables();

  // ---- detailed years (net, itemized) ----
  for (const { res, years } of DETAILED) {
    for (const year of years) {
      // Prefer the approved budget; fall back to the original.
      let budType = "מאושר";
      let lines = await fetchFiltered(res, {
        שנה: year,
        "הוצאה/הכנסה": "הוצאה",
        "סוג תקציב": budType,
      });
      if (lines.length === 0) {
        budType = "מקורי";
        lines = await fetchFiltered(res, {
          שנה: year,
          "הוצאה/הכנסה": "הוצאה",
          "סוג תקציב": budType,
        });
      }
      if (lines.length === 0) {
        console.log(`  ${year}: no expenditure rows`);
        continue;
      }
      db.run(sql`DELETE FROM budget_lines WHERE year = ${year}`);
      const rows = lines.map((r) => ({
        year,
        sectionCode: num(r["קוד סעיף"]),
        sectionNameHe: str(r["שם סעיף"]),
        areaCode: num(r["קוד תחום"]),
        areaNameHe: str(r["שם תחום"]),
        programCode: num(r["קוד תכנית"]),
        programNameHe: str(r["שם תכנית"]),
        takanaCode: num(r["קוד תקנה"]),
        takanaNameHe: str(r["שם תקנה"]),
        netThousands: num(r["הוצאה נטו"]),
      }));
      for (let i = 0; i < rows.length; i += 500) {
        db.insert(schema.budgetLines).values(rows.slice(i, i + 500)).run();
      }
      const total = Math.round(rows.reduce((s, r) => s + (r.netThousands ?? 0), 0));
      db.run(
        sql`INSERT INTO budget_totals (year, total_thousands, basis, detailed) VALUES (${year}, ${total}, 'net', 1)
            ON CONFLICT(year) DO UPDATE SET total_thousands=${total}, basis='net', detailed=1`,
      );
      console.log(`  ${year} (${budType}): ${rows.length} lines · net ≈ ₪${(total / 1e6).toFixed(1)}B`);
    }
  }

  // ---- code → name dictionaries from the detailed years (newest wins) ----
  // Recent execution reports carry program codes but no names; the budget
  // structure is stable enough that we can resolve names from the detailed
  // years (83% of recent programs match by code; 100% match a ministry).
  const dictRows = db
    .select({
      programCode: schema.budgetLines.programCode,
      programNameHe: schema.budgetLines.programNameHe,
      areaNameHe: schema.budgetLines.areaNameHe,
      sectionCode: schema.budgetLines.sectionCode,
      sectionNameHe: schema.budgetLines.sectionNameHe,
    })
    .from(schema.budgetLines)
    .orderBy(schema.budgetLines.year)
    .all();
  const progDict = new Map<number, { name: string | null; area: string | null }>();
  const secDict = new Map<number, string | null>();
  for (const r of dictRows) {
    if (r.programCode != null && r.programNameHe)
      progDict.set(r.programCode, { name: r.programNameHe, area: r.areaNameHe });
    if (r.sectionCode != null && r.sectionNameHe) secDict.set(r.sectionCode, r.sectionNameHe);
  }

  // ---- recent years (program-level, gross; names resolved from the dict) ----
  for (const { year, res } of RECENT) {
    try {
      const recs = await fetchAll(res);
      const progRows = recs.filter((r) => /^\d{6}$/.test(String(r["תוכנית"])));
      if (progRows.length === 0) {
        console.log(`  ${year}: no program rows`);
        continue;
      }
      db.run(sql`DELETE FROM budget_lines WHERE year = ${year}`);
      const rows = progRows.map((r) => {
        const code = parseInt(String(r["תוכנית"]), 10);
        const sectionCode = Math.floor(code / 10000);
        const grossShekels = Number(r["תקציב ברוטו על שינוייו"]) || 0;
        const dict = progDict.get(code);
        return {
          year,
          sectionCode,
          sectionNameHe: secDict.get(sectionCode) ?? null,
          areaCode: null,
          areaNameHe: dict?.area ?? null,
          programCode: code,
          programNameHe: dict?.name ?? null,
          takanaCode: null,
          takanaNameHe: null,
          netThousands: Math.round(grossShekels / 1000), // gross, in thousands
        };
      });
      for (let i = 0; i < rows.length; i += 500) {
        db.insert(schema.budgetLines).values(rows.slice(i, i + 500)).run();
      }
      const totalThousands = rows.reduce((s, r) => s + (r.netThousands ?? 0), 0);
      const named = rows.filter((r) => r.programNameHe).length;
      db.run(
        sql`INSERT INTO budget_totals (year, total_thousands, basis, detailed) VALUES (${year}, ${totalThousands}, 'gross', 1)
            ON CONFLICT(year) DO UPDATE SET total_thousands=${totalThousands}, basis='gross', detailed=1`,
      );
      console.log(
        `  ${year} (gross): ${rows.length} programs, ${named} named · ≈ ₪${(totalThousands / 1e6).toFixed(1)}B`,
      );
    } catch (e) {
      console.warn(`  ${year}: ${(e as Error).message}`);
    }
  }
}

if (process.argv[1] && process.argv[1].endsWith("budget.ts")) {
  syncBudget()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

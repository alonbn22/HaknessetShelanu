import { sql } from "drizzle-orm";
import { getDb, schema } from "../../src/db";
import { fetchAllRows } from "./odata";

// Knesset lobbyist registry lives on a separate OData service.
const LOBBYIST_BASE = "https://knesset.gov.il/OdataV4/Lobbyist";

type Row = Record<string, string | number | boolean | null>;

const str = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return s || null;
};

function ensureTables() {
  const db = getDb();
  db.run(sql`CREATE TABLE IF NOT EXISTS lobbyists (
    id integer PRIMARY KEY, full_name text, permit_type text,
    corporation_name text, is_independent integer, practice_framework text)`);
  db.run(sql`CREATE TABLE IF NOT EXISTS lobbyist_clients (
    id integer PRIMARY KEY, lobbyist_id integer, client_name text, representation text)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS lobbyist_client_idx ON lobbyist_clients (lobbyist_id)`);
}

export async function syncLobbyists() {
  const db = getDb();
  ensureTables();
  console.log("Syncing lobbyists…");

  const lobbyists: Row[] = [];
  for await (const r of fetchAllRows<Row>(`${LOBBYIST_BASE}/V_Lobbyists`)) lobbyists.push(r);
  const clients: Row[] = [];
  for await (const r of fetchAllRows<Row>(`${LOBBYIST_BASE}/V_LobbyistsClients`)) clients.push(r);

  db.run(sql`DELETE FROM lobbyists`);
  db.run(sql`DELETE FROM lobbyist_clients`);

  // Drop obvious test/placeholder rows that exist in the source registry.
  const isTest = (s: string | null) => !!s && /test|בדיקה|דוגמ/i.test(s);
  const lRows = lobbyists
    .map((r) => ({
      id: Number(r.Id),
      fullName: str(r.FullName),
      permitType: str(r.PermitTypeValue),
      corporationName: str(r.CorporationName),
      isIndependent: !!r.IsIndependent,
      practiceFramework: str(r.PracticeFramework),
    }))
    .filter((r) => r.fullName && !isTest(r.fullName) && !isTest(r.corporationName));
  const validIds = new Set(lRows.map((r) => r.id));
  for (let i = 0; i < lRows.length; i += 200)
    db.insert(schema.lobbyists).values(lRows.slice(i, i + 200)).run();

  // De-dupe client rows by Id (the view can repeat).
  const seen = new Set<number>();
  const cRows = clients
    .map((r) => ({
      id: Number(r.Id),
      lobbyistId: r.LobbyistID != null ? Number(r.LobbyistID) : null,
      clientName: str(r.Name),
      representation: str(r.ClientsNames),
    }))
    .filter((r) => r.lobbyistId != null && validIds.has(r.lobbyistId))
    .filter((r) => !isTest(r.clientName))
    .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  for (let i = 0; i < cRows.length; i += 200)
    db.insert(schema.lobbyistClients).values(cRows.slice(i, i + 200)).run();

  console.log(`  ${lRows.length} lobbyists, ${cRows.length} client links`);
}

if (process.argv[1] && process.argv[1].endsWith("lobbyists.ts")) {
  syncLobbyists()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

const DB_PATH = path.join(process.cwd(), "data", "knesset.db");

let _db: ReturnType<typeof createDb> | null = null;

function openSqlite() {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 10000"); // wait out concurrent sync writers
  return sqlite;
}

function createDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sqlite = openSqlite();
  try {
    // Touch the catalog so a bad open surfaces here with a clear message rather
    // than mid-request deep in a query.
    sqlite.prepare("SELECT 1 FROM sqlite_master LIMIT 1").get();
  } catch (err) {
    const msg = String((err as Error)?.message ?? "");
    if (!/malformed|not a database/i.test(msg)) throw err;
    // Almost always a stale -wal/-shm left next to data/knesset.db after the
    // file was swapped underneath an open connection (e.g. a git pull). The
    // committed .db is fine; the sidecars just need removing. We deliberately do
    // NOT delete them here: a sidecar is shared memory for the WAL, and removing
    // one that a live connection (dev server, sync) holds corrupts the database
    // for that writer. Cleanup must happen while nothing has the DB open, so we
    // surface an actionable error instead.
    try {
      sqlite.close();
    } catch {
      /* already broken */
    }
    throw new Error(
      `data/knesset.db could not be opened ("${msg}"). This is usually a stale ` +
        `WAL left after the .db was replaced. Stop every dev/sync process, then ` +
        `run: npm run db:clean (or: rm -f data/knesset.db-wal data/knesset.db-shm).`,
    );
  }
  return drizzle(sqlite, { schema });
}

export function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

export { schema };

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
  let sqlite = openSqlite();
  try {
    // Touch the catalog to force WAL replay up front, surfacing a stale-sidecar
    // mismatch here rather than mid-request.
    sqlite.prepare("SELECT 1 FROM sqlite_master LIMIT 1").get();
  } catch (err) {
    // A leftover -wal/-shm from a prior connection that no longer matches the
    // .db (e.g. the file was swapped by a git pull) makes SQLite report the
    // database "malformed", even though the committed .db is fine. Drop the
    // stale sidecars and reopen so the site self-heals instead of 500ing.
    const msg = String((err as Error)?.message ?? "");
    if (!/malformed|not a database/i.test(msg)) throw err;
    try {
      sqlite.close();
    } catch {
      /* already broken */
    }
    for (const ext of ["-wal", "-shm", "-journal"]) {
      try {
        fs.rmSync(DB_PATH + ext, { force: true });
      } catch {
        /* best effort */
      }
    }
    sqlite = openSqlite();
    sqlite.prepare("SELECT 1 FROM sqlite_master LIMIT 1").get(); // rethrow if truly corrupt
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

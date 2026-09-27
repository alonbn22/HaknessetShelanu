import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

const DB_PATH = path.join(process.cwd(), "data", "knesset.db");

let _db: ReturnType<typeof createDb> | null = null;

// The site only reads, so it opens the committed file read-only: with the
// rollback journal that `npm run db:clean` leaves, that needs no -wal/-shm
// sidecars and works on a read-only filesystem (Vercel). Scripts that write
// (sync, warm) run with DB_WRITE=1 for a read-write WAL handle.
function openSqlite() {
  if (process.env.DB_WRITE !== "1") {
    return new Database(DB_PATH, { readonly: true, fileMustExist: true });
  }
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 10000"); // wait out concurrent sync writers
  return sqlite;
}

function createDb() {
  const sqlite = openSqlite();
  try {
    // Touch the catalog so a bad open surfaces here with a clear message rather
    // than mid-request deep in a query.
    sqlite.prepare("SELECT 1 FROM sqlite_master LIMIT 1").get();
  } catch (err) {
    const msg = String((err as Error)?.message ?? "");
    // A WAL-mode file on a read-only filesystem: the read-only handle cannot
    // create the -wal/-shm it needs. The DB was committed without db:clean.
    if (/readonly/i.test(msg)) {
      throw new Error(
        `data/knesset.db is in WAL mode, which a read-only filesystem cannot open ` +
          `("${msg}"). Run npm run db:clean (it leaves the file in rollback-journal ` +
          `mode) and commit the DB.`,
      );
    }
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

// Safely remove stale WAL/SHM sidecars next to data/knesset.db, verify the
// database is intact, then leave it in rollback-journal mode, vacuumed (what a
// read-only deploy needs). Run this ONLY when nothing else has the DB open (no
// dev server, no sync) — e.g. right after a `git pull` that swapped the .db,
// and always before committing the DB.
//
//   npm run db:clean
//
// Removing a sidecar that a live connection is using would corrupt the DB, so
// this is a manual, standalone step — never wired into the running app.
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB = path.join(process.cwd(), "data", "knesset.db");

if (!fs.existsSync(DB)) {
  console.error(`No database at ${DB}. Run the sync (npm run update) first.`);
  process.exit(1);
}

// Fold any live WAL back into the main .db FIRST. A standalone sync runner can
// exit while its -wal still holds committed-but-uncheckpointed transactions;
// opening read-write replays the WAL and a TRUNCATE checkpoint empties it. The
// previous order rm'd the -wal before opening, silently discarding those writes
// (integrity_check on the resulting file still passes — it's internally
// consistent, just missing recent data).
try {
  const rw = new Database(DB);
  const cp = rw.pragma("wal_checkpoint(TRUNCATE)");
  rw.close();
  console.log("wal_checkpoint:", JSON.stringify(cp));
} catch (e) {
  // A genuinely damaged DB may fail to open read-write — fall through to the
  // integrity_check below, which reports it with recovery guidance.
  console.warn("wal_checkpoint skipped:", e.message);
}

let removed = 0;
for (const ext of ["-wal", "-shm", "-journal"]) {
  if (fs.existsSync(DB + ext)) {
    fs.rmSync(DB + ext, { force: true });
    removed++;
  }
}
console.log(`Removed ${removed} stale sidecar file(s).`);

const db = new Database(DB, { readonly: true });
const result = db.pragma("integrity_check");
db.close();
const ok = Array.isArray(result) && result[0]?.integrity_check === "ok";
console.log("integrity_check:", JSON.stringify(result).slice(0, 200));

if (!ok) {
  console.error(
    "\nThe .db itself is damaged (not just a stale sidecar). Restore the " +
      "committed copy with:\n  git checkout -- data/knesset.db\nor rebuild it " +
      "with:\n  npm run update",
  );
  process.exit(1);
}
console.log("Database is healthy.");

// Leave the file in rollback-journal mode, compacted. The site opens it
// read-only, and a read-only connection to a WAL-mode file needs -wal/-shm
// sidecars it cannot create on a read-only filesystem (Vercel); a
// rollback-journal file needs none. The sync switches back to WAL while it
// writes; this runs after it, before every DB commit.
const final = new Database(DB);
const mode = final.pragma("journal_mode = DELETE", { simple: true });
final.exec("VACUUM");
final.close();
console.log(`journal_mode: ${mode}; vacuumed.`);

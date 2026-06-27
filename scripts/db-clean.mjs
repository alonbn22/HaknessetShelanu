// Safely remove stale WAL/SHM sidecars next to data/knesset.db and verify the
// database is intact. Run this ONLY when nothing else has the DB open (no dev
// server, no sync) — e.g. right after a `git pull` that swapped the .db.
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

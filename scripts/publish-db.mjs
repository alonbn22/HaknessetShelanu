// Publish data/knesset.db to the repo's `data-latest` release: gzip it, write
// its SHA-256, and upload both, replacing the previous ones. The daily sync
// runs this; a maintainer runs it after a deliberate DB change (new table,
// backfill). Needs the GitHub CLI (`gh`), authenticated (GH_TOKEN in Actions).
//
// Refuses a DB still in WAL mode: the site opens it read-only, which only works
// with a rollback journal. Run `npm run db:clean` first.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

const TAG = "data-latest";
const DB = path.join(process.cwd(), "data", "knesset.db");

const db = fs.readFileSync(DB);
if (db[18] !== 1 || db[19] !== 1) {
  console.error("data/knesset.db is in WAL mode. Run `npm run db:clean` first.");
  process.exit(1);
}
for (const s of ["-wal", "-shm", "-journal"]) {
  if (fs.existsSync(DB + s)) {
    console.error(`data/knesset.db${s} exists: something still has the DB open. Stop it and run \`npm run db:clean\`.`);
    process.exit(1);
  }
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "knesset-db-"));
const gz = path.join(dir, "knesset.db.gz");
const sha = path.join(dir, "knesset.db.sha256");
const hash = crypto.createHash("sha256").update(db).digest("hex");
fs.writeFileSync(gz, zlib.gzipSync(db, { level: 9 }));
fs.writeFileSync(sha, `${hash}  knesset.db\n`);

const gh = (...args) => execFileSync("gh", args, { stdio: "inherit" });
try {
  execFileSync("gh", ["release", "view", TAG], { stdio: "ignore" });
} catch {
  gh("release", "create", TAG, "--title", "Database (latest)", "--latest=false",
     "--notes", "The site's SQLite database, published by the daily sync. Download with `npm run db:pull`.");
}
gh("release", "upload", TAG, gz, sha, "--clobber");
console.log(`Published: ${(db.length / 1e6).toFixed(1)} MB (gzip ${(fs.statSync(gz).size / 1e6).toFixed(1)} MB), sha256 ${hash.slice(0, 12)}…`);
fs.rmSync(dir, { recursive: true, force: true });

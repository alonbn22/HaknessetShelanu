// Download the database from the repo's `data-latest` release. The daily sync
// publishes it there (scripts/publish-db.mjs); git doesn't carry it (GitHub's
// 100 MiB file limit, and history bloat).
//
//   node scripts/fetch-db.mjs               refresh data/knesset.db (npm run db:pull)
//   node scripts/fetch-db.mjs --if-missing  only when the file is absent (prebuild)
//
// Checks the SHA-256 published beside the file, then swaps it into place.
// Stop any dev server first: never replace the file under an open connection.
// A private repo needs GITHUB_TOKEN (read access); a public one needs nothing.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const REPO = process.env.DB_REPO ?? "alonbn22/HaknessetShelanu";
const TAG = "data-latest";
const OUT = path.join(process.cwd(), "data", "knesset.db");

if (process.argv.includes("--if-missing") && fs.existsSync(OUT)) {
  console.log("data/knesset.db is present; not downloading.");
  process.exit(0);
}

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

// Public: the plain download URLs. Private: the API's asset URLs, with the token.
async function assets() {
  if (!token) {
    const base = `https://github.com/${REPO}/releases/download/${TAG}`;
    return { gz: `${base}/knesset.db.gz`, sha: `${base}/knesset.db.sha256`, headers: {} };
  }
  const auth = { Authorization: `Bearer ${token}` };
  const r = await fetch(`https://api.github.com/repos/${REPO}/releases/tags/${TAG}`, {
    headers: { ...auth, Accept: "application/vnd.github+json" },
  });
  if (!r.ok) throw new Error(`release ${TAG}: HTTP ${r.status}`);
  const rel = await r.json();
  const url = (name) => rel.assets.find((a) => a.name === name)?.url ?? (() => { throw new Error(`asset ${name} missing`); })();
  return { gz: url("knesset.db.gz"), sha: url("knesset.db.sha256"), headers: { ...auth, Accept: "application/octet-stream" } };
}

async function get(url, headers) {
  const r = await fetch(url, { headers, redirect: "follow" });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

for (let attempt = 1; ; attempt++) {
  try {
    const { gz, sha, headers } = await assets();
    const [gzBuf, shaBuf] = await Promise.all([get(gz, headers), get(sha, headers)]);
    const db = zlib.gunzipSync(gzBuf);
    const want = shaBuf.toString().trim().split(/\s+/)[0];
    const got = crypto.createHash("sha256").update(db).digest("hex");
    // A mismatch usually means a publish is halfway through its two uploads.
    if (got !== want) throw new Error(`checksum mismatch (${got.slice(0, 12)}… vs ${want.slice(0, 12)}…)`);
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(`${OUT}.tmp`, db);
    fs.renameSync(`${OUT}.tmp`, OUT);
    // A stale -wal from an older file would be applied to the new one.
    for (const s of ["-wal", "-shm", "-journal"]) fs.rmSync(OUT + s, { force: true });
    console.log(`data/knesset.db: ${(db.length / 1e6).toFixed(1)} MB, sha256 ${got.slice(0, 12)}…`);
    break;
  } catch (e) {
    if (attempt >= 4) {
      console.error(`Could not fetch the database: ${e.message}`);
      process.exit(1);
    }
    console.warn(`Attempt ${attempt} failed (${e.message}); retrying in ${attempt * 10}s.`);
    await new Promise((r) => setTimeout(r, attempt * 10_000));
  }
}

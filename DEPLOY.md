# Deploying Our Knesset

**The path: [Vercel](#vercel).** Connect the GitHub repo, set a few environment
variables, and add a deploy hook for the daily data. The launch checklist is
[LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).

---

## How the app is hosted

Read this once. It explains every step below.

- **Server-rendered, all routes dynamic.** A per-request CSP nonce (`src/proxy.ts`)
  makes every page render on the server per request (no static export).
- **Reads one SQLite file, read-only.** `data/knesset.db` (~81 MB) is read at request
  time through `better-sqlite3` (a native module). The app never writes to it, so it
  runs on a read-only disk (Vercel's). The file must use a rollback journal, not WAL:
  `npm run db:clean` switches it, and `npm run db:publish` refuses a WAL file.
- **The database isn't in git.** It lives in the repository's `data-latest` release.
  The build fetches it (`prebuild` → `scripts/fetch-db.mjs --if-missing`), checks its
  SHA-256, and Next bundles it into the server functions (about 115 MB of Vercel's
  250 MB function limit).
- **No third parties at request time.** No analytics, no cookies, no translation calls.
  New Hebrew data text shows marked as Hebrew until a reviewed translation batch is
  imported and published with the database.

---

## Vercel

The Hobby tier is free for non-commercial use, which this civic project is.

1. **Import the repo:** vercel.com → Add New → Project → Import. The framework is
   detected as Next.js; no build settings are needed. Node 24 comes from
   `package.json` `engines`.
2. **Environment variables** (Project → Settings → Environment Variables), set before
   the first build:
   - `NEXT_PUBLIC_SITE_URL`: the public origin, e.g. `https://example.org`. The
     sitemaps, `robots.txt`, canonical links and share cards are built with it.
   - `NEXT_PUBLIC_CONTACT_EMAIL`: the site's contact address (the accessibility
     statement, privacy and terms pages). Without it they point to public GitHub
     issues.
3. **Deploy hook** for the daily data: Project → Settings → Git → Deploy Hooks → create
   one for `master`, then add its URL to the GitHub repo as the Actions secret
   `VERCEL_DEPLOY_HOOK`.
4. **Logs:** Vercel keeps request logs with IP addresses. Keep the shortest retention
   the plan allows (the privacy page says so).
5. **Domain:** add the custom domain in Vercel. Turn on HSTS `preload` only once the
   domain is final (`next.config.ts` headers).

---

## Keeping the data fresh

`.github/workflows/sync-data.yml` runs once a day (02:30 UTC) and on demand (Actions →
Sync Knesset data → Run workflow):

1. `npm run db:pull` downloads the published database.
2. `npm run sync` pulls what changed from the Knesset, Wikidata and data.gov.il
   (incremental: the cursors live inside the database).
3. `node scripts/db-clean.mjs` checks integrity, switches to a rollback journal and
   compacts.
4. `npm run db:publish` uploads the new file and its checksum to `data-latest`.
5. The deploy hook rebuilds the site with the new data.

A failed run publishes nothing and GitHub emails the owner. The repo is public, so
Actions minutes are free. The workflow is switched off until the owner turns it on
(Actions → Sync Knesset data → Enable workflow).

A **deliberate database change** (new table, backfill, a translation batch): apply it
locally, run `npm run db:clean`, check the site, then `npm run db:publish`. Don't
publish while the daily sync is running.

---

## Before launch

See [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md). In short:

- [ ] `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_CONTACT_EMAIL` set.
- [ ] The deploy hook secret set and one manual sync run end to end.
- [ ] Log retention set to the shortest.
- [ ] The work-in-progress banner removed.
- [ ] `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` pass.
- [ ] Sensitive editorial content (member records, coalition, party pages, polls)
      reviewed: every claim is sourced, but a human sign-off is the last gate.

---

## Not recommended

- **Cloudflare Workers / Pages.** The Workers runtime can't run `better-sqlite3` (a
  native module with filesystem access). Hosting there means porting the data layer to
  D1, effectively a rewrite.

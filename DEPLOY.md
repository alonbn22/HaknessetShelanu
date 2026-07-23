# Deploying Our Knesset

**TL;DR — the free, easy path that just works: [Vercel](#option-a--vercel-recommended).**
Connect the GitHub repo, deploy, set one environment variable. The only project-specific
step is pre-warming translations so all four languages ship complete (one command).

---

## What's a little unusual about hosting this app

Read this once — it explains every instruction below.

- **Server-rendered, all routes dynamic.** A per-request CSP nonce (see `src/proxy.ts`)
  forces dynamic rendering, so pages render on the server per request (no static export).
- **Reads a committed SQLite file.** `data/knesset.db` (~57 MB) is checked into the repo
  and read at request time via `better-sqlite3` (a native module). There is no external
  database to provision — the data ships with the code.
- **Writes translations lazily.** On the first non-Hebrew view of a piece of data, the app
  translates it and caches the result back into the DB. On a **read-only** filesystem
  (which most serverless hosts have) that write is skipped and the page falls back to
  Hebrew for that one string — it never errors. **`npm run warm` pre-fills every
  translation into the committed DB**, so on a read-only host nothing needs to be written
  and every language renders complete.

So the whole hosting question comes down to one choice: **pre-warm the data and deploy
anywhere (even read-only serverless), or run a normal Node server where writes persist.**

---

## Before any deploy

```bash
npm run update     # pull the latest Knesset / Wikidata / budget data
npm run warm       # translate all data into en, ar, ru (writes into data/knesset.db)
npm run db:clean   # checkpoint the WAL + integrity-check
npm run build      # confirm a clean production build
```

Commit the refreshed `data/knesset.db`. Also set, wherever you deploy:

- `NEXT_PUBLIC_SITE_URL` = your public origin (e.g. `https://ourknesset.vercel.app`), so
  the sitemap, `robots.txt`, and OpenGraph/share URLs point at the real domain.

---

## Option A — Vercel (recommended)

Free (Hobby tier), native Next.js support, one-click GitHub deploys, HTTPS + global edge.

1. **Bundle the DB into the serverless functions.** Add to `next.config.ts` (inside
   `nextConfig`, beside `serverExternalPackages`, which already externalizes
   `better-sqlite3`):

   ```ts
   outputFileTracingIncludes: {
     "/**": ["./data/knesset.db"],
   },
   ```

   Without this, Next won't trace the `.db` into the function and reads fail in production.

2. **Push to GitHub**, then on [vercel.com](https://vercel.com): **Add New → Project →
   Import** the repo. The framework is auto-detected as Next.js — no build config needed.

3. **Deploy.** You get a free `https://<project>.vercel.app` URL.

4. **Set the env var:** Project → Settings → Environment Variables → add
   `NEXT_PUBLIC_SITE_URL` = your `*.vercel.app` URL (or a custom domain) → **Redeploy**.

That's it — everything works because the committed DB already holds every translation.

**Caveats:** the Hobby tier is for **non-commercial** use (this civic/transparency project
qualifies). Dynamic pages aren't CDN-cached, but serverless SSR is fast.

---

## Keeping the data fresh

The repo ships a GitHub Action, `.github/workflows/sync-data.yml` (currently **disabled**),
that re-syncs and commits `data/knesset.db` on a schedule; each commit auto-redeploys on
Vercel. To use it:

```bash
gh workflow enable "Sync Knesset data"
```

Add a **`npm run warm`** step to that workflow (right after `npm run update`, before the
commit) so freshly-synced data ships translated instead of showing the Hebrew fallback
until someone views it.

---

## Option B — a persistent Node server (Render / Fly.io / Railway)

Choose this if you'd rather have translations fill in **live** (no pre-warm step) — the app
runs exactly like local dev: `better-sqlite3`, the committed DB, and lazy-translation
**writes** all work with no extra config.

- **Render** (free web service): New → Web Service → connect the repo →
  Build `npm ci && npm run build`, Start `npm start`, Node 20+. Set `NEXT_PUBLIC_SITE_URL`.
  Caveats: the free instance **spins down after ~15 min idle** (a slow first request after),
  and the free tier has **no persistent disk** — the lazy-translation cache resets on each
  redeploy, but the committed DB always carries whatever `npm run warm` baked in.
- **Fly.io:** `fly launch` (Node builder), Start `npm start`. Attach a small volume mounted
  at `data/` if you want lazy translations to persist across restarts. Requires a card;
  small usage is minimal-cost.
- **Railway:** similar; runs on trial credit, then paid.

---

## Not recommended

- **Cloudflare Workers / Pages.** The Workers runtime can't run `better-sqlite3` (native
  module + filesystem access). Hosting there would mean porting the data layer to
  Cloudflare D1 — effectively a rewrite. Skip it.

---

## Go-live checklist

- [ ] `NEXT_PUBLIC_SITE_URL` points at the real origin.
- [ ] `npm run warm` run and the DB committed, so all four languages render fully.
- [ ] Accessibility statement contact filled in (`a11y.statement.*` — coordinator
      name/email/phone). **Legally required in Israel.**
- [ ] Corrections email placeholder filled in.
- [ ] `npm run build` passes.
- [ ] Sensitive editorial content (coalition, party profiles, member records, election
      figures) reviewed — every claim is sourced, but a human sign-off is the last gate.

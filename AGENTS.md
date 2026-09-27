<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# House rules (hard-won — follow exactly)

## The database and the daily sync
- `data/knesset.db` (~81 MB) is **not in git**. It lives in the repo's
  `data-latest` release. Get it with `npm run db:pull` (stop any dev server
  first); `next build` fetches it on its own when it's missing (`prebuild`).
- A GitHub Action (`sync-data.yml`) runs daily: `db:pull` → `npm run sync` →
  `db:clean` → `db:publish` → the Vercel deploy hook. It needs the Actions
  minutes of a public repo, or a working billing account on a private one.
- The site opens the DB **read-only** (Vercel's disk is read-only) and never
  writes at request time. That needs a rollback-journal file: `db:clean` ends
  with `journal_mode=DELETE` + `VACUUM`, and `db:publish` refuses a WAL file.
  Scripts that write set `DB_WRITE=1` (already in `sync`, `update`, `warm`).
- A **deliberate DB change** (new index/table/backfill): code commit first,
  then materialize locally (`npm run db:push` + the relevant sync +
  `npm run db:clean`), check it, and `npm run db:publish`. Never publish while
  the daily sync is running (Actions tab).
- New tables/indexes MUST be declared in `src/db/schema.ts` (drizzle-kit
  `push --force` **drops anything undeclared** — this once silently deleted a
  live table) AND created `IF NOT EXISTS` by the sync script with a definition
  matching schema.ts exactly, so an un-pushed DB self-heals on the next run.
  Query functions for new tables try/catch and return empty when the table
  doesn't exist yet.
- Never replace or delete the DB file or its `*-wal`/`*-shm` while any process
  has it open — that corrupts it. Stop the dev server first; use
  `npm run db:clean` (checks integrity) when nothing is running.

## Language & i18n
- **No Hebrew literals in `src/`** (a test enforces it) — use `\u` escapes for
  Hebrew ranges/strings in code; `messages/*.json` and `content/` may contain
  Hebrew freely.
- Every UI string goes into **all six** `messages/{he,en,ar,ru,es,fr}.json` with
  identical key sets and identical ICU placeholders (a parity test enforces it).
  Hebrew is the source of truth.
- Data text (vote titles, bill/committee names…) is NOT translated in the sync
  or at request time: pages read the unified `translations` cache with
  `localizePage(heList, locale)` from `src/lib/i18n-data.ts` (read-only; no
  third-party calls). New strings are translated in reviewed batches and
  imported, then published with the DB. Untranslated Hebrew must render with
  `dir="rtl" lang="he"` — use `rtlAttrs`/`localizedAttrs` from `src/lib/text.ts`.

## Legal safety
- Never invent facts about people. Every claim in a member record cites ≥1
  reputable source (schema-enforced); ongoing legal proceedings are marked and
  the presumption of innocence applies. Neutral wording only.

## Gates (run before finishing any change)
- `npm test` (318+), `npx tsc --noEmit`, `npm run lint`, `npm run build` — all
  green.

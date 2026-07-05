<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# House rules (hard-won — follow exactly)

## The committed database and the sync bot
- `data/knesset.db` (~57MB) is **committed**, and a GitHub Action re-syncs and
  commits it every ~6h. Manual pushes race with it: always `git pull --rebase
  origin master` before pushing.
- **Never include `data/knesset.db` in a code commit.** Running the dev server
  or `next build` in a non-Hebrew locale writes lazy translations into it, so
  it dirties itself routinely — `git restore data/knesset.db` before committing.
- A **deliberate DB commit** (new index/table/backfill) goes alone: code commit
  first (no DB), then materialize (`npm run db:push` + the relevant sync +
  `npm run db:clean`), then commit **only** the DB and push immediately. If the
  push is rejected because the bot landed, `git reset --hard origin/master` and
  redo — never rebase a binary DB commit.
- New tables/indexes MUST be declared in `src/db/schema.ts` (drizzle-kit
  `push --force` **drops anything undeclared** — this once silently deleted a
  live table) AND created `IF NOT EXISTS` by the sync script with a definition
  matching schema.ts exactly, so an un-pushed DB self-heals on the next run.
  Query functions for new tables try/catch and return empty when the table
  doesn't exist yet.
- Never delete `*.db-wal`/`*.db-shm` while any process has the DB open — that
  corrupts it. Use `npm run db:clean` (checks integrity) when nothing is running,
  e.g. after a pull swapped the DB file.

## Language & i18n
- **No Hebrew literals in `src/`** (a test enforces it) — use `\u` escapes for
  Hebrew ranges/strings in code; `messages/*.json` and `content/` may contain
  Hebrew freely.
- Every UI string goes into **all four** `messages/{he,en,ar,ru}.json` with
  identical key sets and identical ICU placeholders (a parity test enforces it).
  Hebrew is the source of truth.
- Data text (vote titles, bill/committee names…) is NOT translated in the sync;
  it localizes lazily via the unified `translations` cache (`localizeData` +
  `queueDataTranslations` in `after()`). Untranslated Hebrew must render with
  `dir="rtl" lang="he"` — use `rtlAttrs`/`localizedAttrs` from `src/lib/text.ts`.

## Legal safety
- Never invent facts about people. Every claim in a member record cites ≥1
  reputable source (schema-enforced); ongoing legal proceedings are marked and
  the presumption of innocence applies. Neutral wording only.

## Gates (run before finishing any change)
- `npm test` (203+), `npx tsc --noEmit`, `npm run lint`, `npm run build` — all
  green, and `git status` must show no accidental `data/knesset.db` drift.

# Contributing

Thanks for helping improve **הכנסת שלנו / Our Knesset** — a public, multilingual
(he/en/ar/ru, RTL) Knesset transparency site.

## Ground rules

- **Cite sources for everything.** Any factual statement about a person, party,
  law, or number must link a reputable source (Wikipedia / Britannica / Reuters /
  AP / BBC / Haaretz / Times of Israel / Jerusalem Post / official government).
  Per-member claims are enforced by a test (`tests/qa/member-records.test.ts`).
- **Stay neutral.** Describe, don't editorialize. Mark non-final legal matters
  with a status; the presumption of innocence always applies. When unsure about a
  negative claim, leave it out.
- **Translate via the system, never hardcode.** Data text localizes on the fly
  (`src/lib/i18n-data.ts`); UI strings live in `messages/*.json` and must exist in
  **all four** locales (a parity test fails on a missing key). Don't put Hebrew
  string literals in components.

## Dev setup

```bash
npm install
npm run db:push        # create the SQLite schema
npm run update         # pull data (Knesset API + Wikidata + budget) — takes a while
npm run dev            # http://localhost:3000
```

## Before opening a PR

Run and pass all of:

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

## Where things live

- Member records: `content/members/<personId>.yaml` (he/en authored; ar/ru
  auto-translate). Run `npm run warm` to pre-translate.
- Other editorial content: `content/*.yaml` (see existing files for the shape).
- Pages: `src/app/[locale]/**`; shared queries: `src/lib/queries.ts`.

## Licensing of contributions

By contributing you agree your **code** is licensed under **AGPL-3.0-or-later**
and your **editorial content** under **CC BY-SA 4.0**, consistent with
[LICENSING.md](LICENSING.md).

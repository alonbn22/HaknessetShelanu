# Launch checklist

The work between now and the public launch of Our Knesset, ahead of the election on
27 October 2026. Last updated 28 September 2026.

✅ done · 🔄 in progress · ⬜ to do. Owners: **Claude** (the AI agent, through commits
the owner reviews), **owner** (the maintainer), **lawyer**.

> **Hard dates:** the legal poll blackout starts on **23 October 2026** (the code is
> ready). Election day is **27 October 2026**.

## Content and translations

| | Item | Owner | Notes |
|---|---|---|---|
| ✅ | Arabic and Russian for committee agendas; Spanish and French labels; 103 historical party names fixed | Claude | 4b62d96 |
| ✅ | Compass: Likud's economic stance, from its party constitution | Claude | 6ad309f |
| ✅ | Tooltips: no Hebrew source titles on non-Hebrew pages | Claude | dbedec9 |
| ⬜ | Ballot letters approved by the Central Elections Committee, and a re-capture of the candidate rosters | Claude | The committee's page says the approved slips "will be published on 27.9.2026"; not up yet on the night of the 27th. Re-check daily |
| 🔄 | Unsupported-claims audit: fixes | Claude | The audit found 62 wrong Knesset links on member records, 31 wrong "settled" badges and errors in the elections history; fixes in progress. 145 member claims still cite only Wikipedia (LOW) |
| ✅ | Translation of new daily text: decided | owner | No automatic translation (27 Sep): new text shows marked as Hebrew until a reviewed batch. LibreTranslate tested and rejected on quality. Azure's free tier is the fallback option |

## Election law

| | Item | Owner | Notes |
|---|---|---|---|
| ✅ | Poll blackout, 23–27 Oct 2026 (Elections (Propaganda Methods) Law, §16ה(ח)): a notice on every poll surface; no poll dated after Friday 23 Oct | Claude | 63c73ce; a test pins the window |
| 🔄 | Poll disclosures (§16ה(ב)–(ג)): commissioned by, conducted by, population, asked and answered, margin of error, question, CEC filing | Claude | 18 of 24 polls matched to their filings; schema and page in progress |
| ⬜ | Lawyer questions | owner, lawyer | Kept in `private/FLAGS.md` (gitignored) |

## Trust and legal pages

| | Item | Owner | Notes |
|---|---|---|---|
| ✅ | "Unofficial" line in the footer; no State emblem, Knesset or CEC logos anywhere | Claude | c363ffb |
| ✅ | `/credits` page: photo authors and licenses; linked credits on member pages and the parties grid | Claude | 86845a5, c363ffb |
| ✅ | `/privacy`, with the cookie policy | Claude | c363ffb. The lawyer reviews it |
| ✅ | `/terms` | Claude | c363ffb. The lawyer reviews it |
| ⬜ | Contact email | owner | Set `NEXT_PUBLIC_CONTACT_EMAIL`; until then the pages point to public GitHub issues |

## Privacy

| | Item | Owner | Notes |
|---|---|---|---|
| ✅ | No cookies | Claude | 3ce236f (rebased) — `localeCookie` and `localeDetection` off |
| ✅ | No Google calls at runtime (local search) | Claude | Search matches the site's own translations |
| ✅ | The compass and the party finder never store or send answers | Claude | `tests/qa/privacy.test.ts` |

## Accessibility

| | Item | Owner | Notes |
|---|---|---|---|
| ✅ | Accessibility statement rewritten (no placeholders; 60-day fix commitment) | Claude | c363ffb. Contact: see "Contact email" |
| ✅ | Phones: no page wider than the screen at 375 px and 320 px, six languages | Claude | b6bf9b3 (WCAG 1.4.10) |
| ⬜ | WCAG 2.2 AA check | Claude | AccessLint on every page type, in both themes, plus a keyboard-only pass |
| ⬜ | Screen-reader test with VoiceOver | owner | |

## Infrastructure

| | Item | Owner | Notes |
|---|---|---|---|
| ✅ | Read-only database on Vercel | Claude | The app never writes; the DB uses a rollback journal (bdec35a) |
| ✅ | Database out of git: the `data-latest` release, a daily Action, a Vercel deploy hook | Claude | 70ffeab. `npm run db:pull` / `db:publish` |
| ✅ | Next.js 16.3.6 (security release) | Claude | fd46de3 |
| ✅ | Israel time zone | Claude | 67921f5 |
| ⬜ | Vercel project, env vars, deploy hook secret | owner | See DEPLOY.md: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`, `VERCEL_DEPLOY_HOOK` |
| ✅ | GitHub Actions minutes | owner | The repo is public (28 Sep): free. CI runs on every push. The daily sync is switched off until the owner enables it |
| ⬜ | Vercel log retention | owner | |

## Quality

| | Item | Owner | Notes |
|---|---|---|---|
| ✅ | Israeli-flag favicon | Claude | cf25512 |
| ✅ | Error pages: bilingual 404, global error, loading | Claude | bc43288, df9cb12 |
| ✅ | Images resized (725 KB → 116 KB); 250 px Commons thumbnails for avatars | Claude | 3222da9, bb1ef56 |
| ⬜ | Lighthouse, mobile | Claude | |
| ⬜ | Link crawl | Claude | Internal links and cited sources |
| ✅ | Form limits | Claude | Every `?q=` capped at 200 characters on the server |
| ⬜ | `npm audit fix` for dev dependencies | Claude | Production has 1 moderate (via next) |

## Open source

| | Item | Owner | Notes |
|---|---|---|---|
| ✅ | LICENSE, README, CONTRIBUTING, Code of Conduct, SECURITY, PR template, CI | Claude | Licenses as before (owner, 27 Sep): code AGPL-3.0-or-later, the site's text CC BY-SA 4.0 |
| ✅ | Purge the old database copies from git history | owner, then Claude | 28 Sep: history rewritten without the database (2.7 GB → 3 MB); a full backup bundle sits beside the project folder |
| ✅ | Commit author emails | owner, Claude | 28 Sep: every commit shows `alonbn22 <maintainer@haknesset-sheli.invalid>`; no personal information in any file (scanned) |
| ✅ | Public repository | owner, Claude | 28 Sep: a fresh repo, `alonbn22/HaknessetShelanu`, holds only the cleaned history (the old private repo kept old pull-request refs GitHub won't delete). Still to do: turn on private vulnerability reporting (SECURITY.md depends on it); decide what to do with the old private repo |
| ⬜ | Branch protection on `master` | owner | Require the CI check |

## Launch

| | Item | Owner | Notes |
|---|---|---|---|
| ✅ | Party finder (`/elections/find`): positions from the compass | Claude | 0f6fe81 |
| 🔄 | Party finder: "how they describe themselves" (their own words) | Claude | Research done; in progress |
| ⬜ | Remove the work-in-progress banner | Claude | On launch day |

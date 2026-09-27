# Launch checklist

The work between now and the public launch of Our Knesset, ahead of the election on
27 October 2026. Last updated 27 September 2026.

✅ done · ⬜ to do. Owners: **Claude** (the AI agent, through commits the owner
reviews), **owner** (the maintainer), **lawyer**.

> **Hard dates:** the legal poll blackout starts on **23 October 2026**. Election
> day is **27 October 2026**.

## Content and translations

| | Item | Owner | Notes |
|---|---|---|---|
| ✅ | Arabic and Russian for committee agendas; Spanish and French labels; 103 historical party names fixed | Claude | 4b62d96 |
| ✅ | Compass: Likud's economic stance, from its party constitution | Claude | 6ad309f |
| ✅ | Tooltips: no Hebrew source titles on non-Hebrew pages | Claude | dbedec9 |
| ⬜ | Ballot letters approved by the Central Elections Committee (its 27 Sep notices), and a re-capture of the candidate rosters | Claude | Flip `lettersStatus: requested` to `approved` in `content/election.yaml`; drop any list the committee refused |
| ⬜ | Unsupported-claims audit | Claude | Trace every claim to a primary source. `content/` still cites Wikipedia about 430 times, mostly in member records. The owner signs off |
| ⬜ | Translation for new daily text | owner, then Claude | Choosing between LibreTranslate and Azure, to replace the Google Translate calls |

## Election law

| | Item | Owner | Notes |
|---|---|---|---|
| ⬜ | Poll blackout, 23–27 Oct 2026 (Elections (Propaganda Methods) Law, §16ה(ח)): a notice on the site, and the average frozen | Claude | Must be live before 23 Oct |
| ⬜ | Poll disclosures (§16ה(ב)–(ג)): commissioned by, conducted by, dates, population, asked and answered, margin of error, link to the CEC filing | Claude | `content/polls.yaml` has the institute, dates, sample and margin; it has no fields yet for who commissioned the poll, the population, how many were asked, or the filing link |
| ⬜ | Lawyer questions | owner, lawyer | Kept in a private file, never in the repo (`private/` is gitignored) |

## Trust and legal pages

| | Item | Owner | Notes |
|---|---|---|---|
| ⬜ | "Unofficial" line in the footer; no State emblem, Knesset or CEC logos anywhere | Claude | |
| ⬜ | `/credits` page: photo authors and licenses | Claude | Also `public/assets/knesset-holyland.jpg` (CC BY-SA 4.0), which no page uses today: credit it if it's used, or remove it |
| ⬜ | `/privacy`, with the cookie policy | Claude | The lawyer reviews it |
| ⬜ | `/terms` | Claude | The lawyer reviews it |

## Privacy

| | Item | Owner | Notes |
|---|---|---|---|
| ⬜ | No cookies | Claude | next-intl sets a locale cookie by default (`localeCookie` in `src/i18n/routing.ts`) |
| ⬜ | No Google calls at runtime (local search) | Claude | Today, search-query translation (`src/lib/translate-query.ts`) and lazy data translation (`src/lib/i18n-data.ts`) call Google Translate |
| ⬜ | The compass and the party finder never store or send answers | Claude | Plus a test that locks it in |

## Accessibility

| | Item | Owner | Notes |
|---|---|---|---|
| ⬜ | Accessibility statement rewritten, with a real contact | Claude, owner | The owner provides the email |
| ⬜ | WCAG 2.2 AA check | Claude | AccessLint on every page type, in both themes, plus a keyboard-only pass |
| ⬜ | Screen-reader test with VoiceOver | owner | |

## Infrastructure

| | Item | Owner | Notes |
|---|---|---|---|
| ⬜ | Read-only database on Vercel | Claude | Vercel's file system is read-only at runtime |
| ⬜ | Database out of git: a GitHub Release, refreshed by a daily Action, deployed through a Vercel Deploy Hook | Claude | Adds `npm run db:pull` (README and CI have placeholders). The file is about 81 MiB and GitHub rejects files over 100 MiB |
| ⬜ | Next.js 16.3.6 (security release) | Claude | `package.json` pins 16.2.9 |
| ⬜ | Israel time zone | Claude | Dates and times shown in Asia/Jerusalem; servers run in UTC |
| ⬜ | `NEXT_PUBLIC_SITE_URL` | owner | Needs the domain |
| ⬜ | Vercel log retention | owner | |

## Quality

| | Item | Owner | Notes |
|---|---|---|---|
| ⬜ | Israeli-flag favicon | Claude | |
| ⬜ | Error pages: bilingual 404, global error, loading | Claude | |
| ⬜ | Images resized | Claude | |
| ⬜ | Lighthouse, mobile | Claude | |
| ⬜ | Check every page type at 375 px wide | Claude | |
| ⬜ | Link crawl | Claude | Internal links and cited sources |
| ⬜ | Form limits | Claude | Length limits on search and every other input |

## Open source

| | Item | Owner | Notes |
|---|---|---|---|
| ⬜ | LICENSE, README, CONTRIBUTING, Code of Conduct, SECURITY, PR template, CI | Claude | Written, waiting for the owner's review. This moves the code from AGPL-3.0 to MIT and the site's text from CC BY-SA 4.0 to CC BY 4.0; `package.json` still says `AGPL-3.0-or-later`. The Code of Conduct's contact is "the maintainers via GitHub" until there's an email |
| ⬜ | Purge the old database copies from git history | owner, then Claude | 127 copies of the database take about 2.6 of the repository's 2.7 GiB. The purge rewrites every commit hash, so do it before the repo goes public |
| ⬜ | Check commit author emails | owner | Every commit shows the address it was made with. If one shouldn't be public, fix it in the same history rewrite as the purge |
| ⬜ | Make the repository public | owner | Then turn on private vulnerability reporting in the repository's security settings; SECURITY.md depends on it |
| ⬜ | Branch protection on `master` | owner | Require the CI check. The sync bot pushes the database straight to `master`, so move the database out of git first, or let the bot bypass the rule |

## Launch

| | Item | Owner | Notes |
|---|---|---|---|
| ⬜ | Party finder (`/elections/find`) | Claude | |
| ⬜ | Remove the work-in-progress banner | Claude | On launch day |

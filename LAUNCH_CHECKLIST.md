# Launch checklist

The work between now and the public launch of Our Knesset, ahead of the election on
27 October 2026. Last updated 30 September 2026.

✅ done · 🔄 in progress · ⬜ to do. Owners: **Claude** (the AI agent, through commits
the owner reviews), **owner** (the maintainer), **lawyer**. Commit links are to this
repository's history (rewritten on 28 Sep, so older hashes elsewhere no longer resolve).

> **Hard dates:** the Supreme Court rules on the disqualifications by **4 October**.
> The legal poll blackout starts when **Friday 23 October 2026** ends (the code is ready). Election
> day is **27 October 2026**.

## Content and translations

| | Item | Owner | Notes |
|---|---|---|---|
| ✅ | Arabic and Russian for committee agendas; Spanish and French labels; 103 historical party names fixed | Claude | In the published database (`data-latest`) |
| ✅ | Compass: Likud's economic stance, from its party constitution | Claude | cf95822 |
| ✅ | Compass: weekly review of 28 Sep (3 values changed, 2 re-sourced, 6 new) | Claude | 1029a3b. Next review about 5 Oct |
| ✅ | Tooltips: no Hebrew source titles on non-Hebrew pages | Claude | 939a05e |
| ✅ | Ballot letters and list names approved by the Central Elections Committee (27 Sep) | Claude | f873a92 |
| ✅ | Candidate rosters re-checked against the committee's 38 list pages (30 Sep) | Claude | 46b28fd: 31 unchanged, 7 candidates no longer listed. Re-check after the 4 Oct rulings and when the approved lists appear in Reshumot (the committee's index page says they will) |
| ✅ | Polls reviewed on 30 Sep: 28 polls, 23 with the pollster's filing | Claude | 7ff946e, ce95f80, 57cedfe |
| 🔄 | Disqualification appeals in the lists' notes | Claude | 3987e30 (appeals, 1 Oct hearing, the rejected requests against three other lists). Update with the rulings |
| ✅ | Unsupported-claims audit: fixes | Claude | cfc2df3, dce31c9, ccee16c, 672ddd4, cbe55f9, 4150be9, then 24035e1, 05e6e9f, 8d6bec5, 22031d5, 5946f61 (30 Sep): 155 of 157 Wikipedia-only member claims now cite a source that states the fact (296 sources; conflicts with the Knesset record fixed or cut; a test keeps it so); computed figures name their Knesset open-data tables; all compass explainers but one cite sources, 9 corrected; the history no longer grades politics |
| ⬜ | Audit leftovers | Claude, owner | 2 member claims with no source beyond Wikipedia (listed in the test); biographies still from Wikidata (labelled; moving them needs a sync change); older history terms and the five controversial laws cite Wikipedia; coalition statuses have no per-faction source (optional) |
| ⬜ | Legal-status label on Netanyahu's record: `ongoing` or `indicted` | owner, lawyer | Both are accurate; the agent would not change a person's legal status without an explicit decision |
| ✅ | Translation of new daily text: decided | owner | No automatic translation (27 Sep): new text shows marked as Hebrew until a reviewed batch. LibreTranslate tested and rejected on quality. Azure's free tier is the fallback option |

## Election law

| | Item | Owner | Notes |
|---|---|---|---|
| ✅ | Poll blackout from the end of Friday 23 Oct until the polls close on 27 Oct, 22:00 (Elections (Propaganda Methods) Law, §16ה(ח) — "בתום יום שישי שלפני פתיחת הקלפיות", checked against the CEC's copy of the section): a notice on every poll surface; no poll dated after Friday 23 Oct | Claude | 1ab8211, start corrected 2 Oct; a test pins the window |
| ✅ | Poll disclosures (§16ה(ב)–(ג)): commissioned by, conducted by, population, asked and answered, margin of error, question, CEC filing | Claude | 1b74b67, 48e5c51. A poll without a filing says so, with the date last checked |
| ⬜ | Lawyer questions | owner, lawyer | Kept in `private/FLAGS.md` (gitignored) |

## Trust and legal pages

| | Item | Owner | Notes |
|---|---|---|---|
| ✅ | "Unofficial" line in the footer; no State emblem, Knesset or CEC logos anywhere | Claude | ad5c928 |
| ✅ | `/credits` page: photo authors and licenses; linked credits on member pages and the parties grid | Claude | aa87276, ad5c928 |
| ✅ | `/privacy`, with the cookie policy | Claude | ad5c928. The lawyer reviews it |
| ✅ | `/terms` | Claude | ad5c928. The lawyer reviews it |
| ⬜ | Contact email | owner | Set `NEXT_PUBLIC_CONTACT_EMAIL`; until then the pages point to public GitHub issues |

## Privacy

| | Item | Owner | Notes |
|---|---|---|---|
| ✅ | No cookies | Claude | 5d4792b — `localeCookie` and `localeDetection` off |
| ✅ | No Google calls at runtime (local search) | Claude | edc890e. Search matches the site's own translations |
| ✅ | The compass and the party finder never store or send answers | Claude | 95bce14 (`tests/qa/privacy.test.ts`) |

## Accessibility

| | Item | Owner | Notes |
|---|---|---|---|
| ✅ | Accessibility statement rewritten (no placeholders; 60-day fix commitment) | Claude | ad5c928. Contact: see "Contact email" |
| ✅ | Phones: no page wider than the screen at 375 px and 320 px, six languages | Claude | df3f8c9 (WCAG 1.4.10) |
| ✅ | WCAG 2.2 AA check | Claude | e703041, b91a7d3, 1f84f54 (30 Sep): AccessLint and axe at 0 on 28 pages and 30 open states, both themes, he/en/ar; keyboard pass 102/102 (menus return focus, the hall works by arrow keys on phones, the language menu is links, not a select) |
| ⬜ | Visible labels on the search boxes | owner, Claude | The placeholder is the only visible label; DESIGN.md says it shouldn't be (WCAG 3.3.2). Needs a design call |
| ⬜ | Screen-reader test with VoiceOver | owner | |

## Infrastructure

| | Item | Owner | Notes |
|---|---|---|---|
| ✅ | Read-only database on Vercel | Claude | 0223c06. The app never writes; the DB uses a rollback journal |
| ✅ | Database out of git: the `data-latest` release, a daily Action, a Vercel deploy hook | Claude | b43c46d. `npm run db:pull` / `db:publish` |
| ✅ | Next.js 16.3.6 (security release) | Claude | a58dd6d |
| ✅ | Israel time zone | Claude | 2a40f7c |
| ⬜ | Vercel project, env vars, deploy hook secret | owner | See DEPLOY.md: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`, `VERCEL_DEPLOY_HOOK` |
| ✅ | GitHub Actions minutes | owner | The repo is public (28 Sep): free. CI runs on every push. The daily sync is switched off until the owner enables it |
| ⬜ | Vercel log retention | owner | |

## Quality

| | Item | Owner | Notes |
|---|---|---|---|
| ✅ | Israeli-flag favicon | Claude | 393487f |
| ✅ | Error pages: bilingual 404, global error, loading | Claude | 8a6e18b, 8c2227d |
| ✅ | Images resized (725 KB → 116 KB); 250 px Commons thumbnails for avatars | Claude | ef5e98a, da47df3 |
| ✅ | Lighthouse, mobile | Claude | 53e0835, 6f41985 (30 Sep): accessibility, best practices and SEO 100 on 8 page types; performance 90–97; pages 9–11 KB lighter (client messages trimmed), member photos sized per screen, no Wikimedia cookie. Left: splitting `/elections` (8.4k elements) and per-route message bundles |
| ✅ | Link check: internal links and cited sources | Claude | cbe55f9, 4150be9 (moved or dead sources replaced with verified ones or archived copies) |
| ✅ | Form limits | Claude | Every `?q=` capped at 200 characters on the server |
| ✅ | `npm audit fix` | Claude | f4608cb. The code that runs the site has no known vulnerabilities; 4 moderate advisories remain in development-only tools |

## Open source

| | Item | Owner | Notes |
|---|---|---|---|
| ✅ | LICENSE, README, CONTRIBUTING, Code of Conduct, SECURITY, PR template, CI | Claude | Licenses as before (owner, 27 Sep): code AGPL-3.0-or-later, the site's text CC BY-SA 4.0 |
| ✅ | Purge the old database copies from git history | owner, then Claude | 28 Sep: history rewritten without the database (2.7 GB → 3 MB); a full backup bundle sits beside the project folder |
| ✅ | Commit author emails | owner, Claude | 28 Sep: every commit shows `alonbn22 <maintainer@haknesset-sheli.invalid>`; no personal information in any file (scanned) |
| ✅ | Public repository | owner, Claude | 28 Sep: a fresh repo, `alonbn22/HaknessetShelanu`, holds only the cleaned history. Private vulnerability reporting is on |
| ⬜ | The old private repo and the backup bundle | owner | The old repo still holds the old history and pull-request refs; the bundle contains the old personal email — never publish it |
| ⬜ | Branch protection on `master` | owner | Require the CI check |

## Launch

| | Item | Owner | Notes |
|---|---|---|---|
| ✅ | Party finder (`/elections/find`): positions from the compass | Claude | c8edcac |
| ✅ | Party finder: "how they describe themselves" (their own words) | Claude | d330c85, d30e274 |
| ⬜ | Remove the work-in-progress banner | Claude | On launch day |

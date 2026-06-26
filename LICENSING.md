# Licensing, data sources & attribution

This project has **two layers** of licensing — the software and the content/data.

## Software (the code)

The application code is licensed under the **GNU Affero General Public License
v3.0 or later (AGPL-3.0-or-later)** — see [LICENSE](LICENSE). In short: you may
use, study, modify and redistribute it, but if you run a modified version as a
network service (a website), you must make your modified source available to its
users under the same license. AGPL is the standard choice for civic-transparency
web apps (e.g. parliament-monitoring sites) because it keeps hosted forks open.

## Editorial content (written by this project)

Original editorial content created for this site — the YAML in `content/`
(member records, glossary, elections history, party profiles, coalition, quiz,
foreign-aid, budget-outlook, controversial-laws) and the UI strings in
`messages/` — is licensed under **Creative Commons Attribution-ShareAlike 4.0
(CC BY-SA 4.0)**: <https://creativecommons.org/licenses/by-sa/4.0/>. Reuse it
freely with attribution and under the same license.

## Data from third parties (NOT relicensed by us)

The bundled database (`data/knesset.db`) and some content are derived from
external sources, each under its own license/terms. We do not and cannot
relicense them; reuse must follow the upstream terms:

| Source | What it provides | License / terms |
| --- | --- | --- |
| **Knesset Open Data (OData V4)** | members, factions, positions, votes, bills, committees, questions, agendas, the law book, lobbyists | Knesset public open data |
| **Ministry of Finance via data.gov.il** | budget figures | data.gov.il open data |
| **Wikidata** | multilingual names, biography facts (birth, education, military, career) | CC0 1.0 (public domain) |
| **Wikipedia** | facts cited in member records / glossary / controversial-laws | CC BY-SA 4.0 — attributed via per-claim source links |
| **Wikimedia Commons** | member photos | per-file license + author, shown on each profile |
| **Google Translate (unofficial)** | automatic translation of Hebrew data text | labeled "automatic translation" in the UI |

Provenance for everything shown is summarized on the site's **/sources** page and
in the footer. Per-member claims cite their own external sources.

## Disclaimer

This is not an official Knesset website. Information about living people is drawn
from public, reputable sources and presented as neutral factual reporting; legal
matters that are not final are marked, and the presumption of innocence applies.
Spotted an error? Open a ticket from the **/tickets** page.

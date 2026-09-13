---
name: "Our Knesset (הכנסת שלנו)"
description: "The Knesset hall, live, in the flag's colours: flag blue on Jerusalem stone, hairline cards, ruled rows, every figure beside its source and date."
colors:
  background: "#f4efe4"
  foreground: "#1a1a1a"
  chrome: "#0038b8"
  on-chrome: "#ffffff"
  chrome-hover: "rgba(255, 255, 255, 0.12)"
  surface: "#ffffff"
  surface-sunken: "#ece5d6"
  surface-hover: "#f7f3ea"
  line: "#e2dbcb"
  line-strong: "#c9bfa8"
  muted: "#595959"
  accent: "#0038b8"
  accent-ink: "#0038b8"
  accent-soft: "#e6ecf8"
  accent-line: "#b3c2e8"
  on-accent: "#ffffff"
  accent-deep: "#002a8c"
  coalition: "#0038b8"
  coalition-ink: "#0038b8"
  opposition: "#0038b8"
  opposition-ink: "#0038b8"
  pass: "#1a7f4b"
  pass-soft: "#e3f3ea"
  pass-ink: "#166534"
  pass-line: "#a7d9bb"
  fail: "#b3261e"
  fail-soft: "#fbe9e7"
  fail-ink: "#991b1b"
  fail-line: "#f0b4ae"
  warn: "#b45309"
  warn-soft: "#fdf3dc"
  warn-ink: "#7c3a00"
  warn-line: "#f5cf7a"
  info: "#0038b8"
  info-soft: "#e6ecf8"
  info-ink: "#0038b8"
  info-line: "#b3c2e8"
  neutral: "#595959"
  neutral-soft: "#eeece7"
  neutral-ink: "#404040"
  neutral-line: "#d5d2ca"
  focus: "#ffbf00"
  focus-ring: "#1a1a1a"
typography:
  display:
    fontFamily: "Frank Ruhl Libre, Noto Sans Arabic, Noto Sans, serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.11
    letterSpacing: "normal"
  wordmark:
    fontFamily: "Frank Ruhl Libre, Noto Sans Arabic, Noto Sans, serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
  figure:
    fontFamily: "Frank Ruhl Libre, Noto Sans Arabic, Noto Sans, serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.4
    fontFeature: "tabular-nums"
  headline:
    fontFamily: "Heebo, Noto Sans Hebrew, Noto Sans Arabic, Noto Sans, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  title:
    fontFamily: "Heebo, Noto Sans Hebrew, Noto Sans Arabic, Noto Sans, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.56
  control:
    fontFamily: "Heebo, Noto Sans Hebrew, Noto Sans Arabic, Noto Sans, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Heebo, Noto Sans Hebrew, Noto Sans Arabic, Noto Sans, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "Heebo, Noto Sans Hebrew, Noto Sans Arabic, Noto Sans, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Heebo, Noto Sans Hebrew, Noto Sans Arabic, Noto Sans, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.43
    letterSpacing: "normal"
  label-small:
    fontFamily: "Heebo, Noto Sans Hebrew, Noto Sans Arabic, Noto Sans, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: "normal"
  caption:
    fontFamily: "Heebo, Noto Sans Hebrew, Noto Sans Arabic, Noto Sans, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
  micro:
    fontFamily: "Heebo, Noto Sans Hebrew, Noto Sans Arabic, Noto Sans, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.45
  stat:
    fontFamily: "Heebo, Noto Sans Hebrew, Noto Sans Arabic, Noto Sans, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    fontFeature: "tabular-nums"
rounded:
  card: "0.75rem"
  control: "0.5rem"
  chip: "0.375rem"
  pill: "9999px"
  edge: "2px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.25rem"
  "6": "1.5rem"
  "8": "2rem"
  "10": "2.5rem"
  "14": "3.5rem"
  "0.5": "0.125rem"
  "1.5": "0.375rem"
  "2.5": "0.625rem"
components:
  chrome-bar:
    backgroundColor: "{colors.chrome}"
    textColor: "{colors.on-chrome}"
    padding: "0.75rem 1rem"
  chrome-wordmark:
    textColor: "{colors.on-chrome}"
    typography: "{typography.wordmark}"
  chrome-nav-link:
    textColor: "{colors.on-chrome}"
    typography: "{typography.body-small}"
    padding: "0.25rem 0"
  chrome-icon-button:
    rounded: "{rounded.control}"
    size: "2.5rem"
  chrome-icon-button-hover:
    backgroundColor: "{colors.chrome-hover}"
  chrome-language-select:
    backgroundColor: "{colors.chrome-hover}"
    textColor: "{colors.on-chrome}"
    rounded: "{rounded.chip}"
    padding: "0.25rem 0.5rem"
    typography: "{typography.body-small}"
  nav-menu:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "0.25rem"
    width: "12rem"
  nav-menu-item:
    rounded: "{rounded.chip}"
    padding: "0.5rem 0.75rem"
    typography: "{typography.body-small}"
  nav-menu-item-hover:
    backgroundColor: "{colors.surface-sunken}"
  nav-menu-item-active:
    textColor: "{colors.accent-ink}"
  skip-link:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    padding: "0.6rem 1rem"
  page-title:
    textColor: "{colors.foreground}"
    typography: "{typography.display}"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
    padding: "0.5rem 1rem"
    typography: "{typography.control}"
  button-primary-hover:
    backgroundColor: "{colors.accent-deep}"
  button-secondary:
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.control}"
    padding: "0.5rem 1rem"
    typography: "{typography.control}"
  button-secondary-hover:
    backgroundColor: "{colors.accent-soft}"
  button-ghost:
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "0.5rem 1rem"
    typography: "{typography.control}"
  button-ghost-hover:
    backgroundColor: "{colors.surface-sunken}"
  button-small:
    padding: "0.375rem 0.75rem"
    typography: "{typography.label}"
  button-large:
    padding: "0.625rem 1.25rem"
    typography: "{typography.control}"
  toggle-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.75rem"
    typography: "{typography.label}"
  toggle-unselected:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.75rem"
    typography: "{typography.label}"
  toggle-unselected-hover:
    backgroundColor: "{colors.surface-hover}"
  badge-neutral:
    backgroundColor: "{colors.neutral-soft}"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.5rem"
    typography: "{typography.label-small}"
  badge-pass:
    backgroundColor: "{colors.pass-soft}"
    textColor: "{colors.pass-ink}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.5rem"
    typography: "{typography.label-small}"
  badge-fail:
    backgroundColor: "{colors.fail-soft}"
    textColor: "{colors.fail-ink}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.5rem"
    typography: "{typography.label-small}"
  badge-warn:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn-ink}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.5rem"
    typography: "{typography.label-small}"
  badge-info:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.info-ink}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.5rem"
    typography: "{typography.label-small}"
  badge-accent:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.5rem"
    typography: "{typography.label-small}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "1.5rem"
  card-small:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "1rem"
  card-compact:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "0.75rem"
  card-interactive-hover:
    backgroundColor: "{colors.surface-hover}"
  table-frame:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
  table-header:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.muted}"
    typography: "{typography.label-small}"
    padding: "0.5rem 0.75rem"
  table-cell:
    typography: "{typography.body-small}"
    padding: "0.5rem 0.75rem"
  table-row-hover:
    backgroundColor: "{colors.surface-hover}"
  table-caption:
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
    padding: "0.5rem 0.75rem"
  empty-state:
    rounded: "{rounded.card}"
    padding: "2.5rem 1.5rem"
  field-label:
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
  field-control:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.75rem"
    typography: "{typography.body-small}"
  field-hint:
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
  search-dais:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "0.375rem"
  search-submit:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    padding: "0.375rem 1rem"
    typography: "{typography.label}"
  search-submit-hover:
    backgroundColor: "{colors.accent-deep}"
  meter-track:
    backgroundColor: "{colors.surface-sunken}"
    rounded: "{rounded.pill}"
    height: "0.5rem"
  meter-fill:
    backgroundColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    height: "0.5rem"
  stat-value:
    textColor: "{colors.foreground}"
    typography: "{typography.stat}"
  stat-value-accent:
    textColor: "{colors.accent-ink}"
    typography: "{typography.stat}"
  stat-label:
    textColor: "{colors.muted}"
    typography: "{typography.body-small}"
  section-heading:
    textColor: "{colors.foreground}"
    typography: "{typography.headline}"
  section-heading-title:
    textColor: "{colors.foreground}"
    typography: "{typography.title}"
  section-link:
    textColor: "{colors.accent-ink}"
    typography: "{typography.body-small}"
  ruled-row:
    rounded: "{rounded.chip}"
    padding: "0.625rem 0.5rem"
    typography: "{typography.body-small}"
  ruled-row-hover:
    backgroundColor: "{colors.surface-hover}"
  row-figure:
    textColor: "{colors.foreground}"
    typography: "{typography.figure}"
  source-line:
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
  legend-swatch:
    rounded: "{rounded.edge}"
    size: "0.75rem"
---

# Design System: Our Knesset (הכנסת שלנו)

## Overview

**Creative North Star: "The Plenum"**

The whole site is the Knesset hall, seen live and drawn in the flag's own materials. The chrome is the flag's blue field with its two stripes ruled beneath it; the page is the warm cream of the building's Jerusalem-stone cladding; records sit on white paper separated from the stone by a hairline, never by a shadow. National symbols — the blue, the flag, the building — are how the site says "for everyone": no faction's colour is ever the page's colour. Coalition and opposition are the same blue, split by the aisle. The atomic component is the seat: a filled circle is a sitting member, a hollow one a member who misses votes; state lives in form and position, not in hue.

The register is civic and documentary — not editorial, not campaign, not playful. Frank Ruhl Libre, the face of the state's own documents, speaks only where the state speaks: the wordmark, the page title, the numerals at the aisle, and the one figure a finding leads with. Everything else is Heebo at a working size, dense enough for a record and calm enough to trust on a phone. Time-ranked findings are ruled rows and tables, never card grids, and every figure block ends with where its numbers came from and when.

Four scripts share one identity. Nothing in the system depends on uppercase, letter-spacing or a physical left and right: prominence comes from size, weight and ink; layout uses logical properties throughout; the hall itself is the one deliberate exception, fixed left-to-right like every election-night broadcast. Every token is defined under three roots — light, dark, and the high-contrast accessibility mode — and a test fails the build when a text/surface pair drops under WCAG AA in any of them.

**Key Characteristics:**
- Flag blue on Jerusalem stone; white paper for records; ink for text.
- One accent, one hue for both blocs; the aisle carries the split.
- Hairline separation everywhere; elevation only for things that float.
- The display serif for the state's voice only; Heebo for the working record.
- Ruled rows and tables for anything ranked in time; source and date beneath every figure.
- Logical direction, no uppercase, no tracking: finished in Hebrew, Arabic, Russian and English alike.
- Three theme roots guarded by tests; the accessibility layer is a constraint the world respects.

## Colors

The palette is the flag and the building: one saturated blue, white, warm stone and ink; everything else is a status tone or a translucent veil of those. Values below are the light root; the dark and high-contrast roots are recorded per token in `.impeccable/design.json`.

### Primary
- **Flag Blue** — `accent` (#0038b8): the fill of primary actions, selected toggles, the search submit, the seat, the meter, text selection and the caret. `accent-ink` (#0038b8) is the same blue as text: links, "view all", the active menu item, the one stat a block leads with. Identical here, they diverge in dark mode, where a fill dark enough to carry white text is too dark to read as text.
- **Flag Field** — `chrome` (#0038b8): the header bar. It is the flag's blue field, and nothing else on a page competes with it. `on-chrome` (#ffffff) is its text and its stripe; `chrome-hover` (rgba(255, 255, 255, 0.12)) is the white veil under icon buttons, the language select and the active mobile item.
- **Blue Wash** — `accent-soft` (#e6ecf8) and **Blue Hairline** — `accent-line` (#b3c2e8): the secondary button's border and hover fill; the accent badge.
- **Paper on Blue** — `on-accent` (#ffffff): text on any accent fill.
- **Deep Flag** — `accent-deep` (#002a8c): the primary button's and the search submit's hover. A legacy alias that becomes a proper hover token in Stage D; until then it is used for hover only.
- **Coalition / Opposition** — `coalition`, `coalition-ink`, `opposition`, `opposition-ink` (#0038b8): the seat fill and stroke, the hollow-seat glyph, the bloc meters. Four tokens, one value, by design.
- **Info** — `info` (#0038b8), `info-soft` (#e6ecf8), `info-ink` (#0038b8), `info-line` (#b3c2e8): the informational tone of the status ramp — the blue family under the status naming.

### Status
Five tones × four steps: base, soft, ink, line. The base is a fill (a meter, a bar), the soft a badge background, the ink the badge's text, the line a border. Every ink clears 4.5:1 on its own soft and on white in all three roots.
- **Pass Green** — `pass` (#1a7f4b), `pass-soft` (#e3f3ea), `pass-ink` (#166534), `pass-line` (#a7d9bb): a vote that passed; a "for" count.
- **Fail Red** — `fail` (#b3261e), `fail-soft` (#fbe9e7), `fail-ink` (#991b1b), `fail-line` (#f0b4ae): a vote that failed; an "against" count. Red is a result, never a bloc.
- **Warn Amber** — `warn` (#b45309), `warn-soft` (#fdf3dc), `warn-ink` (#7c3a00), `warn-line` (#f5cf7a): a former member; a date scheduled but not confirmed.
- **Neutral Grey** — `neutral` (#595959), `neutral-soft` (#eeece7), `neutral-ink` (#404040), `neutral-line` (#d5d2ca): the default badge. An abstention count is set in `muted`.

### Neutral
- **Jerusalem Stone** — `background` (#f4efe4): the page. The building's cladding — warm, not grey. The arc of seats and the ruled rows sit directly on it.
- **Paper** — `surface` (#ffffff): cards, tables, the float menu, the search dais, form controls. Pure white on purpose: that, plus the hairline, is what separates a record from the stone.
- **Stone Shadow** — `surface-sunken` (#ece5d6): table headers, unselected toggles, the meter track, the ghost button's hover and the menu item's hover. **Stone Wash** — `surface-hover` (#f7f3ea): the hover of a ruled row, a table row and an interactive card.
- **Hairline** — `line` (#e2dbcb): every card border, every rule between rows and sections, the ring built into the float shadow. **Firm Hairline** — `line-strong` (#c9bfa8): form controls and the search dais; an interactive card's hover border.
- **Ink** — `foreground` (#1a1a1a): text, the aisle numerals, the ghost button. Also the outer focus ring (`focus-ring`) in light mode.
- **Muted Ink** — `muted` (#595959): secondary text, captions, the source-and-date line, table headers, placeholders, the bloc names at the aisle. At least 6:1 on every light surface.
- **Focus Amber** — `focus` (#ffbf00): the inner halo of the focus ring. Never a text colour.

### Named Rules
**The One Blue Rule.** The chrome is the flag's blue field and the accent is the same blue; no other saturated colour is ever a page's colour. Party colours from the factions data appear only where a faction is the subject — the legend swatch, and the seats lit while that faction is hovered or focused — never as decoration.

**The Aisle Rule.** Coalition and opposition are both Israel: `coalition` and `opposition` are the same blue in every root. The split is expressed by position — the aisle, a gap, a side — and by form, never by blue-versus-red.

**The Fill/Ink Rule.** `accent` is a fill and `accent-ink` is text, even though they are identical in light mode; in dark mode the fill (#3a6fd0) and the ink (#7db1f7) diverge, and code that used the fill as text goes illegible. The same holds for every status tone: `-soft` for a fill, `-ink` for its text.

**The Three Roots Rule.** Every colour token is declared under `:root`, `html.dark` and `html.a11y-contrast`, and `tests/qa/design-tokens.test.ts` fails the build if one is missing, if a text/surface pair drops under 4.5:1 (3:1 for the accent as a component and for the focus ring), or if a class in `src/` names a token that does not exist. Adding a colour means adding it three times.

## Typography

**Display Font:** Frank Ruhl Libre (variable; falls back to Noto Sans Arabic, Noto Sans, then serif)
**Body Font:** Heebo (variable; falls back to Noto Sans Hebrew, Noto Sans Arabic, Noto Sans, then the system sans). Arabic pages put Noto Sans Arabic first and Russian pages Noto Sans first; each is attached only on its own locale, so no visitor downloads a face they will not read.
**Label/Mono Font:** none — numerals are the body face with `tabular-nums`.

**Character:** The state's document face (the Declaration of Independence is set in Frank-Rühl) beside a plain, modern Hebrew grotesque. The serif is rare and therefore official; Heebo carries the record without ceremony. Headings balance across lines (`text-wrap: balance`) and prose avoids a lone last word (`text-wrap: pretty`), which matters most in Russian and Arabic, whose strings run longest.

### Hierarchy
- **Display** (700, 2.25rem rising to 3rem from 640px, line-height 1.11 then 1): the page title, one per page — "25th Knesset". Frank Ruhl Libre.
- **Wordmark** (700, 1.75rem, line-height 1): the site name in the chrome with the flag inside its letters — two inline-SVG layers (repeating stripes, the Star of David once near the start) clipped to the glyphs by `background-clip: text`, with a 0.55px white stroke so the letterforms stay continuous where the stripes cut through. Fixed geometry in every locale; plain white type where `background-clip: text` is unsupported and under `a11y-contrast`/`a11y-readable`. Frank Ruhl Libre. (`.wordmark` in globals.css.)
- **Figure** (700, 1.25rem, tabular): the one number a ruled row leads with — a participation percentage, a bill count. Frank Ruhl Libre. The bloc counts at the aisle ("59", "61") are the same voice drawn inside the hall's SVG, so they scale with the drawing.
- **Headline** (600, 1.25rem, line-height 1.4): section headings (h2) — "Most missed votes", "Latest votes". Heebo.
- **Title** (600, 1.125rem, line-height 1.56): the headings of the "now" column and of sub-blocks. Heebo.
- **Body** (400, 1rem, line-height 1.5): prose and the page's base size. The working size of lists, tables, nav links and controls is **Body Small** (400, 0.875rem, line-height 1.43).
- **Label** (500, 0.875rem): field labels, toggles, small buttons, a member's name in a row. **Control** (600, 1rem): the default button. **Label Small** (500, 0.75rem): badges and table headers.
- **Caption** (400, 0.75rem, line-height 1.33): the source-and-date line, hints, timestamps, table captions, the last-sync line. Always in `muted`.
- **Micro** (400, 0.6875rem, line-height 1rem): the "automatic translation" mark beside a translated title — declared as `--text-micro`, never `text-[11px]`.
- **Stat** (700, 1.875rem, tabular): the `Stat` primitive's headline figure; its label is Body Small in `muted`. Heebo, not the serif — a stat is a fact, a figure in a ruled row is a finding.

### Named Rules
**The State's Voice Rule.** Frank Ruhl Libre appears in exactly four places: the wordmark, the page title, the aisle numerals, and the leading figure of a finding. Section headings, labels and body stay in Heebo. A page that sets its h2s in the serif is speaking in the wrong voice.

**The Four Scripts Rule.** No `uppercase`, no `tracking-*`. Uppercase is a no-op in Hebrew and Arabic, and letter-spacing breaks Arabic cursive joining. A heading or label earns prominence from size, weight and `muted` ink only.

**The Tabular Rule.** Any number that sits in a column, in a row of figures, or beside another number is set `tabular-nums`, so rows do not jitter and columns align.

## Layout

One centered column, 72rem wide, with a 1rem gutter and 2rem of block padding; the header shares the same container. Sections on a page are 3.5rem apart. Density is that of a record, not a brochure: the working type size is 0.875rem, a ruled row has 0.625rem of block padding, a table cell 0.5rem × 0.75rem.

Breakpoints are Tailwind's three: **640px** is where the hall changes form (two blocks become the arc) and the latest-votes list becomes a table; **768px** is where the nav goes inline and findings become two columns with a 2.5rem gap; **1024px** is where the "now" column moves beside the hall as a 19rem side column, ruled by a hairline on its start edge with 2.5rem of inline padding and a 3.5rem column gap. Below that the same column stacks beneath the hall behind a top hairline and 2rem of padding.

The hall is at most 48rem wide and centered; the search dais beneath it at most 36rem. Findings are two-column grids of ruled rows: a hairline between rows, each row a full-width link with a 36px avatar, a truncating name and its figure at the end, its hover extending 0.5rem past the text edge. A table sits inside a hairline frame that scrolls sideways rather than clipping columns.

Direction is logical everywhere — `ms-`/`me-`/`ps-`/`pe-`, `border-s`/`border-e`, `text-start`/`text-end`, `start-`/`end-`, `inset-inline-*` — and `tests/qa/rtl-discipline.test.ts` fails the build on any physical left/right utility, style prop or CSS declaration in `src/`. The political spectrum bar is the one file allow-listed by name (a left–right political axis is semantic, not textual); the hall needs no exemption because it fixes `direction: ltr` on its own SVG rather than using physical utilities. A text run whose direction differs from the page — a fallback-language label inside an Arabic column — carries `text-end` beside its `dir` override so that, when it wraps, it still hugs the page's start edge (`partyTextClass` pairs with `partyTextAttrs`).

### Named Rules
**The Ruled Rows Rule.** Anything ranked or ordered in time — a leaderboard, the latest votes, this week's sittings — is a ruled list or a table, never a grid of cards. A card is for one entity at a time (a member, a vote) or for a form.

**The Source Margin Rule.** Every block of figures ends with a caption line in `muted` naming its source and the date of the data it shows; a table carries it as its `<caption>`. A curated claim carries its own "Source" link in the margin beside it. A number without its source is not finished.

**The Logical Direction Rule.** Use logical properties and utilities only. The hall is the one deliberate exception, fixed left-to-right in every locale — opposition on the left of the aisle, coalition on the right — because that is the orientation of every election-night broadcast; the spectrum bar is the other, for the same reason.

## Elevation & Depth

The system is flat. Depth is conveyed by material — white paper on warm stone — and by hairlines, not by shadow. A card is `surface` with a 1px `line` border and no shadow; a sunken area (`surface-sunken`) is a slightly darker stone; a hover is a slightly warmer one (`surface-hover`) with the hairline firming to `line-strong`. In dark mode the depth cue inverts on purpose: `surface-sunken` is lighter than the card. The header is sticky but carries a rule, not a shadow — the flag's two stripes, 3px of white and then 3px of blue.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 8px 24px -8px rgba(26, 26, 26, 0.18), 0 0 0 1px var(--line)`): the only shadow. Tinted to ink with the hairline built in, for things that float over content — the "More" menu and the mobile nav panel.

### Named Rules
**The Float-Only Rule.** `shadow-float` is for menus and panels — things that are not in the page's flow. Cards, tables, the search dais and the header never carry a shadow; if something needs separating, give it a hairline.

## Shapes

Three nested radii, always in this order from outside in: **card** (0.75rem) for cards, table frames and empty states; **control** (0.5rem) for buttons, form controls, icon buttons and the float menu; **chip** (0.375rem) for menu items, row hovers and the language select. A chip inside a control inside a card stays geometrically sane because the inner radius is always smaller. Stateful tokens are **pills** (fully round): badges, toggles, the meter and its fill, the search dais and its submit. The **edge** radius (2px) is for a legend swatch and the focus outline — a softening, not a curve.

Borders are 1px hairlines in `line`, or `line-strong` on controls; an empty state is a dashed hairline. The active nav item is a 2px white rule beneath the text — a rule rather than a weight change, so the row never reflows. The chrome's bottom edge is the stripe rule: a 3px white border with a 3px blue shadow beneath it, the flag's two stripes.

The seat is the recurring silhouette: a circle, filled or hollow, in `coalition` blue. The hollow seat recurs at 14px as the mark beside a member who misses votes.

### Named Rules
**The Nested Radius Rule.** card (0.75rem) > control (0.5rem) > chip (0.375rem); pills only for stateful tokens. Use the token utilities `rounded-card`, `rounded-control`, `rounded-chip` and `rounded-full`, never Tailwind's `rounded-lg`/`rounded-md` by name.

## Components

Primitives live in `src/components/ui/`; each is a variant map of full static class strings (a template like `bg-${tone}-soft` compiles to nothing under Tailwind v4, silently), and `tests/qa/ui-primitives.test.ts` asserts the rendered classes and ARIA. The feel is refined and restrained: fills are flat, hovers are colour changes (150ms), nothing lifts or grows.

### Buttons
- **Shape:** control radius (0.5rem); inline-flex, centered, 0.5rem gap for an icon.
- **Primary:** `accent` fill, `on-accent` text, 0.5rem × 1rem padding, 1rem at 600. Hover: `accent-deep`. Disabled: 40% opacity and no pointer events.
- **Secondary:** transparent, 1px `accent-line` border, `accent-ink` text. Hover: `accent-soft` fill.
- **Ghost:** `foreground` text, no border. Hover: `surface-sunken` fill.
- **Sizes:** small (0.375rem × 0.75rem, 0.875rem at 500), default (0.5rem × 1rem, 1rem at 600), large (0.625rem × 1.25rem, 600).
- **ButtonLink** renders a `Link` with the same classes — a link dressed as a button, never a button that navigates.

### Toggles (pills)
- **Style:** pill, 0.25rem × 0.75rem, 0.875rem at 500, inside a `role="group"` with an accessible name.
- **State:** selected is an `accent` fill with `on-accent` text (`aria-pressed` on a button, `aria-current` on a link); unselected is `surface-sunken` with `foreground`, hovering to `surface-hover`.

### Badges
- **Style:** pill, 0.125rem × 0.5rem, 0.75rem at 500; a tone is its `-soft` fill with its `-ink` text.
- **Tones:** neutral (default), pass, fail, warn, info, accent. A badge always carries a word; its colour is never the only signal.

### Cards / Containers
- **Corner Style:** card radius (0.75rem).
- **Background:** `surface` (white).
- **Shadow Strategy:** none (see Elevation & Depth). An interactive card — a whole-card link — hovers to `surface-hover` with a `line-strong` border.
- **Border:** 1px `line`.
- **Internal Padding:** 1.5rem (default), 1rem (small), 0.75rem (compact), or none.
- **TableFrame:** the same hairline surface around a table, scrolling sideways when wide. Header row in `surface-sunken`, 0.75rem at 500 in `muted`; cells 0.5rem × 0.75rem at 0.875rem; rows divided by hairlines and hovering to `surface-hover`; numeric columns end-aligned and tabular; the source-and-date line is the `<caption>`.
- **EmptyState:** a dashed hairline card, 2.5rem × 1.5rem padding, centered: a 500-weight title, an optional small `muted` line, an optional way out.

### Inputs / Fields
- **Style:** full-width, control radius, 1px `line-strong` border, `surface` fill, 0.5rem × 0.75rem padding, 0.875rem text, `muted` placeholder. The label sits above and is always visible (0.875rem at 500); a hint sits below in caption `muted`, bound with `aria-describedby`. A placeholder is not a label.
- **Focus:** the global ring (below); no inner glow, no border shift.
- **Search dais:** the site search is a pill — `surface` fill, `line-strong` border, 0.375rem of padding with 1rem at the inline start, an 18px `accent` magnifier, a bare input, and a pill `accent` submit (0.375rem × 1rem, 0.875rem at 600, hover `accent-deep`). On the home page it sits centered at the base of the hall.

### Navigation
- **Chrome:** a sticky bar in `chrome` with `on-chrome` text, 0.75rem × 1rem padding, ruled beneath by the stripe rule. At the start, the wordmark in the display face with the flag inside its letters (see Wordmark under Typography). Then seven section links at 0.875rem — Members, Votes, Laws, Committees, Factions, Budget, 2026 Elections — and a "More" disclosure, so the bar is one line at every desktop width; the wordmark is Home. At the end, 2.5rem icon buttons (search, theme, menu) with control radius and a `chrome-hover` veil on hover, and the language select — a chip-radius control on the same veil with a 40% white border.
- **Link states:** inactive links are white at 85% opacity, 100% on hover; the active link (`aria-current="page"`) carries a 2px white rule beneath the text, never a weight change.
- **More menu:** a panel hung from the trigger's end edge — `surface`, 1px `line`, control radius, 0.25rem padding, 12rem minimum width, `shadow-float`; items are chip-radius rows (0.5rem × 0.75rem) hovering to `surface-sunken`, the active one at 600 in `accent-ink`. Escape and click-away close it.
- **Mobile (below 768px):** the links collapse behind a hamburger into a panel that hangs from the bar in `chrome` with `shadow-float` over a 20% black backdrop; items are 0.875rem rows, the active one on a `chrome-hover` veil at 600.
- **Skip link:** fixed at the top start edge and hidden until focused — `accent` fill, white text, 0.6rem × 1rem, rounded only at its bottom corners.

### Section headings
`SectionHeading` renders an h1–h3 at headline (1.25rem) or title (1.125rem) size, 600, in Heebo, with an optional trailing slot on the same baseline: a "view all" link (0.875rem, `accent-ink`, underlined), a count, a control. Prominence comes from size and weight; there is no uppercase and no tracking.

### Figures
- **Stat / StatGrid:** a centered headline figure (1.875rem, 700, tabular; `accent-ink` for the one figure a block leads with) over a small `muted` label, in two- to five-column grids with 1rem gaps.
- **Meter:** a 0.5rem pill track in `surface-sunken` with a pill fill in `accent`, a status tone, or `coalition`/`opposition` — `role="meter"` with its name and value range. The track stays; it is what makes the proportion readable.
- **Ruled row:** a full-width link (0.625rem block padding, 0.75rem gap), a 36px avatar, the name (truncating, with `dir` and `lang` when it is untranslated Hebrew), and the figure in the display face at the end. The hollow-seat glyph precedes the name in the "most missed votes" list.

### The Seat (signature)
The hall (`Plenum`) draws one seat per sitting member as an SVG circle. From 640px it is an arc of six concentric rows, the opposition on the left of a 9-unit aisle (in a 100-unit radius) and the coalition on the right; on a phone the same seats are two blocks six seats tall, facing across a three-cell aisle, each bloc's largest faction nearest the centre. In the arc the bloc counts sit at the aisle in the display face with the bloc names beneath them in `muted`; in the blocks the counts sit above and the names below, at the aisle. The drawing is fixed `direction: ltr` in every locale.

Seat states, in form and opacity only:
- **Filled** — `coalition` fill: a sitting member.
- **Hollow** — no fill, a `coalition` stroke (1.4 units in the arc, 1.2 in the blocks): a member among the most missed votes.
- **Lit** — filled and stroked in the faction's own colour while that faction is hovered or focused in the legend.
- **Dimmed** — 28% opacity while another faction is lit. Fill and opacity transition over 300ms, ease-out.

Each seat is a link to the member with `tabIndex={-1}`: a pointer target, not a tab stop — 120 stops would bury the page for keyboard users. The legend beneath the hall is the semantic and keyboard path: one link per faction, with a 12px swatch in the faction's colour (edge radius), its name and its seat count in tabular `muted`; hovering or focusing it lights the seats.

### Focus and browser surfaces
- **Focus ring:** every `:focus-visible` gets a 3px `focus-ring` outline (ink in light, white in dark) offset 3px, outside a 3px `focus` amber halo, with a 2px radius. Amber alone is 1.65:1 on white; the outer ring is what guarantees 3:1 against whatever the element sits on.
- **Browser surfaces:** selection is `accent` with `on-accent` text; the caret and native form accents are `accent`; links underline 1px at 0.18em offset; the touch tap-highlight is `accent` at 18%.

### The accessibility layer (a constraint, not a theme)
The accessibility menu adds classes to `<html>`, and the world must survive each of them:
- `a11y-contrast`: black page, white text and lines, yellow (#ffff00) accent and links, one light blue (#8ab4ff) for both blocs; the chrome goes black and the flag's blue yields to the standard, so the identity is carried by the wordmark alone (rendered as plain white type there). It uses `!important` and beats every token.
- `a11y-grayscale`: a full grayscale filter — nothing may depend on hue alone (the seat states and badges do not).
- `a11y-links` and `a11y-headings`: a yellow marker on links; an `accent` outline and 8% tint on headings.
- `a11y-keyboard`: a strong `accent` double ring on any focused element, and a 6rem scroll margin so a focused item clears the sticky header.
- `a11y-readable`: Arial at 1.7 line-height with 0.02em spacing, forced on everything — never fight it with `!important` font declarations.
- `a11y-no-motion` and `prefers-reduced-motion`: every animation and transition to zero.
- Text scaling: a font-size percentage on `<html>`; every dimension in the system is rem-based so the whole UI scales, and nothing is pinned in px except hairlines, icons and the stripe rule.

## Do's and Don'ts

### Do:
- **Do** use `bg-accent` for fills and `text-accent-ink` for text, and `bg-<tone>-soft` with `text-<tone>-ink` for badges; declare any new colour under all three roots.
- **Do** separate a card from the page with `border border-line` on `bg-surface`, and reserve `shadow-float` for menus and panels.
- **Do** set ranked or time-ordered data as ruled rows (`divide-y divide-line`) or a table inside `TableFrame`, and end every figure block with its source and date in caption `muted`.
- **Do** set the page title, the wordmark, the aisle numerals and a finding's leading figure in `font-display`; keep everything else in Heebo.
- **Do** set every number in a row or column `tabular-nums`, and wrap untranslated Hebrew in `dir="rtl" lang="he"` via `rtlAttrs` or `localizedAttrs`; give a run that opposes the page direction `text-end` as well.
- **Do** use logical utilities (`ms-`, `pe-`, `border-s`, `text-start`, `end-0`) and the radius tokens (`rounded-card`, `rounded-control`, `rounded-chip`).
- **Do** keep coalition and opposition in the same blue and express the split by the aisle, a gap, or a side.
- **Do** make every interactive thing reachable by keyboard through a real link or button with a name; when a drawing has too many targets, provide a legend or list as the keyboard path.

### Don't:
- **Don't** introduce a second saturated colour as decoration, or colour a bloc red; party colours are data and appear only where a faction is the subject.
- **Don't** use `uppercase` or `tracking-*` anywhere, in any script.
- **Don't** put a shadow on a card, a table, the search dais or the header.
- **Don't** use raw Tailwind palette hues (`bg-green-100`, `text-amber-800`), `bg-white`, `bg-black/5` or `text-[11px]` in new code; the legacy ratchet lets no file add any.
- **Don't** use physical left/right utilities, style props or declarations; the spectrum bar is the only allow-listed file.
- **Don't** render a photograph as a hero, or lay statistics over an image of the building.
- **Don't** open a page with a card grid of findings; a card is for one entity or one form.
- **Don't** rely on hue alone for any state — a seat is hollow, a badge has a word, a result has a word.

## Transitional State

Not the system, but the ground it currently stands on. The class-name dark-mode retrofit block in `src/app/globals.css` (`html.dark .bg-white { … }` and the raw-hue overrides beneath it) still coexists with the token layer and is being ratcheted out: `tests/qa/no-legacy-utilities.test.ts` holds a per-file budget in `tests/qa/legacy-utilities.budget.json` — 301 legacy utilities across 41 files at this writing — that may only ever go down, and a file with no budget may not add any. Until Stage D removes the block, `accent-deep` and `accent-sky` survive as aliases, and several components composed into the home page still render through the retrofit: the work-in-progress banner in the layout, the reading badge's thirteen raw hues, the key-dates chips (`text-[11px]`, `uppercase`), the footer's `bg-white`, the mobile backdrop, and the accessibility menu's own button and panel (`shadow-lg`, `shadow-2xl`, `hover:scale-105`). Pre-migration pages (search, elections, a party profile) still carry `uppercase tracking-wide` sub-headings and a `tracking-widest` letter tile; `SectionHeading` exposes an unused small `muted` variant. None of these is a pattern to inherit.

# PIXELUP LABS 2026: design language

The source of truth for how pages on this site look, read and move. New pages (proposals, case studies, landing pages) are built from these rules and the existing components, not from scratch.

This file is maintained by the `pixelup-design-language` skill. When Daksh corrects a design or copy decision, the rule goes here (and the dated note into the skill's `learnings.md`).

Last updated: 12 Oct 2026

---

## 1. Principles

- **Monochrome.** Ink, paper and greys. Colour enters only through the work (imagery) and the mark inverting what passes under it. The one exception is the footer's brand gradient (`#273AFB` blue to white).
- **Quiet type, one loud thing per screen.** Most text is small (`--fs-micro`, `--fs-body`); each section gets one display moment (a heading, a number, a price, a CTA).
- **Sharp.** Square corners everywhere: frames, chips, badges, icons. No rounded cards, no circles around icons, no pills except the copy toast.
- **Hairlines, not boxes.** Structure comes from 1px `--rule` lines between items, not from filled cards.
- **Simple over clever, especially on phones.** If a visual needs explaining, replace it with a sentence. (A calendar chart was removed from the proposal in favour of one headline: "15:00–22:00 Copenhagen time".)

## 2. Tokens (`src/styles/base.css`)

| Token | Value | Use |
|---|---|---|
| `--ink` | `#0c0c0c` | Page background |
| `--panel` | `#111111` | Media placeholders |
| `--rule` | `#363636` | Hairlines |
| `--fog` | `#a9a9a9` | Secondary text, labels |
| `--mute` | `#7c7c7c` | Tertiary text (AA floor on ink) |
| `--paper` | `#ffffff` | Primary text, accents, the hover fill |
| `#cfcfcf` | | Body copy that sits between fog and paper |
| `--u` | `vw / 1440` (desktop), `vw / 390` (phones) | 1 design px; sizes are `calc(N * var(--u))` with a `max(...)` floor |
| `--pad` | 24u, min 16px | Page gutter |
| `--track` | `-0.03em` | Tracking on everything |

Type is **Switzer** 300/400/500, self-hosted. Sizes: `--fs-micro` (labels), `--fs-body` (copy), `--fs-m` (list items, sub-heads), `--fs-h` (section headings), `--fs-display` / `--fs-title` / `--fs-mega` (one per screen).

Selection colour is `#2549e6`.

## 3. Grid and layout

- **16 columns** across the content width; everything snaps to them. Header: brand on col 1, nav on col 9, meta from col 13.
- **Section text pattern** (`.cs-text`): eyebrow + heading on cols 1–8, copy on cols 10–16. The col-10 edge is shared by section copy, table "decision" columns and closing lines; align new elements to it.
- **Eyebrows**: uppercase `--fs-micro` in `--fog`, often with a number in paper: `HOW THE WEEKS RUN 03`.
- **Lists**: rows separated by 1px `--rule` top borders, closed with a bottom border. Optional or secondary content uses **dashed** rules and fog text.
- **Meta rows** (`.cs-meta`): label in fog over value in paper, on the header's columns on desktop.

## 4. Components to reuse

| Need | Use |
|---|---|
| Page intro | `.cs-intro` + `.cs-kicker`, `.cs-title`, `.cs-lede`, `.cs-meta` |
| Section | `.cs-section > .cs-text` with `.cs-text__head` / `.cs-text__body` |
| Label + text pairs | `.cs-items` / `.cs-item` (dt label, dd text) |
| Media | `MediaFrame` / `MediaGroup`: frames take each image's own aspect ratio (`w`/`h` from `scripts/sync-content/measure.mjs`); never crop to a fixed shape |
| Hover list | the News row: paper fill wipes up from the bottom, text turns ink |
| Big CTA | Footer `action`: one line sized to span the content width (re-measure the em width when the label changes) |
| Status | `StatusDots` + text |
| Arrow | `ArrowSwap` (the site's single arrow); `rotate={-45}` for external links |
| Expand / collapse | native `<details>` via `components/proposal/Collapse.tsx` (refreshes ScrollTrigger on toggle) |

## 5. Icons (`src/components/proposal/icons.tsx`)

- **Straight lines only**: square caps, mitred joins, no circles or curves (clock = hourglass, contact = crosshair).
- **One size: 14px**, stroke 1.25, `currentColor`. Never scale icons with the text (`em`); mixed sizes read as broken.
- Icons are labels' companions, not decoration. Use them on meta rows, rules and links, not on every line.
- **Phones:** the icon sits **above** its label (stacked), not beside it.

## 6. Motion

- Easing: `pxl` = `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out, reveals); `pxl-io` = `cubic-bezier(0.76, 0, 0.24, 1)` (wipes).
- Reveals via attributes (handled in `Experience.tsx`): `data-reveal="rise"` (masked line rise), `"lines"` (SplitText lines), `"fade"`, and `data-media` (image unmask + settle).
- Don't put `data-reveal` on content that starts hidden (inside a closed `<details>`): it's measured while hidden and never appears.
- **Hover: one timing for the whole element.** Background wipe, text colour, rules and chips share a duration and curve (proposal rows: `0.7s cubic-bezier(0.65, 0, 0.35, 1)`, wipe = `scaleY` + opacity). Mismatched timings read as janky.
- Respect `prefers-reduced-motion` (the base CSS already collapses durations).

## 7. The mark

The 3D logo lives in the root layout and docks per section (`src/lib/docks.ts`). It uses `mix-blend-mode: difference`. On long-read pages, dock it as the small corner badge (`data-dock="badge"`) so it never covers text; it signs the footer CTA at the end.

## 8. Copy voice

- Short, plain, specific. One idea per sentence. Numbers over adjectives ("45 minutes a week", "4 calls · ~3 hours of your time").
- Write to the reader ("you"), name the decision they make.
- Times in the **reader's** timezone (a Danish client gets Copenhagen time, not PST).
- No example data that could be read as a commitment (no sample call slots, no placeholder prices).
- Headlines can be bold; supporting copy stays calm.

## 9. Responsive rules (check every change at 375px)

- Single column; stack items vertically (meta rows become one item per row, with hairlines between).
- Nothing may widen the page: compare `document.documentElement.scrollWidth` with `clientWidth` (not `innerWidth`). Display numbers and prices need a phone size (`min(24vw, 104px)` for a 7-character price).
- Tap targets ≥ 40px tall for standalone links.
- Charts and dense grids don't go on phones; state the fact instead.
- Long badge text wraps badly; keep badges to one or two words and move detail to a line below.

# Handoff: FieldShore v4 — Card Components, Tokens & Brand Marks

Design-session output for the `v4-redesign` branch of `Vergo402/paratech-struts`.
Target docs to update alongside implementation: `docs/v4-design/07-design-system/` and `docs/v4-design/03-primitives/`.

## Overview
This package contains every design decision finalized in the design-system review session:
a restructured RecommendationCard header, Treatment C value shelves and slide-to-reverse on
ShorePointCard, a new GroupedShorePoint rolodex-stack pattern for multi-card points
(Double T / 3-Post), a LockStroke system-color change, and the revised brand mark set.

## About the Design Files
The files in this bundle are **design references created in HTML/JSX** — prototypes showing
intended look and behavior, not production code to copy directly. Recreate these designs in
the app's existing environment (the FieldShore PWA, vanilla JS + its established patterns in
`app.js`/`index.html`), using the v4 token vocabulary already defined in
`docs/v4-design/07-design-system/`. The JSX files cite real v4 tokens (`--st-*-line`,
`--sys-*`, `--radius`, `--font-mono`, etc.) — treat the CSS blocks inside them as the spec.

## Fidelity
**High-fidelity.** Colors, spacing, type sizes, and interaction thresholds are final and
reviewed. Recreate pixel-perfectly with the codebase's existing patterns.

---

## 1 · ShorePointCard changes

Reference: `components/ShorePointCard.jsx` (CSS spec in the `CSS` constant).

### 1.1 Apparatus line (NEW)
- `location` no longer carries the apparatus. Two separate lines under the title:
  - Location — `var(--body)`, `--text-secondary` (e.g. "Division 2 · C side")
  - Apparatus — `var(--caption)`, `--text-tertiary`, 1px below (e.g. "Eng 7")

### 1.2 Treatment C value shelf (decision: "tweak C")
The lifecycle value row (Required / Cut length / Set length) is now a full-bleed tinted shelf:
- Bleeds edge-to-edge: `margin: 12px -16px 0 -24px; padding: 12px 16px 12px 24px`
  (negative margins match card padding `16px/24px`)
- Background: `color-mix(in srgb, var(--_line) 13%, var(--card))` where
  `--_line = var(--st-<state>-line)`
- Border top + bottom: `1px solid color-mix(in srgb, var(--_line) 22%, var(--border))`
- The measurement number is colored `var(--_line)` in EVERY state
- Theme variants: sunlight `10%` mix on `#fff`; broadcast `18%` mix on `var(--card)`
- Promoted (cutting) state: number 28px / 700 (unchanged), inherits shelf

### 1.3 Slide-to-reverse (was a tap button — now a slide)
Reverse must be a deliberate gesture, matching the forward slide:
- 44px-high pill track, label "Slide back to {prev}" centered
- Knob (36px circle, left-arrow) starts at the RIGHT edge, drags LEFT
- Commit threshold: 60% of track travel; snaps back otherwise
- Same pointer-event mechanics as forward slide; `touch-action: none` on knob

### 1.4 Removed-from-cut-list slash
- Red slash spans the FULL card, corner to corner (upper-right → lower-left)
- SVG line (100,0)→(0,100), `preserveAspectRatio="none"`, `vector-effect: non-scaling-stroke`
- Stroke: `var(--st-danger-line)`, width 5px

### 1.5 Group counter badge (NEW `group` prop)
- Mono-font pill, e.g. "1 / 3": `--font-mono`, caption size, 700, `tnum`,
  `--surface-elevated` bg, `--border` 1px, `--radius-sm`, padding 3px 8px
- Sits in the header badge row BEFORE the status badge

### 1.6 Stacked fractions (the `.fr` mechanism)
Unicode vulgar fractions (¼ ½ ¾ ⅛ ⅜ ⅝ ⅞ ⅓ ⅔) render as stacked digit pairs:
- `inline-block; overflow: hidden` anchors the box baseline to its bottom edge (CSS2.1) —
  denominator sits ON the text baseline, numerator tops out at cap height
- At display sizes (40px/28px numbers): `font-size: .36em; height: 2.31em; top: .151em`
- At ledger sizes (16px numbers): `font-size: .5em; height: 1.75em; top: .151em`
- Numerator `display:block`; denominator absolute bottom with
  `border-top: .09em solid currentColor; padding-top: .04em`
- Spaces inside measurements become thin spaces (U+2009)

---

## 2 · GroupedShorePoint (NEW component)

Reference: `components/GroupedShorePoint.jsx`. For points with multiple cards
(Double T = 2, 3-Post = 3).

### Collapsed (rolodex stack)
- Front card = active member's full ShorePointCard, with `group` badge "n / total"
- Other members fall LEFT as labeled tabs: 130px wide cards, only a 30px sliver
  (`TAB_W = 30`) visible per tab; left-radius only; 4px status stripe
  (`--st-<state>-line`); member label vertical (writing-mode: vertical-rl, rotated 180°),
  mono 10px 700 uppercase
- Tab order: left→right mirrors pile bottom→top. Cyclic: `slot = (n-1) - ((i - active + n) % n)`
- **Rotation: tap a tab → that member comes to front; the previous front goes to the
  BOTTOM of the pile (leftmost tab).** Front card animates in from the travel direction
  (220ms translateX ±26px + fade, reduced-motion safe)
- NO arrow buttons, NO "n cards" expander chip — dots only
- Pager dots under the card: 8px circles tinted `--st-<state>-line` per member,
  active dot stretches to 22×8px pill at full opacity, inactive 45%
- Tap card body (not slide/reverse controls) → expand

### Expanded
- Border-left indented list (2px `--border-strong`, 12px padding-left)
- Header row: "{groupTitle} · {n} cards" label (caption 700 uppercase) + "Stack" pill
  button (40px, chevron-up) to collapse
- Each member renders a full interactive ShorePointCard with its own group badge
- Entrance: staggered 45ms/card translateY(-10px)+fade, 240ms, reduced-motion safe

### API
`{ groupTitle, location, apparatus, members: [{id, label, value, state}], onAdvance(id), onReverse(id) }`

---

## 3 · RecommendationCard changes

Reference: `components/RecommendationCard.jsx`.

### 3.1 Centered header (decision: visually distinct from shore points)
Header content centers across the full card width; fit badge is absolutely positioned
top-right (OUTSIDE the centering flow). Line order:
1. **Identity** — `<SystemColor> · <Model#>` e.g. "**Gold** · LS 610" — headline-2 size,
   system-color word in `var(--_sys)` 700, rest `--text-primary`. (Product/type name was
   REMOVED from this line by decision.)
2. **Connectors** — the `spec` string, e.g. "8×8 base plate · sole plate" — body,
   `--text-secondary`
3. **Apparatus** — body size, weight 600, `--text-secondary` (bumped up by decision —
   bigger + bolder than location)
4. **Location** — body, `--text-secondary`
- Identity column `max-width: calc(100% - 56px)` so it never collides with the badge;
  lines 2–4 ellipsize on overflow
- SYS_LABEL: gold → "Gold", grey → "Grey", lockstroke → "LockStroke"

### 3.2 Ledger vocabulary (renamed by decision)
- "Required" → **"Raw opening"** (the measured opening, floor-to-ceiling etc.)
- "Effective" → **"Required strut length"** (Raw opening − deductions; what drives
  model selection and extension setting)
- Deduction rows: indented 16px under Raw opening, `white-space: nowrap`,
  `–` prefix, `--text-secondary`
- Ledger numbers: mono, `--body-lg` (16px), `tnum`; fractions use the half-size `.fr` spec

### 3.3 Rated-capacity footer
- Label: **"Rated capacity at {capacityAt}"** where `capacityAt` = the strut's extended
  length (equals Required strut length); value = published rating at that length,
  **rounded DOWN** (conservative floor), e.g. "18,400 lb"
- The "Conservative-floor capacity…" disclaimer caption was REMOVED (no default caption)
- The "Secondary" tag was removed from the label

### 3.4 New props
`location`, `apparatus`, `capacityAt` (all optional strings).

---

## 4 · Token change

In `colors` tokens (all themes):
- `--sys-lockstroke: #06B6D4` (was a grey-blue `#7DA3B5` — too close to grey)
- `--sys-lockstroke-bg: #0E262D`
Rationale: LockStroke is rare; cyan is the opposite pole from gold and unmistakable from
grey. Verify it stays distinct from `--st-process-line` blue in context.

---

## 5 · Brand marks (revised)

In `assets/logo/`. The **emblem family is unchanged** (mark-color.svg, app-icon.svg,
wordmark.svg, brand-sheet.svg — left as-is by decision). Two files were REVISED:

### mark-mono.svg + favicon.svg ("F5" fix)
- The blocky S read as "5". Fixed with S-defining hook terminals: a 16×24 stub dropping
  from the RIGHT end of the top bar, and a 16×24 stub rising from the LEFT end of the
  bottom bar (geometry a 5 never has)
- F and S unified: identical `rx="4"` corner radius on every rect (F was pill rx=8,
  S was sharp — met in the middle), identical 16-unit stroke, S narrowed 68 → 56 units
  wide to optically match the F; viewBox now `0 0 160 100`
- mark-mono uses `fill="currentColor"` — place it in a context that sets `color`
  (usually `var(--accent)`)
- favicon: same glyph in `#D4A017` on `#1C1F23` tile, `rx 18`, glyph group
  `translate(14.8, 28) scale(0.44)`

### Primary lockup
Emblem (mark-color.svg) + HTML-styled wordmark text — "Field" in `--text-primary`,
"Shore" in `var(--accent)`, both 700, letter-spacing -.01em. Do NOT use the baked-in
text from wordmark.svg for in-app lockups; render the text in the app's type system.

---

## Interactions & Behavior summary
- Forward slide: knob left → right, commit ≥ 60% travel, 120ms settle, then `onAdvance`
- Reverse slide: knob right → left, same threshold, then `onReverse` — NO timed undo;
  reverse is always available
- Rolodex: tap tab → rotate to front (old front to bottom); tap body → expand;
  "Stack" → collapse
- All animations gate on `prefers-reduced-motion`

## Design tokens used (existing v4 vocabulary)
`--card --border --border-strong --border-hairline --elev --hairline --radius --radius-sm
--radius-pill --shadow --shadow-knob --accent --accent-ink --press-opacity --font-ui
--font-mono --headline-2 --headline-2-w --body --body-lg --caption --label --mono
--tracking-label --text-primary --text-secondary --text-tertiary --st-<state>-line/-fill/-ink
--sys-gold --sys-grey --sys-lockstroke --status-inprocess-* --status-danger-*`

## Files
Component sources carry a `.txt` suffix so this reference bundle doesn't collide with the
live design-system build — strip the suffix (or just read them in place) when implementing.
- `components/ShorePointCard.jsx.txt` + `.d.ts.txt` — gate primitive (CSS spec inside)
- `components/GroupedShorePoint.jsx.txt` + `.d.ts.txt` — rolodex stack (NEW)
- `components/RecommendationCard.jsx.txt` + `.d.ts.txt` — centered-header ledger card
- `components/demo.card.html` — working demo of all three with real prop data
- `assets/logo/` — full mark set (mono + favicon revised; emblem family unchanged)

# Visual Language — Brainstorm Essay

**Phase C, Essay 2 of 12**
**Lens: Visual Language**
**Author:** Mobile UX specialist agent
**Date:** 2026-05-23

---

## Executive Summary

FieldShore v3 looks like what it is: a prototype that earned its bones in the field. System fonts, gray cards, a "P" in a square, no intentional spacing grid. The bones are audited and safe. The skin is not the product that should be asking departments to trust it with a Paratech load call.

v4's visual language has one organizing obligation: communicate that FieldShore is a serious safety instrument, not a side project. The same way a Garmin avionics MFD communicates authority through typographic restraint, density discipline, and color specificity, FieldShore should communicate it through every pixel decision, from the corner radius on a shore point card to the easing curve on a status transition.

The proposed system positions FieldShore closest to Linear for information density on the tablet surface, Apple HIG for motion restraint and typography hierarchy, and Stripe for marketing and onboarding craft. The fire service reference apps all share one visual DNA: blue, white, and legacy red, with system fonts and no outdoor readable story. FieldShore exits that aesthetic entirely. The background is a muted dark slate, not navy. The accent is a specific gold, not a generic amber. The typeface is a grotesque with genuine tabular numeral support, not Inter defaults.

Four themes are specified: light (office, preplan review), dark (incident operations, night readiness), sunlight (phone on scene in direct sun, every surface maxed), and broadcast (TV read at 12 feet). The themes are not inverts of each other. Each is authored from scratch with its own token values. The "P" mark gets a geometry refresh but not a rebrand. Marketing shares the design system tokens with the app, which is the only way to prevent the marketing site from lying about what the product looks like.

---

## Typeface System

### The problem with Inter

Inter is the default typeface for every product that does not have a typeface. It is technically excellent and visually unremarkable, which is exactly the wrong trade for a product trying to signal authority in a category full of Inter. RapidSOS uses Inter or a near cousin. First Due reads like it. v3 FieldShore uses system default, which on iOS is SF Pro and on Android is Roboto. All three are interchangeable in the category.

The question from open question #9 is not "Inter or custom commission" as a binary. It is: what does the typeface system need to do for the four surfaces, and which open source option does that best?

Requirements, derived from the four surfaces and twelve principles:

1. **Tabular numerals at every weight.** Shore point measurements, strut load capacities, cut lengths, and timestamps all live in tables and aligned columns. A typeface with proportional numerals produces ragged columns. This eliminates most display faces and several otherwise strong grotesques.
2. **Legible at 11px on a dense tablet surface.** The CP tablet shows a lot of data. Caption size text cannot be a blurry hint.
3. **Heavy weight reads well at 72px on a broadcast TV surface.** The TV view is large, far away, and read at a glance. The display weight must be genuinely bold without feeling condensed or cheap.
4. **Works under all four themes.** Some typefaces that look beautiful in dark mode look washed out in sunlight high contrast. Weight strategy must account for this.
5. **Variable font preferred.** Four surfaces, many weights and sizes, a static font causes either a network tax (loading 8 weight files) or a visual compromise (only 2 weights loaded). A variable font solves this cleanly.

### Recommended candidate: Geist

Vercel's Geist (open source, OFL, released 2023) is the strongest open source grotesque for this product. It is a variable font. It has genuine tabular numeral support. It reads with authority at small sizes. The display weights land clean and uncompromised. Critically, it is not Inter, and it is associated with developer tools and professional software, not generic SaaS.

The alternative case is **Outfit** (OFL, Google Fonts), which has a slightly warmer feel and performs well in outdoor contrast tests. Outfit lacks the same tabular numeral rigor as Geist, which is a real trade against FieldShore's measurement-heavy screens.

**Söhne** (Klim Type Foundry, licensed) would be the obvious professional choice if budget were not a constraint. Söhne is what Linear uses. The weight differentiation is outstanding and the contrast between Söhne Book and Söhne Kraftig at small sizes is exactly what the shore point card body copy needs. License fee for a web/app product from Klim runs several thousand dollars depending on usage tier. Worth flagging for Phase E consideration but not assumed here.

**GT America** (Grilli Type) is another strong licensed option, closer to the Swiss grotesque tradition, with excellent headline weights. Similar licensing cost consideration as Söhne.

The recommendation is **Geist as default with a Phase E decision point** on whether to license Söhne. If Alex commits to Söhne, every typeface spec below is token-safe; swap the font-family value at the root and the ramp holds.

### Type ramp

All sizes in pt (CSS px equivalent at 1:1 device baseline). The ramp uses a minor third scale (1.2 multiplier) anchored at 14pt body.

| Token | Size | Weight | Use |
|---|---|---|---|
| `--type-display-1` | 40pt | 700 | Broadcast TV section headers |
| `--type-display-2` | 32pt | 700 | Marketing hero headline |
| `--type-headline-1` | 24pt | 600 | Modal title, section header |
| `--type-headline-2` | 20pt | 600 | Card title on tablet, toast headline |
| `--type-body-lg` | 16pt | 400 | Operation name, apparatus name |
| `--type-body` | 14pt | 400 | Shore point body copy, row labels |
| `--type-body-medium` | 14pt | 500 | Active state labels, badge text |
| `--type-caption` | 12pt | 400 | Timestamp, secondary metadata |
| `--type-label` | 11pt | 500 | Table column header, nav label |
| `--type-mono` | 13pt | 400 | Measurement values, load capacity numbers |

The mono slot uses **Geist Mono** (also OFL, same foundry). Measurement numbers and load table values render in mono to guarantee column alignment regardless of digit combination. This is a visible quality signal: every other fire service app in the teardown corpus uses proportional numerals in measurement columns.

### Letter spacing

Body text uses default tracking (0). Label and caption text use `+0.02em`. Display text uses `-0.02em` to close the gaps that variable fonts open at large sizes. Nav labels at 11pt use `+0.04em` for legibility on small targets.

---

## Color System

### Design position

Every fire service app in the teardown corpus uses the same palette: navy primary, white background, red status, amber warning. Tablet Command, RapidSOS, Fire Rescue Systems, First Due. The aesthetic is 1990s dispatch console, carried forward unchanged.

FieldShore exits that aesthetic. Not because the palette is wrong (navy and red communicate authority and urgency accurately in the fire service), but because it is invisible. An IC looking at the FieldShore screen should not mistake it for another dispatch console.

The proposed system: muted dark slate as the default dark surface, a specific warm gold as the primary accent, structural typography doing the visual work that most products leave to color. Status semantics use WCAG-compliant color but are never color-only (Principle 9 and picker doctrine floor).

### Four themes

**Theme 1: Light (preplan, office, demo mode)**

The light theme is not a white app with a blue header. It is warm off-white surfaces with precise stroke borders and no drop shadows. Comparable to Stripe's documentation surface or Linear's light mode: clean without being clinical.

Core tokens:
- `--surface-bg`: `#F7F6F3` (warm white, not pure white)
- `--surface-card`: `#FFFFFF`
- `--surface-card-hover`: `#FAFAF9`
- `--surface-stroke`: `rgba(0,0,0,0.08)` (hairline border, 1pt)
- `--text-primary`: `#1A1A1A` (not pure black; 8:1 contrast on surface-bg)
- `--text-secondary`: `#5C5C5C` (4.8:1 contrast on surface-bg, passes AA)
- `--text-tertiary`: `#8A8A8A` (3.2:1 contrast on surface-bg, AA at large text only)
- `--accent`: `#B8860B` (dark goldenrod, warm gold; 4.6:1 on surface-bg, passes AA)
- `--accent-subtle`: `#FFF8E7` (gold tint background for selected states)

Status tokens (light theme):
- `--status-pending`: `#6B7280` text on `#F3F4F6`
- `--status-active`: `#1D4ED8` text on `#EFF6FF`
- `--status-cutting`: `#92400E` text on `#FEF3C7`
- `--status-runner`: `#065F46` text on `#ECFDF5`
- `--status-secured`: `#1E3A5F` text on `#E0F2FE`
- `--status-warning`: `#B91C1C` text on `#FEF2F2`

All status pairs meet 4.5:1 minimum. Cutting and runner use the specific tokens fixed in v3.5.2 audit; carry those forward.

**Theme 2: Dark (incident operations)**

Not a near-black. Not #0A0A0A OLED black. A muted dark slate in the #1C1F23 range. This is the key differentiator from every competitor in the teardown: the dark mode slate is desaturated and warm, not cold navy.

Core tokens:
- `--surface-bg`: `#1C1F23`
- `--surface-card`: `#252930`
- `--surface-card-elevated`: `#2E333B` (modal, sheet, focused state)
- `--surface-stroke`: `rgba(255,255,255,0.07)` (hairline at 7% white)
- `--text-primary`: `#F0EFEC` (warm white, not blue-white)
- `--text-secondary`: `#9B9A97` (4.6:1 on surface-card, passes AA)
- `--text-tertiary`: `#6B6A67` (3.1:1 on surface-card, AA large text only)
- `--accent`: `#D4A017` (brighter gold for dark surfaces; 4.5:1 on surface-bg)
- `--accent-subtle`: `#2A2310`

Status tokens (dark theme): same semantic meaning, recalculated for contrast. Every status pair re-audited against dark surface values before Phase E finalizes.

**Theme 3: Sunlight (on scene, direct sun, high contrast)**

This is not an automatic darkening of the dark theme. Sunlight mode is a separately authored theme triggered by a manual toggle in Settings or by an automatic ambient light sensor API (when available). Its purpose is survivability on a phone screen at maximum brightness in direct afternoon sun.

Sunlight mode thinking: the bottleneck is not background darkness, it is text-to-surface contrast and line weight. A dark background at 500 nits competes with sunlight at 100,000 lux. You cannot win with background color alone.

The sunlight theme strategy:
- Black text on white: maximum contrast at all environmental brightness.
- No mid-gray text permitted. Every text element uses `--text-primary` only.
- Borders jump from 1pt to 2pt. Cards gain a visible shadow (2pt offset, 8% opacity) so edges remain discernible when glare washes the field.
- Type weight bumps one step. Body text at 400 becomes 500. Labels at 500 become 600.
- Status indicators grow from badge to full-width banner inside the card.
- Touch targets grow to 56pt minimum (from 44pt).

Core tokens:
- `--surface-bg`: `#FFFFFF`
- `--surface-card`: `#FFFFFF`
- `--surface-stroke`: `rgba(0,0,0,0.25)` (25% black; guaranteed visible in glare)
- `--text-primary`: `#000000`
- `--accent`: `#8B6500` (darker gold, 7:1 on white)
- Status badges: solid background, white text, minimum 4.5:1 contrast for every status.

Sunlight mode is the third theme, not an option inside dark or light. It gets its own token file.

**Theme 4: Broadcast TV**

The broadcast TV surface is read only. No picker affordances, no interactive elements, no sheet patterns. Just status board legibility at 8 to 12 feet from a wall display.

Design targets for broadcast:
- Text minimum 32pt at the smallest. Navigation labels that are 11pt on phone become 36pt here.
- Color contrast minimum 7:1 (WCAG AAA) for all text. Viewers at a distance cannot control their viewing angle; lower contrast disappears.
- Status colors use the same semantic tokens as dark theme, but each status region gets a 4pt left border accent instead of a background fill. Heavy color fill looks like a wall of noise from 12 feet; a left border accent preserves readability.
- Shore point names and measurements are the largest elements on the page.
- No animation. The TV view is a snapshot, not a live reactive component. Updates refresh on a 15 second polling interval (or on explicit push from the CP). Animated transitions in a broadcast context distract the room.

Core broadcast tokens:
- `--bc-surface-bg`: `#141618` (slightly darker than dark theme for TV gamma correction)
- `--bc-text-primary`: `#F4F4F4`
- `--bc-text-secondary`: `#C0BFBC` (5.8:1 on bc-surface-bg)
- `--bc-border-accent`: 4pt left border on status cards

---

## Spacing and Grid

### Base grid

4pt base unit. Not 8pt. The decision point is that 4pt gives precision for compact touch controls (44pt touch target = 11 units; 48pt row = 12 units) without forcing awkward intermediate values. 8pt grids force 8 or 16pt as the smallest step, which pushes icon padding and badge dimensions into uncomfortable territory on a dense tablet surface.

The 4pt grid is used internally by the design system. The external rhythm (the spacing between major sections, card gutters, page margins) operates on 8pt multiples, because those are the steps that read as intentional to the eye at page scale.

| Token | Value | Use |
|---|---|---|
| `--space-1` | 4pt | Icon internal padding, divider inset |
| `--space-2` | 8pt | Badge internal padding, small gap |
| `--space-3` | 12pt | Card internal top/bottom padding |
| `--space-4` | 16pt | Card internal left/right padding, row height padding |
| `--space-5` | 20pt | Section gap within a screen |
| `--space-6` | 24pt | Between major sections |
| `--space-8` | 32pt | Modal internal padding |
| `--space-12` | 48pt | Screen edge margin on tablet |

### Surface breakpoints

| Surface | Width range | Safe area strategy |
|---|---|---|
| Phone | 320pt to 430pt | Bottom padding = max(16pt, safe area inset). No reliance on bottom safe area for primary action. |
| Tablet | 768pt to 1200pt | Two-column layout at 768pt+. Left rail fixed at 320pt, right pane fills remainder. |
| Laptop | 1200pt+ | Three columns optional. Keyboard shortcuts exposed. |
| Broadcast TV | 1920pt × 1080pt nominal | 72pt outer margin. Grid of status cards, 4 or 6 per row depending on operation scale. |

---

## Motion Doctrine

### Philosophy

Principle 3 says calm in chaos. The motion doctrine enforces it. Every animation in FieldShore has a job. If the animation cannot be described in one sentence of purpose, it does not ship.

The three legitimate animation jobs: showing where something came from, confirming that an action registered, and orienting the user to a new state. Animations that decorate, entertain, or demonstrate that we can do animation are cut.

### Duration and easing

| Category | Duration | Easing | Examples |
|---|---|---|---|
| Micro | 100ms | `ease-out` | Button press state, checkbox fill |
| Transition | 200ms | `cubic-bezier(0.25, 0.1, 0.25, 1)` | Sheet slide up, modal fade in, toast appear |
| Navigation | 300ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Full screen list push, tab switch |
| Status | 250ms | `ease-in-out` | Shore point status badge color change |
| Toast dismiss | 180ms | `ease-in` | Toast slide out and fade |

The sheet slide-up uses `200ms` not `300ms`. This matters because the plate picker (preserved from v3.5.1 per picker doctrine) operates at the bottom of the screen and the user is waiting for it. Every millisecond of sheet animation is a millisecond of waiting with a gloved thumb.

`prefers-reduced-motion`: all animations drop to instant. Zero duration, no easing. Not a cross-fade to nothing — instant state swap. The status badge does not transition, it switches.

### What moves

- Bottom sheets slide up from the bottom edge.
- Toast notifications slide in from the bottom at 16pt above the safe area. They do not overlap the primary action button.
- Shore point card status badges animate a color fill (not a size change, not a rotation). The previous color cross-fades to the new color in 250ms.
- The undo toast appears on status change and slides out when the window closes or the user dismisses.
- Navigation tab switches fade the content pane (100ms opacity) on exit, then the new content appears immediately. No slide on the tab bar itself.
- Modal overlays fade the scrim from 0 to 40% opacity in 200ms. The modal card translates up 8pt simultaneously (origin slightly below center, arrives at center).

### What does not move

- The bottom nav bar. It is always visible and never animates.
- Shore point cards themselves. Reordering a list does not animate card positions in v4.0. Animated reorders are expensive on long lists and unnecessary when the user has just tapped a sort control. Snap.
- Sync indicator. The sync status dot changes state without transition. It is information, not decoration.
- Load capacity numbers. They display immediately. Never a count-up animation.

---

## Iconography

### The brief

A small, custom SVG set. Not SF Symbols (Apple only, and the style is not ours). Not Material Symbols (too round, too generic). Not Heroicons (close, but associated with Tailwind projects and widely recognized as stock). Not Lucide (too thin at small sizes).

The set needs roughly 40 to 50 glyphs: navigation icons (5), status icons (8), action icons (12), shore type diagrams (9, representing each USACE configuration), apparatus type icons (6), ICS role icons (8), utility icons (8). Shore type and ICS diagrams are the most important investment; no other fire service app has them drawn at this quality.

### Stroke specification

- **Stroke width:** 1.5pt at 24px grid. This is the key parameter. 1pt reads as too light at 24px, especially in sunlight mode. 2pt reads as heavy at small sizes (16px). 1.5pt splits the difference and matches the visual weight of Geist text at body/medium weight.
- **Grid:** 24px artboard, 2px inner padding (20px live area).
- **Corners:** 2px corner radius on all stroke joins and caps. Not fully rounded, not sharp. Matches the card corner radius language divided by 6.
- **Filled vs. outlined:** Filled variants for active/selected state. Outlined for default. The transition between the two states is the micro animation (100ms ease-out fill).
- **Label requirement:** Per Principle 9, no icon-only primary actions. Every primary action icon has a visible text label alongside it. Secondary icons in sidebars and collapsed states expose the label on tap.

### Shore type diagrams

The nine USACE shore configurations (Single Upright, T-Shore, Double-T, and the rest) get custom isometric-style diagrams at 48px grid for use in pickers and empty states, and 24px simplified line icons for card badges. These are the only icons in the set that carry safety-critical information content. Phase E commissions them from a technical illustrator or authors them directly in Figma with the USACE doctrine drawings as reference. They are not decorated for aesthetics; they are accurate representations of the shore geometry.

---

## Component Primitives

### Card

Shore point cards, apparatus cards, operation cards, and most list items use a single card primitive with three elevation levels.

**Base card:**
- Corner radius: `12pt`
- Border: `1pt` hairline at `--surface-stroke`
- Internal padding: `12pt` top/bottom, `16pt` left/right (`--space-3` / `--space-4`)
- Background: `--surface-card`
- Elevation: `0` at rest (no shadow). Shadow is used for sheets and modals only. Cards that float over a surface use a `1pt` inner shadow at `6% opacity` on the top edge to simulate a lifted lip. Never a drop shadow on cards.
- Touch target: the card's full width is tappable. Minimum height: `60pt` for shore point cards (content driven), never below `44pt`.

**Active/focus card:**
- Border color: `--accent` at `60%` opacity
- Background: `--surface-card-hover`
- No size change. No scale animation. Scale animations on cards during operations are nauseating when the user is watching the list.

**Status bar variant:**
- A `4pt` left border in the status color (same value as `--status-*` token) replaces the standard hairline on the left edge only.
- Used for shore point cards in the operations view where status is the primary information.

### Badge

Status indicators, role pills, measurement unit labels.

- Height: `22pt`
- Horizontal padding: `8pt` left/right
- Corner radius: `6pt` (half of card radius, maintains hierarchy)
- Font: `--type-label` (11pt, 500 weight)
- Background + text: status token pair
- Color is never the only differentiator: every status badge has a status label text inside it. A "Cutting" badge says "Cutting." A color-blind user reads the word.

In sunlight theme, badge height grows to `28pt` and font bumps to `--type-body-medium` (14pt, 500). The label still fits.

### Button

Four variants. The number is deliberate: primary, secondary, ghost, and destructive. No "warning" variant (warning is a status, not a button type).

**Primary button:**
- Height: `48pt` (accommodates a gloved thumb on the 44pt floor with margin)
- Corner radius: `12pt`
- Background: `--accent`
- Text: `--text-primary` on accent background, recalculated per theme
- Font: `--type-body-medium`
- Minimum width: `120pt`
- Disabled state: `40%` opacity on the entire button. No color change, no separate disabled token. A disabled button at 40% opacity clearly communicates unavailability without introducing a new visual language.

**Secondary button:**
- Same geometry as primary
- Background: `--surface-card`
- Border: `1pt` at `--surface-stroke`
- Text: `--text-primary`

**Ghost button:**
- No background, no border
- Text: `--accent`
- Used for low-priority actions inline with content (e.g., "View all" at the bottom of a truncated list)

**Destructive button:**
- Background: `--status-warning` background token (the red)
- Text: `--status-warning` text token
- Same geometry as primary
- Never appears as the only action on a screen. Always paired with a cancel action.

### Sheet (bottom sheet)

Per picker doctrine, the bottom sheet is used for 5 to 7 option pickers and for the plate connector visual grid. The sheet primitive also serves for confirmation panels, undo recovery, and quick-action drawers.

- Max height: `60vh` on phone, `480pt` on tablet (where it becomes a centered popover)
- Corner radius: `16pt` on top two corners only. Bottom corners are flush to the screen edge.
- Drag handle: `40pt × 4pt`, `--text-tertiary` color, centered at `12pt` from the top edge.
- Background: `--surface-card-elevated` (one step up from the card surface)
- Shadow: `0 -4pt 24pt rgba(0,0,0,0.18)` on dark theme, `0 -2pt 16pt rgba(0,0,0,0.08)` on light theme.
- Scrim: `rgba(0,0,0,0.40)` behind the sheet, tapping the scrim dismisses.
- Open animation: sheet translates from `translateY(100%)` to `translateY(0)` in `200ms` with `cubic-bezier(0.25, 0.1, 0.25, 1)`. Scrim fades `0` to `40%` simultaneously.
- `touch-action: pan-y` on the sheet content div. `transform: translateZ(0)` on the sheet container. Both are carried from the v3.5.1 iOS fix — they are not cosmetic; they prevent WKWebView scroll event swallowing on iOS 15 and 16.
- Visibility toggle, not display toggle, for the same reason as v3.5.1.

### Toast (undo toast, confirmation toast)

The undo toast is the implementation of Principle 6. Every status transition surfaces one.

- Position: `16pt` above the bottom safe area (or above the bottom nav bar when it overlaps)
- Width: full width minus `32pt` margin (16pt each side)
- Height: `52pt`
- Corner radius: `12pt`
- Background: `#1C1F23` in both light and dark themes (same slate). The toast is always dark. It reads as a system message, not a product UI element.
- Text: `--text-primary` (white/near-white on the dark toast background)
- Undo button: right-aligned, `--accent` color, `--type-body-medium`
- Dismiss timer: a 5-second progress line on the bottom edge of the toast. 2pt height, starts at full width and reduces to zero from right to left. Uses `--accent` color. This is the only place the undo window is communicated; no countdown text.
- Animation in: slides up from 0 to position in `200ms ease-out`. Animation out: fades out and slides down in `180ms ease-in`.
- Maximum one toast visible at once. If a second action fires during the undo window, the first toast dismisses immediately (no undo for the first action) and the new toast appears.

### Empty state

Two types: no data yet, and no results from search/filter.

Both follow the same structure:
- Centered in the available vertical space
- An icon from the custom set at `48pt` (outlined variant, `--text-tertiary` color)
- A headline at `--type-headline-2`, `--text-primary`
- A single sentence of guidance at `--type-body`, `--text-secondary`
- One primary button action when an action exists. No action button when the state is terminal (e.g., "No operations archived yet").

Empty state copy for shore points: "No shore points yet. Tap the button below to add the first one." Not "Get started by adding a shore point." Not "It looks like there's nothing here." One sentence. What to do next.

### Loading state

FieldShore is local first. The loading state should be rare and brief. When it appears:

- Use a skeleton pattern (content-shaped gray boxes at `--surface-card-hover`) rather than a spinner. The skeleton tells the user what is coming; a spinner tells them nothing.
- Skeleton animation: a shimmer that moves left to right in `1.5s` linear repeat. The shimmer is a gradient from transparent to `rgba(255,255,255,0.06)` and back.
- Maximum loading state duration before an error state appears: `8 seconds`. After 8 seconds with no data, show an error state with a retry action. Never infinite spinner.

### Input (text field)

- Height: `48pt`
- Corner radius: `8pt`
- Border: `1pt` at `--surface-stroke`
- Focus border: `2pt` at `--accent`
- Font: `--type-body`
- Internal padding: `12pt` left/right
- Label: always above the field, never placeholder-only. Placeholder text is supplemental hint text only.
- Error state: red border (`--status-warning` background token converted to border) plus an error message below the field at `--type-caption`. The border is `2pt` in error state. The field does not shake or animate.
- Measurement input specifically: displays value in `--type-mono` at `--type-body-lg` size. The unit (inches or feet/inches) is a non-editable suffix shown in `--text-secondary` to the right of the cursor.

### Toggle

- Track: `44pt × 24pt`, `12pt` corner radius.
- Thumb: `20pt` circle, `2pt` inset from track edge.
- On state: `--accent` track, white thumb.
- Off state: `--surface-stroke` at 50% opacity track, `--text-tertiary` thumb.
- Transition: thumb slides in `150ms ease-out`. Track color transitions in `150ms ease-out`. Both fire simultaneously.
- Touch target: `44pt × 44pt` minimum, even though the visible toggle is smaller.

### Nested checklist

The checklist system (from v3.20.0 Bucket 1) needs a primitive spec. Three levels: category, item, sub-item.

- Category row: `48pt` height, `--type-headline-2` label, disclosure chevron (rotates 90° on expand in `150ms`)
- Item row: `44pt` height, `--type-body` label, checkbox on the left
- Sub-item row: `40pt` height, indented `24pt` from item left edge, `--type-caption` label
- Checkbox: `22pt × 22pt`, `6pt` corner radius. Checked state fills with `--accent` and shows a white checkmark. The checkmark draws in (path animation, `100ms ease-out`) from left to right.
- Completed items: `--text-tertiary` color, `text-decoration: line-through`. Line-through renders in `--text-tertiary` at 50% opacity.

---

## The "P" Mark

The current mark is a sans-serif "P" in a rounded square. The geometry is fine. The execution is not.

The recommendation is a geometry refresh, not a rebrand. Specifically:

- Same concept: letterform in a container. The "P" is correct. FieldShore is named for its function; the mark should reinforce the mnemonic.
- The container becomes a `12pt` corner radius square (matching card corner radius). Currently the corner radius varies by context and looks inconsistent.
- The "P" letterform is redrawn using Geist's "P" as the typographic basis, then adjusted for mark use: the counter (inner curve of the P) is enlarged slightly, the spine thickens by 10%, and the leg (descending stroke) is shortened to produce a more compact letterform that holds at 16px.
- Two variants: dark background (gold P on slate), light background (slate P on white). The mark never appears in any other color combination. Color-matched variants that use brand colors in "creative" ways are forbidden.
- App icon: dark background variant on a `12pt` corner radius square as the home screen icon. The corner radius is applied by the OS on iOS; the artboard is full bleed.

The mark does not get a tagline lockup in v4. The marketing site uses the wordmark (mark + "FieldShore" set in Geist 600) as the primary identity. The mark alone appears at small sizes (favicon, app icon, notification badge).

---

## Marketing Site Visual Language

The marketing site is not a different product. It shares every token with the app. The decision that matters: the site must not visually lie about what the product looks like.

Every competitor in the teardown corpus has a marketing site that looks better than the product. RapidSOS marketing is slick; the product screenshots are a different world. Tablet Command's site has clean marketing photography of iPads; the product shown in those iPads uses system fonts and generic colors. This is a trust problem. When a fire chief sees the marketing site and then opens the app, the mismatch is the first credibility hit.

FieldShore marketing and app share:
- Same type ramp
- Same color tokens (light theme)
- Same card primitive
- Same spacing grid

The site uses light theme by default. It is not a dark mode showcase site, because the light theme is what a chief buying the product will see when evaluating it on his office computer. Dark mode marketing screenshots are supplemental.

Marketing-specific additions that the app does not have: a larger display type size (`--type-display-2` at 32pt; the app tops out at `--type-headline-1` at 24pt), a hero section with a product screenshot at genuine size (not a compressed thumbnail), and a single-sentence positioning statement above the fold.

---

## Micro-interactions

### Status transition

When a shore point moves from one status to the next, the card badge animates a cross-fade between status colors in `250ms ease-in-out`. The card itself does not scale or shake. The new badge text fades in as the old fades out. On the first appearance of the card in a new status, no animation (avoids loading-state visual noise when the list first renders).

### List reorder

In v4.0, list reorder is a snap (no animation). If v4.5 adds drag-to-reorder, the reorder animation spec goes here: dragged card lifts to `--surface-card-elevated` with the card shadow active, other cards shift up/down with a `150ms ease-out` translation. The dragged card drops with a `100ms ease-in` translation.

### Undo window

The 5-second progress line on the toast bottom edge is the micro-interaction that communicates urgency without anxiety. It moves at a constant rate. It does not accelerate or pulse near the end. Pulsing near zero creates urgency that competes with the incident for attention.

### Sync indicator

The sync status dot is a `8pt` circle in the header. It is `--status-active` (blue) when synced, `--status-pending` (gray) when offline, `--status-warning` (amber) when queued writes are pending. No animation. No pulsing. It is information, not an alert.

---

## Recommendations

1. Adopt **Geist** (OFL) as the primary typeface for v4.0. Use **Geist Mono** for all measurement and load capacity values. Flag **Söhne** for Phase E licensing consideration if budget opens.

2. Set the type ramp anchor at **14pt body, minor third scale (1.2×)**. Tokens: `--type-display-1` through `--type-label` as specified in the ramp table above.

3. Use a **4pt base spacing unit** with an 8pt-multiple external rhythm. Token set: `--space-1` (4pt) through `--space-12` (48pt).

4. Set `--surface-bg` in dark theme to **`#1C1F23`** (muted slate, not navy, not OLED black). This is the single biggest visual differentiator from the fire service competitive set.

5. Set `--accent` in dark theme to **`#D4A017`** (warm gold at 4.5:1 contrast on `#1C1F23`). Set `--accent` in light theme to **`#B8860B`** (dark goldenrod at 4.6:1 on `#F7F6F3`). Document the contrast ratio in the token file, not just the hex.

6. Author **sunlight theme as a standalone token file** (`theme-sunlight.css`), not as overrides on dark or light. Minimum text contrast 7:1. Borders at 2pt. Touch targets 56pt minimum. Type weight bumped one step.

7. Author **broadcast TV theme as a standalone token file** (`theme-broadcast.css`). Minimum text size 32pt. All text contrast 7:1. Cards use 4pt left border status accent instead of background fill. No animation. No interactive elements.

8. Set card corner radius to **`12pt`** globally. Sheet corner radius to **`16pt`** on top corners only. Badge corner radius to **`6pt`**. Button corner radius to **`12pt`**. Input corner radius to **`8pt`**. These five values are the complete corner radius vocabulary; no other values ship.

9. Set card elevation to **1pt inner shadow at 6% opacity on the top edge only, no drop shadow**. Sheets use `0 -4pt 24pt rgba(0,0,0,0.18)` on dark theme. No other elevation treatment ships in v4.0.

10. Set sheet open animation to **`200ms cubic-bezier(0.25, 0.1, 0.25, 1)`**, translating from `translateY(100%)` to `translateY(0)`. Carry `touch-action: pan-y` and `transform: translateZ(0)` from v3.5.1 verbatim.

11. Set undo toast duration to **`200ms ease-out`** in, **`180ms ease-in`** out. Progress line runs at constant speed for exactly **5 seconds**. No pulsing. One toast maximum visible at once.

12. Status badge text must always include the status label as text, never color only. Specifically: "Cutting", "Runner", "Secured", "Pending", "Active" spelled out. Color change alone does not communicate status to a color-blind user or in a sunlight-washed screen.

13. Commission or author **custom SVG icons** at 24px grid, 1.5pt stroke, 2px corner joins. The nine USACE shore type diagrams are the first priority in the set. Shore type diagrams get a 48px detail variant and a 24px badge variant.

14. **Refresh the "P" mark** (not rebrand). Redraw the letterform at the geometric basis of Geist's "P" with 10% thicker spine and a shortened leg. Container corner radius: `12pt`. Two color variants only: gold on slate, slate on white.

15. **Marketing site shares all design tokens with the app** (light theme). No marketing-exclusive color, type size above `--type-display-2`, or component that does not exist in the app's design system.

16. Set primary button height to **`48pt`**, minimum width **`120pt`**, corner radius **`12pt`**, font `--type-body-medium`. Disabled state at **`40% opacity`** on the full button. No separate disabled color token.

17. Set the sync indicator to a **`8pt` circle** with three states mapped to three existing status tokens (synced = blue, offline = gray, queued = amber). No animation on the indicator. State change is instant.

18. Use skeleton loading (content-shaped gray boxes with a left-to-right shimmer at `1.5s linear`) rather than spinners anywhere FieldShore shows a loading state. After `8 seconds` with no data, replace the skeleton with an error state plus a retry action.

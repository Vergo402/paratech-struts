# Design System: Spacing & Grid

> Phase E, design-system token file 3 of 8. Authored at the depth of [`03-primitives/picker.md`](../03-primitives/picker.md).
> Source: essay [`05-essays/02-visual-language.md`](../05-essays/02-visual-language.md) "Spacing and Grid" + [`06-decision-tracking-matrix.md`](../06-decision-tracking-matrix.md) **B-3** (4pt base / 8pt rhythm), **B-8** (corner radius vocabulary), with touch-target sizing **reconciled** from field-conditions **G-1 / G-7 / G-17** and visual-language **B-6 / B-9 / B-16** — not transcribed. Every `--space-*` and `--radius-*` value here matches [`preview/tokens.css`](../preview/tokens.css) verbatim; the living styleguide is the rendered proof.

---

## Purpose

Spacing is the quietest authority signal in the system. A Garmin avionics MFD reads as a serious instrument partly because nothing is a pixel off the grid — density is disciplined, rhythm is regular, and the eye trusts the layout before it reads a word. FieldShore earns the same trust the same way: **one grid, applied everywhere, with no arbitrary values.** v3 had "no intentional spacing grid" (essay 02); v4's first job is to fix that.

Two rules govern every measurement in the system, and they layer:

1. **4pt internal grid** — every internal dimension (padding, gaps inside a component, icon insets) is a multiple of 4pt.
2. **8pt external rhythm** — the spacing *between* components and sections (card gutters, section gaps, page margins) lands on 8pt multiples, because those are the steps that read as intentional at page scale.

Touch-target sizing is treated here as a grid concern, not an afterthought (Principle 2 — designed for the role; Principle 3 — calm in chaos): a gloved thumb on a wet screen in the sun needs the grid to guarantee the target, not hope for it.

---

## The base grid — 4pt, not 8pt

**4pt base unit. Not 8pt.** The decision (B-3) is deliberate: 4pt gives precision for compact touch controls without forcing awkward intermediate values. A 44pt touch target is exactly 11 units; a 48pt row is 12 units. An 8pt grid forces 8 or 16pt as the smallest step, which pushes icon padding and badge dimensions into uncomfortable territory on a dense tablet surface — you either over-pad or break the grid.

So the grid is two-layer, and both layers are honored at once:

- **Internal (4pt):** used by the design system itself — icon insets, badge padding, the gap between a label and its value inside a card. Precision lives here.
- **External (8pt):** the rhythm between cards, between sections, the page margin. At page scale the eye reads 8pt steps as composed and 4pt steps as accidental, so the external rhythm rounds up to 8pt multiples.

Every spacing token below is a 4pt multiple; the ones used for external rhythm are also 8pt multiples. There is no token that is not a multiple of 4pt — that is the whole point.

---

## Spacing tokens

The 8-token scale from essay 02, matching [`preview/tokens.css`](../preview/tokens.css). Values in pt = CSS px at 1:1.

| Token | Value | Use |
|---|---|---|
| `--space-1` | 4pt | Icon internal padding, divider inset |
| `--space-2` | 8pt | Badge internal padding, small gap |
| `--space-3` | 12pt | Card internal top/bottom padding |
| `--space-4` | 16pt | Card internal left/right padding, row-height padding |
| `--space-5` | 20pt | Section gap within a screen |
| `--space-6` | 24pt | Between major sections |
| `--space-8` | 32pt | Modal internal padding |
| `--space-12` | 48pt | Screen edge margin on tablet |

**The gaps are intentional.** There is no `--space-7`, `--space-9`, `--space-10`, or `--space-11`. The number after the dash is the value in 4pt units (`--space-6` = 6 × 4 = 24pt), so the names stay arithmetic; only the multiples the system actually uses are tokenized. Reaching for 28pt or 40pt means reaching for a value the design doesn't have — that is the signal to use the nearest token, not to mint a new one (see Anti-patterns). The scale is open to extension only by an ADR, never ad hoc.

---

## Corner radius vocabulary

Five values, and that is the **complete vocabulary** (B-8). A sixth radius is a design bug. Matches [`preview/tokens.css`](../preview/tokens.css).

| Token | Value | Applies to |
|---|---|---|
| `--radius-card` | 12pt | Cards, app-icon container, any panel |
| `--radius-sheet` | 16pt | Bottom-sheet top two corners only (bottom flush to screen) |
| `--radius-badge` | 6pt | Status badges, chips (half the card radius — maintains hierarchy) |
| `--radius-button` | 12pt | Primary/secondary buttons (matches card) |
| `--radius-input` | 8pt | Text inputs, measurement fields |

The radii form a small deliberate hierarchy: the sheet (a large surface) is softest at 16pt; cards and buttons share 12pt so a button reads as part of the card language; inputs sit at 8pt; the badge is tightest at 6pt so a chip inside a card never competes with the card's own corner.

**Derived, not new:** the icon-set corner radius of **2pt** (essay 02 "Iconography") is `--radius-card ÷ 6` — a derived value that keeps stroke-icon joins consistent with the card language at 24px artboard. It is a property of the icon grid, documented in [`iconography.md`](iconography.md), not a sixth member of this vocabulary.

---

## Touch targets & target spacing

The grid exists to *guarantee* the tap. These rules reconcile the sizing decisions scattered across the matrix (B-16, G-1, G-7, G-17, B-6) into one table. The driving context is the distinction between **operational** surfaces (a team running a shore under stress, gloved, wet, in glare) and **non-operational** ones (Settings, configuration).

| Size | Where it applies | Source |
|---|---|---|
| **44pt** | Absolute floor. **Tertiary / disclosure contexts only** — collapsed-row chevrons, secondary toggles not touched mid-operation. Never a primary action. | B-16 / G-17 |
| **48pt** | Baseline primary button on **non-operational** surfaces (Settings, department setup). 120pt minimum width. | B-16 |
| **56pt** | **Every primary action, list row, and picker row during an active operation — in all themes.** This is the operational floor; 44pt does not apply once an operation is running. | G-1 / G-17 |
| **60pt** | Sunlight-theme status-transition targets (the slide-to-advance control). The one place that goes above the 56pt operational floor. | B-6 |

Spacing *between* targets matters as much as their size:

- **8pt minimum dead zone** between adjacent tap targets — a ghost-tap buffer for wet screens and gloved thumbs (G-7).
- **64pt center-to-center** minimum for adjacent primary targets (G-7).
- A 4pt CSS touch extension may pad the hit area beyond the visible target in operations (G-1) — the *visible* control stays on grid; the *hit area* is generous.

> Full accessibility behavior (focus order, hit-area semantics, screen-reader scripting) is consolidated in [`accessibility.md`](accessibility.md), authored last; it references back to this table as the sizing source of record.

---

## Surface breakpoints

The grid is shared; the *layout* adapts by surface — designed for the role, not the device (Principle 2), the same way [`color.md`](color.md) and [`typography.md`](typography.md) adapt theme and type ramp per surface rather than forking components.

| Surface | Width range | Layout & safe-area strategy |
|---|---|---|
| **Phone** (team officer) | 320–430pt | Single column. Bottom padding = `max(16pt, safe-area inset)`. **Never rely on the bottom safe area for a primary action** — the primary action sits above it. |
| **Tablet** (command post) | 768–1200pt | Two-column at 768pt+. Left rail fixed at **320pt**, right pane fills the remainder. Higher information density. |
| **Laptop** (Toughbook) | 1200pt+ | Two-column, optional third column. Keyboard shortcuts exposed; keyboard-first dense views. |
| **Broadcast TV** | 1920×1080pt nominal | **72pt outer margin.** Grid of status cards, 4 or 6 per row depending on operation scale. Display-only — no interactive targets, so the touch-target table does not apply here. |

The page margin scales with the surface: 16pt on phone, up to `--space-12` (48pt) on tablet, 72pt on broadcast. Internal card padding (`--space-3` / `--space-4`) does **not** change across surfaces — only the rhythm between cards and the page margin grow.

---

## Elevation (z-axis spacing)

Depth is part of the spacing system but is kept deliberately flat (B-9) — shadows do not carry hierarchy, surface color does (see [`color.md`](color.md) surface tokens).

- **Cards:** a **1pt inner shadow at 6% opacity on the top edge** only. No drop shadow. The card reads as a distinct plane without floating.
- **Bottom sheets:** `0 -4pt 24pt rgba(0,0,0,0.18)` on dark theme; `0 -2pt 16pt rgba(0,0,0,0.08)` on light. The sheet is the one element allowed a real cast shadow, because it genuinely overlays content.

The rendered application of card elevation lives in [`03-primitives/card.md`](../03-primitives/card.md); this section owns only the rule.

---

## Anti-patterns (do not do these)

- **An off-token spacing value.** 10pt, 14pt, 18pt, 28pt — any value not in the scale. Use the nearest token; if none fits, that is an ADR, not an inline decision.
- **Mixing 4pt and 8pt rhythms at the same scale.** Internal dimensions are 4pt-grid; between-component rhythm is 8pt-grid. Don't put a 12pt gutter between cards or a 20pt gap between page sections at random — pick the layer and stay on it.
- **A sixth corner radius.** The five-value vocabulary is complete. A new radius for one component breaks the language.
- **A primary action below 56pt in an active operation.** 44pt is for tertiary disclosure only. The operational floor is 56pt, all themes.
- **Adjacent tap targets with no dead zone.** Wet-screen ghost-taps come from targets that touch. 8pt minimum between, 64pt center-to-center.
- **A primary action that lives in the bottom safe area.** On phone the primary action sits above the inset; the inset is padding, not a button home.

---

## Open questions for the gate

None blocking. B-3 (spacing) and B-8 (radius) are accepted, the tokens are already authored in [`preview/tokens.css`](../preview/tokens.css), and the touch-target reconciliation draws only on already-accepted field-conditions decisions (G-1 / G-7 / G-17). If a Phase F page or Phase G workflow surfaces a genuine need for a new spacing or radius value, that opens an ADR — it is not resolved inline.

# Design System: Iconography

> Phase E, design-system token file 5 of 8. Authored at the depth of [`03-primitives/picker.md`](../03-primitives/picker.md).
> Source: essay [`05-essays/02-visual-language.md`](../05-essays/02-visual-language.md) "Iconography" + [`07-design-system/spacing-grid.md`](spacing-grid.md) (`--icon-radius` derived from `--radius-card ÷ 6`; icon internal padding via `--space-1`) + [`07-design-system/motion.md`](motion.md) (`--motion-micro` / `--ease-micro` for fill transition) — reconciled, not transcribed. Every `--icon-*` token here matches [`preview/tokens.css`](../preview/tokens.css) verbatim; the living styleguide is the rendered proof.

---

## Purpose

A custom icon set is not an aesthetic choice — it is a safety and legibility requirement. The brief from essay 02 is direct: SF Symbols is Apple-only and its style is not FieldShore's; Material Symbols reads as generic consumer software; Heroicons carries strong Tailwind/web-product associations; Lucide reads too thin at the small sizes FieldShore needs. Every library that imports a foreign visual grammar into the system makes the product look like it was assembled from parts, which is exactly the opposite of the authority signal a safety instrument needs to project.

The deeper argument is the shore type diagrams. No off-the-shelf icon library has doctrinally accurate representations of USACE/FEMA vertical shoring configurations — because no off-the-shelf library was built for structural collapse rescue. Those diagrams are the single highest-value investment in the icon set. An operator glancing at a shore point card badge needs to recognize "Double-T" from "T-Shore" at 24px on a wet screen. That is a precision drawing problem, not a style problem.

Forty to fifty glyphs drawn to one stroke spec at one grid size read as a system, not a collection. Every icon participates in the same geometry: same artboard, same stroke weight, same cap and join treatment, same fill-to-outlined transition. The system is consistent because its rules are simple and strictly applied.

---

## The icon grid

Two numbers govern every icon in the set: **artboard size** (the bounding square the icon is drawn on) and **live area** (the region strokes and fills stay within, leaving padding at the edges). All icons use the same 1:1 inner padding ratio within their artboard class.

### Artboard sizes

| Token | Artboard | Inner padding | Live area | Primary use |
|---|---|---|---|---|
| `--icon-size-sm` | 16px | 1px | 14 × 14px | Inline badges, status indicator dots, version chips |
| `--icon-size-md` | 24px | 2px | 20 × 20px | Standard: navigation, action, status, ICS role, apparatus type |
| `--icon-size-lg` | 32px | 2px | 28 × 28px | Section headers, compact empty states |
| `--icon-size-xl` | 48px | 4px | 40 × 40px | Shore type detail variants, full empty states, pickers |

Four sizes. No 20px, no 40px, no 64px — a size not in this table is a design bug.

### Stroke and joins

| Token | Value | Derivation / note |
|---|---|---|
| `--icon-stroke-default` | 1.5px | The key parameter. Authored at the 24px grid: heavier than 1px (washes out at 24px, invisible in sunlight mode) and lighter than 2px (reads as heavy at 16px). Matches the visual weight of Geist at `--type-body-medium` (500) when the two appear together. |
| `--icon-stroke-heavy` | 2px | Sunlight-mode override — thickens automatically via `--stroke-width: 2px` in the sunlight theme (see [`color.md`](color.md)). No per-icon rule needed: the theme switch handles it globally. |
| `--icon-radius` | 2px | Derived: `--radius-card ÷ 6 = 12 ÷ 6 = 2`. Applied to all stroke joins and caps (linecap and linejoin in SVG). Keeps the icon language consistent with card geometry at 24px scale. **This is not a sixth member of the corner-radius vocabulary** — it is a derived constraint of the icon grid, owned here, not in [`spacing-grid.md`](spacing-grid.md). |

**Stroke scales with artboard.** `--icon-stroke-default` (1.5px) is authored at the 24px grid. The 16px artboard scales to 1px; the 32px and 48px artboards scale to 2px. Visual weight stays constant across sizes because the ratio of stroke to live area is preserved.

---

## Outlined vs filled states

Every functional icon (navigation, action, status, apparatus, role, utility) ships in two variants:

- **Outlined (default / rest):** strokes only, no body fill. The icon is defined by its lines.
- **Filled (active / selected):** the icon body fills with the current color context. Layered detail elements (an arrow on a button icon, a line on a measurement icon) keep their strokes; only the primary silhouette fills.

**The transition between states** is `--motion-micro` (100ms) + `--ease-micro` (`ease-out`) — the same micro animation as a checkbox fill (see [`motion.md`](motion.md) "What moves"). The fill cross-fades from none to full in 100ms. This is the **only** animation an icon participates in. Icons do not scale, rotate, or translate as part of their state logic.

**On first render,** no animation — the icon appears in its correct state without a fill-in. A fill that plays on list load reads as load-state visual noise.

**Shore type diagrams** are an exception: they are stroke-only and carry no filled variant. The diagram communicates geometry, not state.

---

## The glyph set

Approximately 46 glyphs across six categories. Phase F (IA) will surface screen-by-screen needs that may add or consolidate icons. The Phase E spec owns the *system rules* — this inventory is the target set, not a locked SVG manifest.

### Navigation (5)

The five bottom-tab destinations plus close/back. Navigation icons always appear with a text label below them (Principle 9 — see Label requirement).

| Name | Use |
|---|---|
| Quick Find | Measurement + load tab |
| Operations | Shoring operations tab |
| Inventory | Apparatus inventory tab |
| Settings | Department settings tab |
| Close / Back | Modal close, navigation back |

### Status (8)

One icon per shore point status. Status icons are always paired with badge text — the status name spelled out — never used as color-only signals (Principle 9).

| Name | Maps to status |
|---|---|
| Pending | `pending` |
| Active / Process | `process` |
| Strut Placed | `strutset` |
| Cutting | `cutting` |
| Runner | `runner` |
| Secured | `secured` |
| Returned | `returned` |
| Warning | Off-queue / unrated-zone warning |

### Action (12)

Operations the user initiates. Action icons always appear with a label in primary contexts.

Add, Edit, Delete / Archive, Sync (queued), Offline, Camera, Import, Export, Assign, Complete, Copy, Filter.

### Shore type diagrams (~9)

See Section below. Two artboard variants each (`--icon-size-md` badge, `--icon-size-xl` detail). Stroke-only. Doctrinally accurate.

### Apparatus type (6)

Matches `APPARATUS_TYPES_DEFAULT` in [`app.js`](../../../app.js:~line 85):

Chief, Engine, Ladder, Rescue, Squad, Task Force.

### ICS role (6)

Maps to the ICS/NIMS roles per ADR-008. Runner and Wood share Action glyphs (no dedicated role icon needed at this phase).

IC, Safety, Operations Section Chief, Shoring Supervisor, Rescue Supervisor, Cutting Station.

### Utility (8)

Chevron Right, Chevron Left, Chevron Up, Chevron Down, Drag Handle, Sort, Alert / Info, Checkmark.

---

## Shore type diagrams

Shore type diagrams are the most important investment in the icon set. They are safety-critical reference icons — the only glyphs that carry structural information content. An operator selects a shore configuration from a picker or reads a shore point badge; at 24px the diagram must be unambiguous.

### Two variants per shore type

Every shore type ships two artboard variants:

| Variant | Size | Use | Detail level |
|---|---|---|---|
| Detail | `--icon-size-xl` (48px), 40×40px live area | Shore type picker, empty states, documentation | Full structural geometry — header, footer, strut positions, spacial relationships |
| Badge | `--icon-size-md` (24px), 20×20px live area | Shore point card badge, list rows | Structural essence only — simplified to be distinctly recognizable at 24px |

The badge variant is **not** a scaled-down detail variant. It is a purpose-drawn simplification. The 20×20px live area cannot hold construction detail; it must hold the one or two geometric features that distinguish this shore type from every other.

### Drawing standard

- **Reference:** USACE/FEMA Type III shoring doctrine drawings. The geometry is the content — the diagram is accurate, not stylized.
- **Stroke only.** No fill on structural elements. The diagram communicates geometry, not mass.
- **No outlined / filled state variants.** Shore type icons are neutral, not interactive state indicators.
- **Stroke weight:** `--icon-stroke-default` (1.5px at 24px; 2px at 48px) — same as the rest of the set.
- **Corner radius on joins:** `--icon-radius` (2px) — horizontal strut caps and wood member ends use the same `round` linecap as all other icons in the set.

### v3 → v4 scope

v3 implements three types: Vertical T-Shore, Double-T Vertical Shore, 3-Post Vertical Shore. v4 extends toward the full USACE/FEMA Type III doctrine set — essay 02 targets approximately nine configurations. The exact v4 inventory is a Phase F (IA) decision; iconography.md specifies the treatment rules and reserves the vocabulary. Phase F locks the list.

> **Production note:** the structural-collapse-sme agent (see `CLAUDE.md`) has access to the Paratech O&M Manual and USACE shoring doctrine for doctrine-accuracy review of the diagram geometry before Phase H draws them.

---

## Color application

Icons carry no color tokens of their own. They inherit from the color system. A new `--icon-color-*` token would fork the color system for no gain — the existing semantic tokens already cover every context an icon appears in.

| Context | Token | Rationale |
|---|---|---|
| Default / supporting | `--text-secondary` | Adequate contrast; reads as content support, not competing with primary text |
| Active / selected (nav, filled) | `--accent` | Gold fill on an active nav icon = same language as an active button or focused control |
| Status icons | `--status-{name}-text` | Maps directly to `color.md` status token pairs. Color + label text, never color alone (Principle 9). |
| Destructive action | `--danger-text` | Same token as the destructive button (see essay 02 "Button — Destructive") |
| On cards | Inherits context | Icons inside a card follow the card's text color context; no per-icon override |
| Sunlight | `--text-primary` | No mid-gray in sunlight mode. All icon color bumps to primary automatically via the sunlight theme's `--text-secondary: #000000` override (see [`color.md`](color.md)). |
| Broadcast TV | `--text-secondary` (broadcast value) | Broadcast's `--text-secondary` is `#C0BFBC` at 9.86:1 — passes AAA. Status icons use their broadcast `--status-{name}-text` token. |

**Disabled state:** 40% opacity on the icon element — same rule as the disabled button, no separate disabled color token.

---

## Per-surface adaptation

The icon system is authored for the phone and adapts by surface. The artboard never changes between surfaces; only stroke weight and minimum size adapt.

| Surface | Size | Stroke | Notes |
|---|---|---|---|
| **Phone** (team officer) | `--icon-size-md` standard | `--icon-stroke-default` | Nav icons always have a text label below. Tap targets are the parent row / button, not the icon alone. |
| **Tablet CP** | `--icon-size-md` standard | `--icon-stroke-default` | Denser column layouts; icon size unchanged, surrounding spacing adapts. |
| **Sunlight** | `--icon-size-md` standard | `--icon-stroke-heavy` (2px) | Stroke thickens automatically via `--stroke-width` sunlight theme override. No artboard change; the live area stays at 20×20px. |
| **Broadcast TV** | `--icon-size-lg` minimum | `--icon-stroke-heavy` | Display-only surface. Status icons in card headers may use `--icon-size-xl`. Touch-target rules do not apply (no interaction on broadcast). |

---

## Label requirement (Principle 9)

> *No icon-only primary actions.*

Every primary action icon has a visible text label alongside it. The icon carries the visual identity; the label removes ambiguity. Secondary icons in sidebars and collapsed states expose their label on tap or focus.

**Navigation bar:** icons always have a label below them — consistent with the v3 bottom tab bar and standard iOS/Android navigation conventions. "Mystery meat navigation" (unlabeled icon bars) is the anti-pattern that Principle 9 exists to prevent.

**Status icons:** always paired with badge text. A "Cutting" badge says "Cutting." A color-blind user, a user in sunlight-washed glare, or a user who simply hasn't memorized the icon vocabulary reads the word. The icon is supplemental, not load-bearing.

**Shore type picker:** every shore type entry shows the `--icon-size-xl` detail diagram **and** the shore type name. The diagram identifies; the name confirms.

---

## Anti-patterns (do not do these)

- **An icon from an off-the-shelf library.** SF Symbols, Material, Lucide, Heroicons — any of them imports a foreign visual grammar into the system. The product reads as assembled from parts.
- **An icon-only primary action.** Principle 9 violation. The label is not optional for primary actions.
- **A color not from the color token system.** No hardcoded hex values on icon fills or strokes. Icons are recolored by context; a hardcoded value breaks every theme at once.
- **A shore type diagram that prioritizes aesthetics over doctrine accuracy.** The geometry is the content. An artistically stylized strut diagram that misrepresents the structural configuration is a safety error, not a polish choice.
- **Stroke width deviation.** `--icon-stroke-default` is 1.5px at the 24px grid — not 1px (washes out in sunlight), not 2px (too heavy at 16px). The value is exact.
- **An artboard size not in the four-size vocabulary.** 20px, 36px, 40px — any size not in the table is a design bug. Use the nearest standard artboard; if none fits, that is a Phase F conversation, not an inline decision.
- **Animating an icon beyond the fill cross-fade.** No scale, no rotation, no translate on state change. Those are the animations with no one-sentence job (see [`motion.md`](motion.md)).
- **Applying `--icon-radius` to anything other than stroke joins and caps.** It is not a sixth corner-radius vocabulary member; it is a derived constraint of the icon grid. A button that uses `--icon-radius` as its border-radius is using the wrong token.
- **A fill animation on list load.** The outlined-to-filled transition fires on state change only, never on initial render.

---

## Open questions for the gate

None blocking. All grid values, stroke weights, size tokens, and color application rules derive from already-accepted decisions (essay 02 "Iconography", B-3/B-8 spacing grid, ADR-011 color token system).

One item is deliberately deferred to Phase H production, not an open design question:

1. **Icon production method.** Essay 02 says "Phase E commissions from a technical illustrator or authors them directly in Figma with the USACE doctrine drawings as reference." That is a Phase H production decision — the spec is complete without it. The shore type diagram accuracy requirement (drawn from doctrine, reviewed by structural-collapse-sme) is the gate on quality; how they get produced is not.

Shore type diagram exact count (v3: 3; v4: up to ~9) is confirmed as a Phase F IA decision. Documented as deferred.

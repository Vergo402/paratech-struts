# UI Primitive: The Segmented Control

> Phase E primitive spec. The **always-visible, inline, single-select** — the deep spec of [`picker.md`](picker.md)'s "Inline segmented" variant, pulled out at picker depth. Authored at the depth of [`picker.md`](picker.md).
> Source: [`picker.md`](picker.md) §The four variants ("Inline segmented") + essay [`05-essays/02-visual-language.md`](../05-essays/02-visual-language.md) "Component Primitives" + [`06-synthesis.md`](../06-synthesis.md) §3 (one vocabulary, not five), governed by **Principle 4** (*the current value is always on screen*) and **Principle 9** (*color is never the only signal*). Grounded in the **real v3 segmented controls** — the Settings theme picker (`.theme-toggle` / `.theme-option`, a `role="radiogroup"`, `style.css:2008` / `index.html:376`) and the Inventory apparatus tabs (`.apparatus-tabs` / `.apparatus-tab`, `app.js:3091`) — the way [`card.md`](card.md) is grounded in `renderResults()`. The segmented control mints **no token of its own**; every value is owned by a sibling and cited (`--radius-button` / `--radius-input` / `--space-1` [`spacing-grid.md`](../07-design-system/spacing-grid.md), the surface / `--accent` / text palette [`color.md`](../07-design-system/color.md), `--type-body-medium` [`typography.md`](../07-design-system/typography.md), `--motion-micro` [`motion.md`](../07-design-system/motion.md)). Distinct from the **multi-select filter** ([`input.md`](input.md) — filter chips), the **binary switch** ([`toggle.md`](toggle.md)), the overlay **picker** ([`sheet.md`](sheet.md)), and the **bottom navigation bar** (app shell, Phase F) — see **The single-select boundary**.

---

## Purpose

A segmented control is a **single, inline track holding 2–5 mutually exclusive options, exactly one of them selected at all times, with the parent screen never leaving view.** The operator sees every choice and the current choice in one glance, and switches between them with one tap. It is the lightest selection primitive in the system — no overlay, no scrim, no dismiss — and it is reached for when the option set is small enough to live in the open.

It is the picker doctrine's "Inline segmented" variant, specified here at depth. [`picker.md`](picker.md) ships four picker variants and makes choosing between them a rule, not a judgment call; this primitive is the variant for **2–5 options, mutually exclusive, parent visible at all times** — the top row of the picker table. Where a [sheet](sheet.md) *rises* to offer a choice and dismisses after, a segmented control is the choice sitting permanently on the surface: it is all value, all the time.

The reason v3 needs this doc is the same reason every other primitive did: **the same conceptual control looks different in different places, and adjacent-but-different controls get confused for it.** v3 has a clean segmented control (the theme picker), a single-select scope switcher built from bare buttons (apparatus tabs), a *multi*-select filter that looks segmented but is not (the strut-system toggles), and a binary on/off switch (`.toggle-switch`) — four neighbors, no shared rule for which is which. v4 draws the line once.

---

## The single-select boundary

**A segmented control is exactly one of N, always visible. The moment a control allows zero selections, multiple selections, or hides its options, it is not a segmented control** — the same discipline [`picker.md`](picker.md) imposes on its variants, [`badge.md`](badge.md) on read-only-vs-interactive, and [`sheet.md`](sheet.md) / [`modal.md`](modal.md) on their surfaces. Segmented sits between five neighbors, so the rule is a table:

| It is a **segmented control** when… | It is **not** — it is… | which lives in |
|---|---|---|
| Exactly **one** of 2–5 options is selected, always | a single **on/off boolean** ("Sunlight auto: on") | the **switch** → [`toggle.md`](toggle.md) |
| …and **zero-or-many** options can never both be active | a **multi-select filter** (any combination, including none) | **filter chips** → [`input.md`](input.md) |
| …and all options **fit inline**, 2–5 of them | **6+ options**, or options needing **search / rich preview / long labels** | a **picker** (bottom-sheet or full-screen list) → [`picker.md`](picker.md) / [`sheet.md`](sheet.md) |
| each option **selects a value/scope and stays selected** | each option **fires an action** and nothing stays selected | a **button group** → [`button.md`](button.md) |
| it switches a **value or an in-screen scope** | it switches the **top-level app section** | the **bottom navigation bar** (app shell, Phase F IA) |

> **Single-select, always visible, ≤5 options. Break any one and it is a different primitive.**

**The v3 example the rule corrects.** [`picker.md`](picker.md) names three inline-segmented examples — *Theme (System / Light / Dark)*, *apparatus tabs*, and *Gold / Grey / LockStroke*. The first two are single-select and belong here. The third does **not**: in v3 the strut-system filter is built multi-select — `toggleSystem()` toggles each button's `.active` independently and `getActiveSystemFilter()` returns an **array** of every active system (`app.js:404`), so an operator can show Gold *and* Grey, or none. By the exactly-one rule it is a **multi-select filter**, not a segmented control, and it lives in [`input.md`](input.md) (multi-select filter chips). segmented.md draws the line and points; it does not document the filter. (This refines the picker seed against v3 reality — the same way [`card.md`](card.md) corrected its first abstraction against `renderResults()`.)

The neighbor that is *closest* and most worth stating: a **binary** segmented control (two named options, e.g. *Feet / Inches* or *4×4 / 6×6*) is still a segmented control, **not** a switch — both options carry a word and neither is "off." A [switch](toggle.md) answers *is this one thing on?*; a segmented control answers *which of these?* Two named, mutually-exclusive choices shown side by side is the smallest segmented control, never a switch wearing labels.

---

## The variants

v4 ships **two segmented variants**, split by what the selection changes. They share one shell and differ only in semantics (and therefore in ARIA — see Accessibility floor).

| Variant | Selecting an option… | Examples | v3 origin | Role |
|---|---|---|---|---|
| **Value segmented** | sets a value, mode, or parameter in place | Theme (System / Light / Dark); wood size (4×4 / 6×6); a stacked/diagonal fraction-style toggle | `.theme-toggle` + `.theme-option` | `radiogroup` / `radio` |
| **Scope segmented** (in-screen tabs) | switches *which subset of content* the screen shows, without navigating away | Apparatus tabs in Inventory; a status-filter across a shore-point list | `.apparatus-tabs` + `.apparatus-tab` | `tablist` / `tab` + `tabpanel` |

The **value** variant is the canonical one (the theme picker is its textbook case). The **scope** variant is the system's only in-screen tab pattern — there is no separate `tabs.md`; picker doctrine folds in-screen tabs into "Inline segmented," so they live here. It is **not** the bottom navigation bar: the nav bar switches the top-level app section (Quick Find / Operations / Inventory / Command / Settings), is an always-visible fixed frame that never animates ([`motion.md`](../07-design-system/motion.md) §What does not move), and is owned by the Phase F IA — a scope segmented switches content *within* a screen the operator is already on.

---

## Anatomy

| Property | Value | Token / source |
|---|---|---|
| Shape | A single rounded-rect **track** holding N equal-width segments | — |
| Track corner radius | **12pt** — matches the button/card language; a segmented control reads as one control, not N | `--radius-button` — [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Corner radius |
| Track inset (padding) | **4pt** all around the segments | `--space-1` — [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Spacing tokens |
| Selected-indicator radius | **8pt** — exactly `--radius-button` (12pt) − `--space-1` (4pt), so the indicator nests concentrically inside the track (the concentric-radius logic [`badge.md`](badge.md) uses for `--radius-badge`); it resolves to `--radius-input` | `--radius-input` — [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Corner radius |
| Segment height | **56pt** operational / **48pt** non-operational (Settings) / 44pt is the never-below WCAG floor | [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Touch targets |
| Segment width | **Equal** (`flex: 1`) by default; labels must fit without truncation (if they don't, it is a picker — see boundary) | — |
| Label | **14 / 500** unselected, **14 / 600** selected (a weight bump is a second selected-signal, not color alone) | `--type-body-medium` — [`typography.md`](../07-design-system/typography.md) |
| Track background | A **recessed** surface (the "well" the indicator floats above) | `--surface-bg`, or `--surface-card-hover` when the control is hosted on a card — [`color.md`](../07-design-system/color.md) (exact pairing is a slice OQ) |
| Selected indicator | A **raised** surface pill + 1pt hairline | `--surface-card` + `--surface-stroke` — [`color.md`](../07-design-system/color.md) |
| Selected label color | `--text-primary`; unselected `--text-secondary` | [`color.md`](../07-design-system/color.md) |
| Icon (scope tab, optional) | **16px** inline, paired with the label — never icon-only on a value segment | `--icon-size-sm` — [`iconography.md`](../07-design-system/iconography.md) |
| Elevation | **None** beyond the indicator's 1pt hairline; no drop shadow (shadows belong to the sheet and modal) | [`card.md`](card.md) §Elevation discipline |

The selected segment is signalled **three redundant ways** so it survives glare and colorblindness (Principle 9): the **raised indicator pill** (surface contrast + position), the **label weight bump** (500 → 600), and the **text-color step** (`--text-secondary` → `--text-primary`). Remove any one and the selection is still legible — the same color-never-alone contract the status badge keeps. The control takes the **button radius on purpose**: it is a control you operate, so it speaks the button/card language, not the badge's tighter 6pt.

---

## Selected state across themes

Like the [status badge](badge.md), the selected-state treatment **escalates per theme**, and the escalation *is* the accessibility story — because the raised-pill trick depends on surface contrast that some themes do not have.

- **Light / dark** — the canonical raised `--surface-card` pill on the recessed `--surface-bg` track, selected label `--text-primary` at 600, unselected `--text-secondary` at 500. The 1pt `--surface-stroke` on the pill carries the edge where the surface-to-surface contrast is subtle (light theme's `#FFFFFF` pill on `#F7F6F3` track).
- **Sunlight** — surfaces collapse to all-white (`--surface-bg` = `--surface-card` = `#FFFFFF`), so a surface-elevation pill is **invisible**. The selected segment escalates to a **2pt `--accent` border** ([`color.md`](../07-design-system/color.md) §Sunlight, `--stroke-width` 2pt) and the weight bump rides the sunlight type ramp (500 → 600 → the theme's +1 puts the selected label at 700) — the border and weight survive glare *before* any fill is read, the same way the badge becomes a solid banner.
- **Broadcast TV** — **not rendered.** A segmented control is interactive and broadcast is read-only ([`picker.md`](picker.md) / [`sheet.md`](sheet.md) / [`modal.md`](modal.md)); the *current value* renders large as text, the control affordance does not.

`--accent-subtle` is the acceptable softer alternative for the selected pill fill in light/dark if a screen wants a warmer selected read, but the neutral raised pill is canonical — it keeps the control calm (Principle 3) and matches v3's theme picker.

---

## Selection & motion mechanics

- **Selection commits immediately**, the instant a segment is tapped — no "Apply," no "Are you sure?" (Principle 6; [`picker.md`](picker.md) rule 2). The parent reflects the new value/scope at once.
- **Reversal is re-selection.** Regret is handled by tapping a different segment; because exactly one is always selected and every option is on screen, there is never anything to undo and never a toast (the doubt-free-escape principle, met structurally rather than temporally).
- **The selected indicator changes over `--motion-micro` (100ms)** — the same micro [`motion.md`](../07-design-system/motion.md) assigns to a button press and a checkbox fill. The indicator **appears under the newly selected segment in place; it does not slide across the track.** A traversing slide is decorative motion the doctrine does not budget (motion.md enumerates what moves; a segmented slide is not among it) — its only job, *confirmation*, is already done by the in-place micro-change. Pairing is fixed: `--motion-micro` rides `--ease-micro`.
- **Reduced motion / broadcast** — the indicator **switches instantly** (every `--motion-*` collapses to `--motion-instant`); because the selection is also carried by label weight and text color, the swap loses nothing ([`motion.md`](../07-design-system/motion.md) §Accessibility).
- **A light haptic may fire on selection** (the "screen saw you" touch-start tap, [`motion.md`](../07-design-system/motion.md) §Haptics); the medium commit haptic is reserved for safety-consequential commits (a status advance), not a theme switch.

---

## v3 grounding — four neighbors, one belongs

v3 renders segmented-shaped UI from several call sites with no shared primitive. v4 re-sorts them by the single-select rule, **not** by their v3 markup:

| v3 class / control | v4 |
|---|---|
| `.theme-toggle` + `.theme-option` (System / Light / Dark; `role="radiogroup"` / `role="radio"`; `setTheme()`, `app.js:7892`) | **Value segmented** (canonical) |
| `.apparatus-tabs` + `.apparatus-tab` (single-select scope, `selectedApparatus`; count badge per tab; `renderApparatusTabs()`, `app.js:3091`) | **Scope segmented** (in-screen tabs) |
| `.system-toggle` ×3 (Gold / Grey / LockStroke; **multi-select**, `aria-pressed`, `getActiveSystemFilter()` returns an array) | **Not segmented** → multi-select filter chips, [`input.md`](input.md) |
| `.toggle-switch` / `.toggle-slider` (binary on/off) | **Not segmented** → the switch, [`toggle.md`](toggle.md) |
| `#qfFraction` / `#spFraction` native `<select>` (8 fraction options) | **Not segmented** → 8 options + native control = [`picker.md`](picker.md) (full-screen-list / power-select) |
| Bottom nav (Quick Find / Operations / Inventory / Command / Settings) | **Not this primitive** → app-shell navigation (Phase F IA) |

**What carries forward verbatim:** the theme picker's structure is already right — an equal-width flex track, a 4pt inset, a raised selected indicator, and a real `role="radiogroup"` with `role="radio"` options. v4 re-tokenizes the values (v3's `var(--radius)` / `var(--surface-alt)` become `--radius-button` / the surface palette), adds the **sunlight escalation**, and standardizes keyboard navigation (below).

**The v4 gap to close:** v3's apparatus tabs are bare `<button>`s with **no tab semantics** (no `role="tablist"`/`tab`, no `aria-selected`), and **neither** segmented control implements arrow-key navigation or a single roving tab stop — Tab lands on every segment individually. v4 closes both: the value variant is a proper `radiogroup` with roving tabindex + arrow selection, and the scope variant is a `tablist`/`tab`/`tabpanel` (see Accessibility floor). This is segmented.md's parallel to the focus-trap gap [`sheet.md`](sheet.md) and [`modal.md`](modal.md) close.

---

## Universal rules

1. **Exactly one option is selected at all times** — never zero, never many. Zero-or-many selectable is a multi-select filter ([`input.md`](input.md)); one boolean is a switch ([`toggle.md`](toggle.md)).
2. **2–5 options, all visible inline.** 6+ options, or options needing search / preview / long labels, is a picker ([`picker.md`](picker.md) / [`sheet.md`](sheet.md)) — not a segmented control crammed past its width.
3. **Selection commits immediately; reversal is re-selection.** No Apply, no confirm, no undo toast (Principle 6).
4. **The current value is always on screen.** A segmented control never collapses, so it *is* the exposed current value — it satisfies [`picker.md`](picker.md) rule 3 by construction.
5. **Every value-segment carries a word**, never an icon alone (Principle 9 / no mystery meat); a scope tab may pair a 16px icon *with* its label.
6. **Color is never the only selected-signal** — raised indicator + weight bump + text-color step in light/dark; `--accent` border + weight in sunlight (Principle 9).
7. **The indicator changes in place over `--motion-micro`; it never slides across the track**, never scales ([`motion.md`](../07-design-system/motion.md)).
8. **Equal-width segments** by default; if labels can't fit at phone width without truncation, the option set is too big — escalate to a picker (rule 2).
9. **Segments abut — the 8pt dead zone does not apply between them** (see Accessibility floor for why this exception is safe).

---

## Surface adaptations

| Surface | Segmented behavior |
|---|---|
| **Phone (team officer)** | Full-width inline track, 2–5 segments, 56pt height (operational floor). The current value is always visible — no overlay to open. If labels won't fit at phone width, it was the wrong primitive (escalate to a picker). |
| **Tablet (command post)** | Same vocabulary; commonly sits in a screen toolbar or the left rail (e.g. apparatus scope on the Inventory board). Higher density tolerates more, but the ≤5-option ceiling holds — 6+ is still a picker. |
| **Laptop (Toughbook)** | **Keyboard-first:** the control is one tab stop (roving tabindex); arrow keys move the selection, Home / End jump to the ends. Dense toolbars expose it inline. |
| **Broadcast TV** | **Never renders.** Interactive primitive, read-only surface ([`picker.md`](picker.md)); the current value renders large as text, the affordance does not. No animation. |

The **sunlight** theme is the per-theme escalation (above): the selected segment grows a 2pt `--accent` border + weight because all-white surfaces defeat the raised-pill read.

---

## Accessibility floor

- **Value segmented is a `role="radiogroup"`** (labelled by its field name) containing `role="radio"` options, exactly one `aria-checked="true"`. **Scope segmented is a `role="tablist"`** of `role="tab"` options (one `aria-selected="true"`) controlling a `role="tabpanel"`. The two variants differ here precisely because their *meaning* differs — selecting a value vs. revealing a panel.
- **One tab stop, arrow to move** (WAI-ARIA APG). The control receives focus once (roving `tabindex`: `0` on the selected segment, `-1` on the rest); **Arrow Left/Right (and Up/Down) move selection**, **Home / End** jump to first / last. For the radiogroup, arrow both moves focus *and* selects (the radio pattern); the tablist follows the same single-stop model. This closes the v3 gap where every segment was its own tab stop.
- **The Power Select fallback.** When VoiceOver / TalkBack is active or "Native Controls" is on, a value segmented falls back to the OS-native `<select>` ([`picker.md`](picker.md) / [`accessibility.md`](../07-design-system/accessibility.md) §Assistive tech cannot slide) — a screen reader gets real platform semantics, never a custom control faking them. The doctrine is binary: fully custom *and* keyboard/SR-operable, or fully native.
- **The abutting-segments dead-zone exception.** [`spacing-grid.md`](../07-design-system/spacing-grid.md) mandates an 8pt dead zone between adjacent tap targets; a segmented control's segments deliberately **abut** (no gap). This is the one documented exception, and it is safe *because the consequence of a mis-tap is trivial and self-correcting*: the segments are mutually exclusive, so a stray tap lands on a neighbor that is **immediately visible and reversed with one more tap** — unlike two independent action buttons, where a mis-tap fires the wrong action. The control's overall height still meets the operational floor, and each segment still meets a usable minimum width.
- **Color never alone** (Principle 9): the selected state is `aria-checked` / `aria-selected` for assistive tech *and* indicator + weight + text-color (sunlight: + border) for sighted operators.
- **Reduced motion** loses nothing — the indicator switches instantly and the weight/text-color carry the state ([`motion.md`](../07-design-system/motion.md)).
- **Screen-reader script** (registered in [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts, following its *Role · Name · State · Action-hint* grammar): a value segment announces **"Radio button, Theme, Dark, 3 of 3, selected"**; a scope tab announces **"Tab, Rescue 2, 2 of 4, selected."** Moving the arrow re-announces the newly selected option.

---

## Anti-patterns (do not do these)

- **A segmented control that allows zero or multiple selections.** That is a multi-select filter ([`input.md`](input.md)) — the exact v3 strut-system-filter confusion this doc retires. Exactly one, always.
- **A two-option segmented control built as a switch** (or a switch built as a binary segmented). *Which of these?* is segmented; *is this on?* is a switch ([`toggle.md`](toggle.md)).
- **6+ options forced inline**, or labels truncated to fit. Past 5 it is a picker ([`picker.md`](picker.md) / [`sheet.md`](sheet.md)).
- **A sliding indicator that traverses the track.** Decorative motion the doctrine doesn't budget ([`motion.md`](../07-design-system/motion.md)); the indicator changes in place over `--motion-micro`.
- **Icon-only value segments.** Mystery meat (Principle 9) — every value-segment carries a word.
- **A selected state signalled by color alone** — no raised pill, no weight bump, no `aria-checked`. Fails in sun, for colorblind operators, and for screen readers.
- **Using a segmented control for the top-level app sections.** That is the bottom navigation bar (app shell, Phase F), not this primitive.
- **Per-segment tab stops / no arrow navigation.** The control is one focus stop with arrow-key selection (the v3 gap to close).
- **A confirm or undo toast on a selection.** Reversal is re-selecting another segment (Principle 6).
- **A drop shadow on the track** to make it "pop." Elevation belongs to the sheet and modal ([`card.md`](card.md)).
- **Re-styling a segmented control at its call site.** One track radius, one inset, one indicator treatment, one color source — never a hand-rolled version per screen (the v3 debt this doc retires).

---

## Open questions for downstream

1. **Exact track / indicator surface pairing.** Whether the recessed track reads as `--surface-bg` or `--surface-card-hover` depends on the host (a control on the page vs. a control inside a card), and the indicator's exact 1pt-stroke vs. fill weight is affordance geometry — finalized in the **vertical slice (Phase H)**, like the sheet's swipe threshold ([`sheet.md`](sheet.md) OQ2) and the card's slide mechanics ([`card.md`](card.md) OQ1). The *vocabulary* (single-select, ≤5, raised-pill + weight + text-color, sunlight border) is fixed here.
2. **A sliding indicator, if the gate wants one.** This doc budgets a `--motion-micro` in-place change and anti-patterns the traversing slide per [`motion.md`](../07-design-system/motion.md). If review prefers the iconic sliding indicator, that is a **motion-token decision (an ADR)**, not an inline call — flagged so it is decided deliberately, not assumed.
3. **Minimum segment width vs. label length.** The precise minimum width below which a segmented control must escalate to a picker (rule 2 / rule 8) is a per-screen IA call (Phase F), measured against real labels at phone width.
4. **Scope-segmented vs. the resource board.** Whether large in-screen scope switches (e.g. apparatus at task-force scale) stay a scope segmented or become a different navigation pattern is an Operations/Inventory IA decision (Phase F) — the ≤5-option ceiling will force the call.

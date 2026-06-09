# Design System: Accessibility

> Phase E, design-system file 8 of 8 — authored last, the consolidation point. At the depth of [`03-primitives/picker.md`](../03-primitives/picker.md).
> Source: the accessibility sections of every sibling — [`color.md`](color.md) (contrast), [`spacing-grid.md`](spacing-grid.md) (touch targets), [`motion.md`](motion.md) (reduced motion), [`voice-and-tone.md`](voice-and-tone.md) (copy as signal), [`iconography.md`](iconography.md) (labels), [`typography.md`](typography.md) (legibility) — plus the per-variant VoiceOver / TalkBack scripts deferred here by [`03-primitives/card.md`](../03-primitives/card.md) and [`03-primitives/picker.md`](../03-primitives/picker.md) — **consolidated, not transcribed.** It honors Principle 9 (*no mystery meat* — color is never the only signal), Principle 3 (*calm in chaos*), and the slide-to-advance status model of [ADR-010](../11-decisions/ADR-010-status-commit-model.md). Like [`voice-and-tone.md`](voice-and-tone.md), it mints **no CSS tokens** — every number it cites is owned by a sibling; this file owns the *conformance narrative* and the *screen-reader script registry*.

---

## Purpose

Accessibility on a fireground is not a compliance checkbox — it is the same problem the whole product solves, stated for one more adverse condition. The operator who cannot make out the badge color in glare and the operator who is colorblind hit the same wall; the operator running VoiceOver and the operator wearing structural gloves both need a target they can land without a second try. FieldShore's accessibility floor is therefore the *field* floor: it is designed for the worst combination of conditions, and the conformance standard rides along.

That standard is **WCAG 2.1 AA as a hard floor, AAA wherever the field already demands it.** AA is not aspirational here — text on these surfaces is load values, status, and deductions, read in sun and by low-vision users, so a token below its contrast floor fails the build (Principle 7 — *visible safety*). AAA is reached not as a stretch goal but because conditions force it: the **Sunlight theme targets 7:1 for all text** and the **Broadcast surface targets 7:1** at 8–12 ft (both → [`color.md`](color.md)); the bottom-sheet handle and every primary affordance aim above the AA line (→ [`picker.md`](../03-primitives/picker.md)).

This file consolidates and does not own values — each sibling holds its own numbers, and they are cited, never copied. What lives here is the cross-cutting picture, the rule that makes the core interaction reachable by assistive tech, and the screen-reader scripts the primitives defer to.

---

## The conformance floor

The requirements are authored where their tokens live; this is the single index of them, each pointing to its source of record. None of these numbers is restated here — follow the link for the authoritative value.

- **Contrast.** Every text token meets WCAG 2.1 AA for its use class; Sunlight and Broadcast reach AAA 7:1. Authored in [`color.md`](color.md) §Accessibility floor and recomputed by [`wcag-contrast.mjs`](wcag-contrast.mjs) — `node docs/v4-design/07-design-system/wcag-contrast.mjs`. The Phase H build runs it; any token edit that drops a pair below its floor fails CI.
- **Touch targets.** The operational floor sits *above* the WCAG minimum because gloves are the design case: [`spacing-grid.md`](spacing-grid.md) owns the 56pt operational target, 60pt for status transitions, the 8pt inter-target dead zone, and the 16pt left-edge stripe tap zone. 44pt is the never-below WCAG floor, never a design target on an operational surface.
- **Color is never the only signal** (Principle 9). Every status is **stripe + badge-with-text + label word** — three redundant channels, so glare, colorblindness, or a reduced-motion swap each cost zero information. Owned across [`color.md`](color.md), [`voice-and-tone.md`](voice-and-tone.md), and [`card.md`](../03-primitives/card.md).
- **Labels, never mystery meat** (Principle 9). No icon-only primary action; every glyph carries backing label text and every abbreviation an `<abbr>` expansion. Owned by [`iconography.md`](iconography.md) and [`voice-and-tone.md`](voice-and-tone.md).
- **Legible, resizable type.** The field-readability ramp, tabular numerals, and the sunlight weight bump are owned by [`typography.md`](typography.md); on top of those, content reflows without horizontal scrolling and survives 200% text zoom — the AA resize floor (1.4.4 / 1.4.10) this file owns, since no token does.
- **Reduced motion.** Under `prefers-reduced-motion: reduce` the system collapses to an instant state swap — owned by [`motion.md`](motion.md). Because color is never the sole signal, the swap loses nothing: the new state is fully legible the instant it appears.

---

## Assistive tech cannot slide

The defining v4 interaction — advancing a shore point's status by a deliberate slide gesture ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)) — is a gesture a VoiceOver or switch user cannot perform. The rule that makes the product accessible at all is therefore non-negotiable:

> **The slide is an enhancement, never the only path.** Every `ShorePointCard` exposes a focusable, labeled **"Advance to [next status]"** control and a **"Step back to [previous status]"** control. The gesture and the buttons commit the **same event** to the log; neither is a second-class path. ([`card.md`](../03-primitives/card.md) §Accessibility floor.)

Because the status model is *commit-immediately, always-reversible* and not a timed-undo toast, the reverse control is permanent, not a five-second window — an assistive-tech user is never racing a countdown they cannot see (ADR-010; the retired timed-undo is an anti-pattern below). The commit announces in both directions through a polite live region: **"Shore point B-2, now Cutting"** on advance, the prior state on reversal. The announcement is the label *word*, never the color (Principle 9).

**The Power Select fallback.** Custom pickers are the right interaction for a gloved thumb but a liability for a screen reader that expects native semantics. So the picker has a fourth variant that is the OS-native `<select>`, with full platform accessibility — and it engages automatically when **VoiceOver or TalkBack is in use, or the operator turns on "Native Controls" in Settings** ([`picker.md`](../03-primitives/picker.md) §The four variants). The doctrine is binary: a control is either fully custom *and* fully keyboard/SR-operable, or it falls back to fully native — never a custom control wearing native semantics it does not honor.

---

## Screen-reader scripts

Sibling docs and primitive specs defer their per-control VoiceOver / TalkBack scripts here; this section is their registry and source of record. Every script obeys one grammar:

> **Role · Name · State or value · Action hint.**
> *"Picker, opening measurement, currently 18 and one-half inches. Double tap to change."*

Name before state, state before hint — the operator hears *what it is* and *where it stands* before *what they can do*. Numbers speak as the field says them: eighths as spoken fractions ("18 and one-half inches"), per [ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md), never as raw decimals.

The scripts for the controls that exist today — the two filled primitives plus the global patterns:

| Control | VoiceOver / TalkBack announces |
|---|---|
| **Navigation tab** | "Tab, Operations, 2 of 4, selected." Label always spoken — never a bare icon (Principle 9). |
| **Picker** (any variant) | "Picker, [field], currently [value]. Double tap to change." On native fallback, the OS speaks its own select semantics. |
| **Segmented control** (value / `radiogroup`) | "Radio button, Theme, Dark, 3 of 3, selected." One tab stop; arrowing moves *and* re-announces the option; selection commits in place (the value is always on screen — Principle 4). Power Select falls back to a native `<select>` under VoiceOver/TalkBack ([`segmented.md`](../03-primitives/segmented.md)). |
| **Segmented control** (scope / `tablist`) | "Tab, Rescue 2, 2 of 4, selected." The in-screen content-scope form (apparatus tabs) — distinct from the app-shell **Navigation tab** above, which switches the top-level section ([`segmented.md`](../03-primitives/segmented.md)). |
| **`ShorePointCard`** | "Shore point B-2, Shore Secured, Division 2. Double tap to open." State is the *word*, not the stripe color. |
| **Advance / Step-back control** | "Button, Advance to Runner." / "Button, Step back to Cutting." Activating commits, then the card announces its new state. |
| **Button** (any emphasis) | Role + the imperative verb: "Button, Assign Equipment." Disabled reads as unavailable with its reason adjacent; an in-flight button sets `aria-busy` and blocks re-press ([`button.md`](../03-primitives/button.md)). |
| **Icon button** | "Button, Close." A glyph-only button (Close, back) carries its verb in the `aria-label` — never a bare icon (Principle 9); secondary/tertiary only, never a primary ([`button.md`](../03-primitives/button.md)). |
| **Status badge** (read-only) | Read inline as its label word: "Cutting." Never announced as a color. |
| **Count badge** (read-only) | Spoken with its referent, never bare: "12 shore points, Cutting" — not "12." Not a focus stop; read as part of its host row / header. |
| **Label / tag badge** (read-only) | Read inline as its word: "External," "Rescue Group Supervisor." Any abbreviation expands via `<abbr>`. |
| **Severity badge** (read-only) | Read as its level + what it flags: "High severity hazard," "Unrated zone." Paired with the consequence text, never announced as a color. |
| **Warning gate** (persistent safety disclosure) | Read as its level + what it flags, and it **persists** — durable content a reader can navigate back to, **not** an announce-once live region (a safety caveat must not be missable): *"Unrated zone — LongShore above 16 feet is not rated by Paratech; rescue engineering consultation required."* The unrated-zone acknowledgment is a focusable control — *"Checkbox, Acknowledge unrated zone, unchecked. Double tap to acknowledge."* — that gates Deploy; the disclaimer rides every result. Numbers tabular ([ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md)). ([`warning-gate.md`](../03-primitives/warning-gate.md)) |
| **Indicator dot** (read-only) | Never announced as a dot or a color — only its adjacent label word is read: "Active." |
| **Empty state** (read-only; optional action) | Read in reading order as content, not as a focus stop: "No shore points yet. Add Shore Point to add the first." The decorative glyph is `aria-hidden`; the headline + reason carry the meaning. If it carries an action, that action is a normal focusable button ("Button, Add Shore Point"); all-clear states ("No hazards logged") have nothing to activate. When an action clears the last item, the resulting empty state announces once through a polite live region — never assertive for a routine zero ([`empty-state.md`](../03-primitives/empty-state.md)). |
| **Toast / live region** | Announced once, politely: "Advancing all 2 group members." Confirmation or notification only — never the *sole* record of a state (it is also on the card). |
| **Modal / sheet** (on open) | "[Title], dialog." Focus enters the dialog; the rest of the screen is inert to the reader until it closes. |
| **Sheet handle / Close control** | "Button, Close." Backdrop tap, Esc, or activating Close all commit the same dismissal; the handle's swipe-down is the enhancement, this button the equivalent path (*assistive tech cannot drag* — [`sheet.md`](../03-primitives/sheet.md)). |
| **Side-drawer** (on open) | "[Title], drawer." On phone it is a scrimmed `dialog` (the canvas behind goes inert until it closes); on tablet/laptop it is a non-modal **companion region** (`complementary`) beside a **live** canvas — focus moves freely, Esc closes and returns focus to the tab ([`side-drawer.md`](../03-primitives/side-drawer.md)). |
| **Side-drawer tab / Close control** | "Button, [Checklist] checklist, closed. Double tap to open." (open → "…, open. Double tap to close.") The persistent edge tab carries an icon **and** a label, never a bare nub (Principle 9); swipe-to-edge is the enhancement, the tab + Esc + a focusable Close are the equal path (*assistive tech cannot slide* — [`side-drawer.md`](../03-primitives/side-drawer.md)). |
| **Measurement input / numeric keypad** | "[Field], text field, [value] inches." Keys are 56pt and individually labeled; system dictation is the secondary affordance. |
| **Text field** ([`input.md`](../03-primitives/input.md)) | "[Field], text field, [value]." Invalid: "[Field], invalid — [what failed and the fix]," via `aria-describedby`, announced **politely** (never assertive, never on every keystroke). |
| **Search field** ([`input.md`](../03-primitives/input.md)) | "Search [scope], text field. [n] results." Filtering is debounced and updates the list it controls — not a live-region storm. |
| **Assignment chip** ([`input.md`](../03-primitives/input.md)) | "Button, [resource], [position]. Double tap to reassign." The chip body opens the assignment; the remove control is a separate stop (below). |
| **Chip remove control** ([`input.md`](../03-primitives/input.md)) | "Button, Remove [resource] from [position]." A separate ≥44pt button; removal is reversible, so it does not warn. |
| **Toggle / switch** | "Switch, [label], on." / "off." State is on/off — shown as thumb *position*, never the track color ([`toggle.md`](../03-primitives/toggle.md)). Activating flips it and re-announces the new state. Under VoiceOver/TalkBack-or-Native-Controls it resolves to the OS-native switch. |
| **Busy control** (action in flight) | "Deploy strut, dimmed" while `disabled`; the **outcome** speaks, not a spinner — the card's new state or a polite toast ("Strut deployed"). A re-press announces "Working, please wait," never silence (the Surfside IP-010 lesson). The button *primitive* is [`button.md`](../03-primitives/button.md); the busy *treatment* is [`loading-state.md`](../03-primitives/loading-state.md). |
| **Loading region** (skeleton / indeterminate) | Announced once, politely, via `aria-busy` + live region: "Loading shore points." Skeleton blocks are not focus stops; when content lands it is read on next focus, never as a "done loading" interruption. The loading-vs-empty boundary lives in `aria-busy` ([`loading-state.md`](../03-primitives/loading-state.md)). |
| **Determinate progress** | "Importing, 142 of 500." Announced **at intervals**, not every row; tabular figures, spoken as the field says them ([`loading-state.md`](../03-primitives/loading-state.md)). |
| **Nested-checklist leaf** (checkbox) | "Checkbox, Determine location, checked, Rescue Group Supervisor 14:32. Double tap to uncheck." Unchecked: "…, unchecked. Double tap to check." State is the glyph + word; the attribution (spelled-out role + mono time) rides the checked state, never a bare color ([`nested-checklist.md`](../03-primitives/nested-checklist.md)). |
| **Nested-checklist section** (roll-up) | "Group, Phase 1 Size up, 8 of 13 complete." A section is a progress-bearing `group`, **not** a checkbox — its count is spoken as words and it is never announced as "mixed" (only leaves are checkable). |
| **List** (container) ([`list.md`](../03-primitives/list.md)) | "List, [name], [N] items," each item announced with its position ("3 of 12"). One tab stop enters; arrow keys rove between items — the *item* is the focus stop, never its inner badge; Enter / Space fires the item's one primary action. |
| **List section header** (collapsible) ([`list.md`](../03-primitives/list.md)) | "[Label], [N] items, collapsed. Double tap to expand." A real control with keyboard parity; the count is spoken as a word, never a bare color band (Principle 9). A live peer update announces politely, never assertive. |
| **Tree / drill-down node** ([`list.md`](../03-primitives/list.md)) | "[Label], [N] points, [status summary]. Double tap to open." Each breadcrumb crumb is a labeled back-path button; virtualization keeps a scrolled-out focused row's identity intact. |

**Registry rule.** The primitive cascade's scripts are all in the table above, each following this grammar: `sheet` (#183), `modal` (#184), `badge` (#186), `button` (#187), `list` (#188), `input` (#189), `toggle` (#190), `segmented` (#191), `slider` (#192), `toast` (#193), `empty-state` (#194), `loading-state` (#195), `nested-checklist` (#196), `warning-gate` (#293 — the 14th file, added at the Phase E audit 2026-06-07 per matrix K-11), and `side-drawer` ([#306](https://github.com/Vergo402/paratech-struts/issues/306) — the **15th** file, added at the Phase F #217 gate 2026-06-09 per [ADR-019](../11-decisions/ADR-019-side-drawer-primitive.md)). (`slider` has no separate row — its assistive-tech equivalent is the **Advance / Step-back control** above, the button path for the slide.) This file is where the scripts are collected, not where their interaction models are invented.

---

## Focus & keyboard

- **Focus order follows reading order** — top to bottom, the primary action reachable without hunting. A card's primary action precedes its secondary controls (Principle 4).
- **Modals trap focus** — a v4 requirement. v3 moves focus into a modal and restores it on close (`app.js:3695`) but does not trap; Tab can escape to the inert background. v4 closes that gap: focus cycles within the dialog until dismissed, then returns to the control that opened it.
- **The skip link stays.** v3's skip-to-content link (`index.html:62`) carries forward — the keyboard user's bypass past the header into the active screen.
- **Keyboard parity with every gesture.** Esc dismisses; arrow keys move between cards and within pickers; Enter / Space activates. The delegated Enter/Space handler that makes `role="button"` elements operable (`app.js:8756`) is the v3 mechanism v4 components inherit. No interaction is gesture-only (see *Assistive tech cannot slide*).

---

## Non-visual channels

When the operator cannot watch the screen — gloved, sun-blind, attention on the rubble — the state still has to land. Two channels carry it without pixels:

- **Haptics are not motion and survive `prefers-reduced-motion`** ([`motion.md`](motion.md)): a light tap on touch-start ("the screen saw you") and a medium impact on commit ("it went through"). For a low-vision operator the medium impact *is* the confirmation, so reduced-motion never suppresses it.
- **Copy is the layer of last resort** ([`voice-and-tone.md`](voice-and-tone.md)): when color is defeated by glare or colorblindness, the status *word* still carries the state. Every status is a word, every control a labeled verb — the redundancy is the accessibility.

Audio feedback and full voice input are **not** in v4.0 — the custom numeric keypad is the gloved-entry path, and voice is deferred to v4.5 (essay 07; see Open questions).

---

## Anti-patterns (do not do these)

- **A gesture as the only path.** Any slide/swipe without an equivalent focusable, labeled button locks out every assistive-tech and keyboard user — the whole point of *Assistive tech cannot slide*.
- **A timed-undo toast for a status change.** v4 is always-reversible-from-the-card ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)); a five-second window is a race a screen-reader user cannot see.
- **Icon-only primary action.** Mystery meat (Principle 9). Every glyph has backing label text.
- **Color-only status.** A hue with no word fails in sun and for colorblind users (Principle 9).
- **A custom control wearing native semantics.** Either fully custom *and* SR-operable, or fall back to native — never a `<div>` faking a `<select>`.
- **`aria-live="assertive"` for routine state**, or announcing on every keystroke. Routine commits are polite and announced once; assertive is reserved for the rare interruption that truly cannot wait.
- **Losing focus to `<body>` on dismiss.** Closing a modal returns focus to the control that opened it, never to nowhere.
- **A keyboard trap with no Esc.** If focus can enter, Esc can always leave.

---

## Open questions for the gate

None blocking. Four items flagged for Alex's read:

1. **Formal success-criteria audit deferred.** This is the *baseline* — the rules, scripts, and conformance narrative. The line-by-line WCAG 2.1 AA criterion-by-criterion audit (every applicable SC, evidence per control) is deferred to Phase H/J and run against real components, not prose. Confirm the deferral holds.
2. **Power Select detection mechanism.** *That* the fallback engages on VoiceOver/TalkBack-or-Settings is fixed; the exact detection (there is no reliable "a screen reader is running" web API) is a Phase H implementation question — likely the explicit Settings toggle plus best-effort heuristics. Flagged, not resolved.
3. **The three v3 gaps to close in the slice.** v4 needs an `.sr-only` utility (v3 has none), a card-level `aria-live` region for status (v3 announces only via toast), and `aria-invalid` form messaging (v3 uses `alert()`). These are committed as Phase H vertical-slice work; confirm they are not expected in this design phase.
4. **Voice input.** Deferred to v4.5 (essay 07). The v4.0 gloved-entry path is the 56pt custom numeric keypad. Confirm the deferral.

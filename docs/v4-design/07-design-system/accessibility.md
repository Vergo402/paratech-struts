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
| **`ShorePointCard`** | "Shore point B-2, Shore Secured, Division 2. Double tap to open." State is the *word*, not the stripe color. |
| **Advance / Step-back control** | "Button, Advance to Runner." / "Button, Step back to Cutting." Activating commits, then the card announces its new state. |
| **Status badge** (read-only) | Read inline as its label word: "Cutting." Never announced as a color. |
| **Toast / live region** | Announced once, politely: "Advancing all 2 group members." Confirmation or notification only — never the *sole* record of a state (it is also on the card). |
| **Modal / sheet** (on open) | "[Title], dialog." Focus enters the dialog; the rest of the screen is inert to the reader until it closes. |
| **Sheet handle / Close control** | "Button, Close." Backdrop tap, Esc, or activating Close all commit the same dismissal; the handle's swipe-down is the enhancement, this button the equivalent path (*assistive tech cannot drag* — [`sheet.md`](../03-primitives/sheet.md)). |
| **Measurement input / numeric keypad** | "[Field], text field, [value] inches." Keys are 56pt and individually labeled; system dictation is the secondary affordance. |

**Registry rule.** Each primitive doc still to be filled — `button`, `badge`, `modal`, `toggle`, `input`, `list`, `slider`, `segmented`, `toast`, `empty-state`, `loading-state`, `nested-checklist` (issues #184–196) — adds its own script *following this grammar* and links back here. (`sheet` (#183) is filled — its handle / Close script is in the table above.) This file is where the scripts are collected, not where their interaction models are invented.

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

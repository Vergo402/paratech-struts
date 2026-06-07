# UI Primitive: The Toggle

> Phase E primitive spec. The **binary switch** — a single on/off control that flips one setting and carries its state in the *position* of a sliding thumb, never in color alone. Authored at the depth of [`picker.md`](picker.md).
> Source: essay [`05-essays/02-visual-language.md`](../05-essays/02-visual-language.md) "Component Primitives" + [`06-synthesis.md`](../06-synthesis.md) §4 (one ruled vocabulary, no per-screen reinvention), governed by **Principle 9** (*color is never the only signal*), **Principle 6** (*doubt-free escapes — reversible, never "Are you sure?"*), and **Principle 5** (*doubt-free defaults — off is the safe state*). Grounded in the **real v3 switch** — `.toggle-switch` / `.toggle-slider` (`style.css:1154`), a 48×28 capsule with a translating thumb — and in v3's **naming confusion**: `.system-toggle` (`style.css:451`) is *called* a toggle but is the Gold / Grey / LockStroke strut-system filter — and it is built **multi-select** (`getActiveSystemFilter()` returns an array, `app.js:404`), so it is neither a switch *nor* a segmented control but a **multi-select filter → [`input.md`](input.md)**. The toggle mints **no token of its own** — every value is owned by a sibling and cited (`--accent` [`color.md`](../07-design-system/color.md) for *on*; a neutral UI-component grey for *off*; `--surface-card` thumb; `--surface-stroke` hairline; `--motion-micro` + `--ease-micro` [`motion.md`](../07-design-system/motion.md); the 56/48pt row from [`spacing-grid.md`](../07-design-system/spacing-grid.md); sentence-case labels from [`voice-and-tone.md`](../07-design-system/voice-and-tone.md)). Distinct from the **segmented control** ([`segmented.md`](segmented.md)), the **multi-select filter** ([`input.md`](input.md)), and the **checkbox** ([`list.md`](list.md) selection / [`nested-checklist.md`](nested-checklist.md) completion) — see **The binary boundary**.

---

## Purpose

A toggle is a **switch**: one control with exactly two states, on and off, that takes effect when it flips. The operator reads its position — thumb left or thumb right — and knows at a glance whether the thing it governs is on. It owns one boolean and nothing else.

The toggle is the quietest interactive primitive, and like every other primitive it earns a doc for the same reason [`picker.md`](picker.md) and [`badge.md`](badge.md) did: **v3 expresses one idea three different ways.** A genuine on/off setting (the deduction toggle) renders as a capsule switch; a binary form field (Multi-building operation) renders as the *same* switch; but a multi-select filter (Gold / Grey / LockStroke — any combination can be active) is *also* called a "toggle" in the code (`.system-toggle`) while being neither a switch nor a segmented control — and several true selection lists render as raw native checkboxes. Four different binary-ish patterns, no shared rule for which is which. v4 draws the line once: **a switch is for one thing that is on or off; a single named choice is a segmented; a multi-select filter is filter chips; selecting or completing items is a checkbox.** Get the boundary right and the switch itself is almost trivial — its whole job is to carry one bit, unmistakably, in glare and in gloves.

That "unmistakably" is the design work. An iOS-style switch that signals *on* only by turning green is a Principle 9 failure: it dies in 100,000-lux sun and is invisible to a red-green colorblind operator. FieldShore's toggle carries its state in **the thumb's position** — a geometric signal that survives glare, colorblindness, and a reduced-motion swap with zero information lost. Color is the redundant channel, never the only one.

---

## The binary boundary

**Whether something is a toggle is a rule, not a judgment call** — the same discipline [`sheet.md`](sheet.md) imposes with sheet-vs-modal and [`badge.md`](badge.md) with badge-vs-chip. Two boundaries meet here.

### Toggle vs. segmented

| It is a **toggle** when… | It is a **segmented** ([`segmented.md`](segmented.md)) when… |
|---|---|
| One thing is **on or off** | The operator picks among **2–4 named, co-equal options** |
| You can phrase it *"turn X on/off"* | You can only phrase it *"choose A, B, or C"* |
| **Off is a meaningful default** — the absence of the feature (Principle 5) | **No option is "off"** — every choice is affirmative |
| Multi-building operation; Include deductions; Native controls | Theme (System / Light / Dark); wood size (4×4 / 6×6); apparatus tabs |

> **The v3 cautionary tale:** `.system-toggle` (`style.css:451`) is *named* a toggle but renders three co-equal options — Gold, Grey, LockStroke — and is built **multi-select**: `toggleSystem()` toggles each independently and `getActiveSystemFilter()` returns an array (`app.js:404`), so any combination (or none) can be active and there is no "off." That makes it neither a switch **nor** a segmented control (which is exactly one-of-N) — it is a **multi-select filter**, and it belongs to [`input.md`](input.md) (filter chips), not here and not [`segmented.md`](segmented.md). v4 does not inherit the misnomer. Theme — System / Light / Dark / Sunlight — *is* a single-select choice among named themes ([`segmented.md`](segmented.md) / [`picker.md`](picker.md) "inline segmented"), and it too is never a switch.

The genuinely hard case is a **two-state** choice — "Feet | Inches," a mode with two names. Resolve it by Principle 5: if one state is the **safe absence** of the other (a feature you enable), it is a toggle and *off* is the default. If the two states are **symmetric named alternatives** with no safer side, it is a two-option segmented — the operator should read a labeled choice, not infer meaning from a switch position. A switch whose "off" is not the safe answer is mis-modeled (see Universal rules 3).

### Toggle vs. checkbox

| It is a **toggle** when… | It is **not** a toggle when… |
|---|---|
| It governs a **persistent setting or mode** | It **selects items** from a set → [`list.md`](list.md) / [`picker.md`](picker.md) full-screen-list multi-select |
| Flipping it **takes effect** (immediately, or with its form) | It **marks completion** of a doctrine step → [`nested-checklist.md`](nested-checklist.md) (`role="checkbox"`) |
| It is one bit the operator returns to and changes | It is a **one-time consent gate** before a consequential action → the [`modal.md`](modal.md) it gates |

> **A switch owns *settings and modes*. A checkbox owns *selection and completion*.** v3 blurs this by rendering both as `type="checkbox"`; v4 separates them by *what the control does*, not by its markup.

The v3 elements this excludes: the apparatus multi-select checklists (`app.js:3784`, `3803`, `3859` — choosing which apparatus join an operation or a group) are **list selection** ([`list.md`](list.md)); the unrated-zone **acknowledgment** checkbox (`app.js:522` — a one-shot "I have consulted rescue engineering" gate) is a **consent control on its confirming modal** ([`modal.md`](modal.md)), not a reusable setting. toggle.md draws the line and points; it does not document either.

---

## The variants

v4 ships **two toggle variants**. Both are the *same switch* — same anatomy, same accessibility, same motion. They differ only in **when the flip takes effect**, the same axis on which [`sheet.md`](sheet.md) splits immediate-commit from Apply-the-form.

| Variant | When it takes effect | Examples | v3 origin |
|---|---|---|---|
| **Setting toggle** | **Immediately on flip**, and is reversible (Principle 6) — flip back to undo | Include deductions (`qfDeductionToggle` / `spDeductionToggle`); Native controls; per-device display settings | `.toggle-switch` on `onchange` |
| **Form toggle** | **Staged**, commits with the form's primary action; discarded if the form is dismissed | Multi-building operation in Start Operation (`opMultiBuilding`, read at `confirmStartOp`) | `.toggle-switch` read at submit |

The **setting toggle** is the canonical case — a preference the operator turns on and lives with, committed and reversible the instant it flips, no confirmation between them (Principle 6). It may **govern a dependent region's disclosure**: v3's deduction toggle reveals or hides the deduction panel beneath it, and that panel appears/collapses as content (per [`motion.md`](../07-design-system/motion.md)), distinct from the switch's own micro-flip.

The **form toggle** is a binary *field*, not a live setting. It sits inside a sheet or full-screen form and its value is part of what the form's one primary action commits — flipping it changes nothing until the operator taps **Start operation**, and dismissing the form throws the flip away. This is the same contract a single-field choice has inside a multi-field sheet ([`sheet.md`](sheet.md) §Open/dismiss).

---

## Anatomy

| Property | Value | Token / source |
|---|---|---|
| Track shape | **Capsule** — fully rounded (radius = height ÷ 2), not a member of the five-radius vocabulary, the same way a notification dot is a circle, not a `--radius-*` | [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Corner radius (the capsule is a shape, not a sixth radius) |
| Track — off | A neutral that reads "not on" and stays perceivable against the thumb and surface (WCAG 1.4.11, 3:1) | **Light / dark:** `--text-tertiary` fill — [`color.md`](../07-design-system/color.md) (its UI-component neutral; clears 3:1 — ≈3.4 light, 4.21 dark). **Sunlight:** an **outlined empty capsule** (2pt `--surface-stroke`), since color.md forbids mid-grey in sun. State is the **thumb position**, never the track hue (Principle 9). |
| Track — on | The single accent | `--accent` — [`color.md`](../07-design-system/color.md) (gold; per-theme, the badge/button "on" color) |
| Track border | 1pt hairline (2pt under sunlight) | `--surface-stroke` / `--stroke-width` — [`color.md`](../07-design-system/color.md) |
| Thumb | A **circle** that sits **left when off, right when on** — the position *is* the state | fill `--surface-card` (a raised surface chip) — [`color.md`](../07-design-system/color.md) |
| Label | **14 / 500**, **sentence case**, names the setting as a stable noun phrase | `--type-body-medium` — [`typography.md`](../07-design-system/typography.md); wording [`voice-and-tone.md`](../07-design-system/voice-and-tone.md) |
| Helper line (optional) | One quiet clause under the label when the setting needs a condition | `--text-secondary` — [`color.md`](../07-design-system/color.md); em-dash qualifier per [`voice-and-tone.md`](../07-design-system/voice-and-tone.md) |
| Row | Label (and helper) left, switch right; **the whole row is the tap target** | row height = the surface touch floor (below) |
| Touch floor | **56pt** in an active operation; **48pt** on a non-operational surface (Settings); 44pt is the never-below WCAG floor, not a target | [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Touch targets |
| Inter-target gap | 8pt minimum dead zone between stacked toggles | [`spacing-grid.md`](../07-design-system/spacing-grid.md) |
| Elevation | **None.** Like the badge, a toggle never casts a shadow; shadows belong to the sheet and modal | [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Elevation |

The v3 switch geometry (a 48×28 capsule track with a 22pt thumb travelling 20pt) is **sound and carries forward as shape** — what v4 changes is re-tokenizing the colors (v3's literal `--blue` *on* and `--text-disabled` *off* become `--accent` and a cited neutral), routing the flip through the motion scale, and making the thumb position the load-bearing state signal. Exact pixel dimensions are affordance geometry for the slice (Open questions).

---

## States & flip mechanics

A toggle has four states, and **none of them is signalled by color alone** (Principle 9):

- **Off** — thumb **left**, track neutral grey. The default for a setting toggle (Principle 5).
- **On** — thumb **right**, track `--accent`. The thumb has *moved*; that movement is the signal a glare-blind or colorblind operator reads.
- **Disabled** — when the setting is not currently changeable (a dependency unmet), the whole control drops to a reduced-emphasis treatment and is removed from the focus order; its label still reads, so the operator knows the setting exists.
- **Focus / pressed** — a focus ring on keyboard focus; a light press feedback on touch-down (`--motion-micro`), the same micro-feedback a button gives.

**The flip:**

- On commit, the **thumb translates** left↔right and the **track cross-fades** neutral↔`--accent`, both over **`--motion-micro` (100ms)** on `--ease-micro` — a micro state change, in the same family [`motion.md`](../07-design-system/motion.md) names for "checkbox/icon fill." It is a slide-and-fill only: **no bounce, no overshoot, no scale.**
- A **light haptic** fires on touch-start ("the screen saw you"); the medium **commit** haptic is reserved for operational *status* commits, not routine setting flips — a setting that buzzes like a shore-point advance is haptic inflation (Principle 3). See Open questions.
- **Reduced motion / sunlight / broadcast:** the thumb **snaps** to its new position with no slide and no track cross-fade (every `--motion-*` → `--motion-instant`, [`motion.md`](../07-design-system/motion.md)). Because the state lives in *position*, the snap loses nothing.
- **No confirmation.** A setting toggle commits and is reversible (Principle 6) — there is no "Are you sure?" between the tap and the change; the operator flips it back if they change their mind. A form toggle stages silently and rides its form's primary action.

---

## v3 grounding — one switch, two misuses retired

v3 renders binary and binary-ish UI from several call sites with no shared rule. v4 re-sorts every one of them **by what the control does, not by its v3 markup:**

| v3 class / site | v4 |
|---|---|
| `.toggle-switch` + `.toggle-slider` on `qfDeductionToggle` / `spDeductionToggle` (`index.html:153`, `:552`; `onchange` → `toggleDeductions`) | **Setting toggle** |
| `.toggle-switch` on `#opMultiBuilding` (`index.html:638`; read at `confirmStartOp`, `app.js:5530`) | **Form toggle** |
| `.system-toggle` / `.toggle-dot` / `.toggle-label` — Gold / Grey / LockStroke, **multi-select** (`getActiveSystemFilter()` returns an array, `app.js:404`) | **Not a toggle** → multi-select **filter chips**, [`input.md`](input.md) (not a segmented control either) |
| native `type="checkbox"` in apparatus multi-select (`app.js:3784`, `3803`, `3859`) | **Not a toggle** → list selection ([`list.md`](list.md) / [`picker.md`](picker.md) full-screen-list) |
| unrated-zone acknowledgment checkbox (`app.js:522`) | **Not a toggle** → consent gate on its modal ([`modal.md`](modal.md)) |
| doctrine checklist completion items (D6) | **Not a toggle** → [`nested-checklist.md`](nested-checklist.md) (`role="checkbox"`) |

**What carries forward verbatim:** the capsule-with-translating-thumb shape, already correct in v3. **The v4 gaps this closes:** (1) the *naming* gap — a three-option segmented stops being called a "toggle"; (2) the *signal* gap — on/off stops depending on track color and becomes thumb position first (Principle 9); (3) the *vocabulary* gap — switch, segmented, and checkbox are now three distinct primitives chosen by a rule, not three accidents of which markup a screen reached for.

---

## Universal rules

1. **A toggle is one thing, on or off.** Two-or-more named choices is a segmented control ([`segmented.md`](segmented.md)); selecting or completing items is a checkbox ([`list.md`](list.md) / [`nested-checklist.md`](nested-checklist.md)). The boundary is a rule.
2. **State is carried by thumb position, never by color alone** (Principle 9). Off = thumb left; on = thumb right. The position survives glare and colorblindness; the track color is the redundant channel.
3. **Off is the safe default** (Principle 5). A toggle whose *off* state is the more aggressive or less safe one is mis-modeled — re-think the default, or make it a named segmented choice so neither side hides behind "off."
4. **The label names the setting as a stable noun phrase, sentence case** ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md)). It does **not** change with state and never uses "Enable / Disable" verbs — the switch position carries on/off. "Multi-building operation," not "Enable multi-building."
5. **Setting toggles commit immediately and reversibly** (Principle 6) — no confirmation. **Form toggles stage and commit with the form's primary action**, and a dismissed form discards the flip.
6. **The whole row is the target** — label and switch both flip it — at the surface's touch floor (56pt operational / 48pt non-operational), with an 8pt dead zone between stacked toggles ([`spacing-grid.md`](../07-design-system/spacing-grid.md)).
7. **The flip is `--motion-micro` only** — thumb slide + track cross-fade, no bounce, overshoot, scale, or pulse ([`motion.md`](../07-design-system/motion.md); Principle 3). Reduced motion, sunlight, and broadcast snap instantly.
8. **Color cites, never picks.** On = `--accent`; off = a neutral cited from [`color.md`](../07-design-system/color.md); thumb = `--surface-card`. The toggle mints no token and never hard-codes a hex ([ADR-011](../11-decisions/ADR-011-color-token-system.md)).
9. **Keyboard and screen-reader parity is non-negotiable.** Focusable, Space/Enter flips, announced as "Switch, [label], [on/off]" ([`accessibility.md`](../07-design-system/accessibility.md)). Never a bare `<div>` faking `role="switch"`.

---

## Surface adaptations

| Surface | Toggle behavior |
|---|---|
| **Phone (team officer)** | The canonical row: label (and optional helper) left, switch right; the whole row taps. 56pt in an active operation (the deduction toggle in the Quick Find / shore-point flow), 48pt on Settings. |
| **Tablet (command post)** | Identical control; in a two-column Settings or form layout the toggle sits in the right pane. Keyboard-focusable, Space/Enter flips. |
| **Laptop (Toughbook)** | Identical; **keyboard-first** — Tab reaches it, Space/Enter flips, focus ring visible. Dense settings lists keep the 8pt dead zone. |
| **Broadcast TV** | **Never renders.** Toggles are interactive, and settings / forms do not appear on the read-only board ([`picker.md`](picker.md) / [`sheet.md`](sheet.md)). A *display* toggle like Native controls is per-device anyway and has no meaning on a shared screen. |

The **sunlight** theme thickens the track hairline to 2pt and bumps the label weight one step with the rest of the theme ([`typography.md`](../07-design-system/typography.md) / [`color.md`](../07-design-system/color.md)); it does **not** change the on/off mechanic, because the state already lives in position, not in a hue the sun can wash out.

---

## Accessibility floor

- **The control is a real switch** — `role="switch"` with `aria-checked` (or a native `<input type="checkbox" role="switch">`), never a styled `<div>`. VoiceOver / TalkBack announces **"Switch, [label], on"** / **"off"** — registered in [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts.
- **State is announced as on/off and shown as position**, never as the track color (Principle 9) — the parallel of the badge's "read as the word, not the hue."
- **Keyboard parity:** focusable in reading order, **Space / Enter flips**, focus ring visible; the delegated activation handler v4 inherits from v3 (`app.js:8756`) drives it ([`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard).
- **Native-semantics fallback.** When VoiceOver / TalkBack is active or "Native controls" is on, the toggle resolves to the **OS-native switch** with full platform accessibility — the same doctrine as the picker's Power Select ([`accessibility.md`](../07-design-system/accessibility.md) §Assistive tech cannot slide): a control is fully custom *and* SR-operable, or it falls back to native — never a custom surface faking native semantics.
- **Touch & spacing:** 56pt operational / 48pt non-operational row, 8pt inter-target dead zone ([`spacing-grid.md`](../07-design-system/spacing-grid.md)); the *visible* switch may be smaller than the *hit area*, which fills the row.
- **Reduced motion loses nothing:** the thumb snaps to position; because position is the state, it is fully legible the instant it switches ([`motion.md`](../07-design-system/motion.md)).
- **Haptics survive reduced motion** ([`accessibility.md`](../07-design-system/accessibility.md) §Non-visual channels): the light touch-start tap is not suppressed.
- **Disabled toggles leave the focus order** but keep their label visible, so a non-visual user learns the setting exists even when it is not currently changeable.

---

## Anti-patterns (do not do these)

- **A switch for a named multi-option choice.** System / Light / Dark is a segmented control ([`segmented.md`](segmented.md)); the multi-select Gold / Grey / LockStroke strut-system filter is **filter chips** ([`input.md`](input.md)) — the exact v3 `.system-toggle` mistake this doc retires (it is neither a switch nor a segmented control).
- **On/off signalled by color alone.** A green-vs-grey track with the thumb hidden or centered fails in sun and for colorblind operators. Position carries the state (Principle 9).
- **An "off" state that is the aggressive or unsafe one.** Off is the safe default (Principle 5); if it cannot be, the control is mis-modeled.
- **"Enable X" / "Disable X" labels, Title Case, or a label that changes with state.** The label names the setting; the switch carries on/off ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md)).
- **"Are you sure?" on a setting toggle.** Reversibility handles regret (Principle 6).
- **A bouncing, overshooting, or pulsing switch.** The flip is a 100ms slide-and-fill, nothing more ([`motion.md`](../07-design-system/motion.md); Principle 3).
- **A `<div>` faking a switch**, or a toggle with no keyboard / screen-reader path.
- **Minting a track or thumb hex** instead of citing `--accent` / a neutral / `--surface-card` ([ADR-011](../11-decisions/ADR-011-color-token-system.md)).
- **A switch used to select list items or mark checklist completion** — those are [`list.md`](list.md) and [`nested-checklist.md`](nested-checklist.md).
- **A shadow on a switch** to make it "pop." Elevation belongs to the sheet and modal.

---

## Open questions for downstream

1. **Pixel geometry** (the off-track *color* is now resolved — see Anatomy: `--text-tertiary` fill in light / dark, an outlined 2pt `--surface-stroke` capsule in sunlight where mid-grey is forbidden). The track width / height, thumb diameter, and travel distance remain affordance geometry finalized in the **vertical slice (Phase H)** — like the sheet's swipe threshold (sheet.md OQ2) and the badge's pixel padding (badge.md OQ1). The off-track clears **WCAG 1.4.11 non-text contrast (3:1)** against thumb and surface: `--text-tertiary` computes ≈3.4:1 (light) / 4.21:1 (dark) via [`wcag-contrast.mjs`](../07-design-system/wcag-contrast.mjs); sunlight carries the boundary on the 2pt outline, not a fill.
2. **Commit haptic on a setting flip.** Leaning **light touch-haptic only** — the medium commit haptic stays reserved for operational status commits to avoid haptic inflation on routine settings ([`motion.md`](../07-design-system/motion.md)). Confirmed in Phase H against a real device.
3. **Native-fallback detection.** *That* the toggle falls back to the OS-native switch under VoiceOver / TalkBack-or-Settings is fixed; the exact detection shares the unresolved Power Select detection question ([`accessibility.md`](../07-design-system/accessibility.md) OQ2).
4. **A consequential (non-destructive) toggle.** If Phase F surfaces a setting whose flip has an inventory or operational consequence (none exists in v3), it may need the **inventory-consequential confirm** pattern ([`modal.md`](modal.md)) rather than a bare reversible flip. Flagged so it is not silently shipped bare; the everyday setting toggle stays confirmation-free.

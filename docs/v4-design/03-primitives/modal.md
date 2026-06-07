# UI Primitive: The Modal

> Phase E primitive spec. The **center-anchored stop surface.** Authored at the depth of [`picker.md`](picker.md).
> Source: essays [`05-essays/02-visual-language.md`](../05-essays/02-visual-language.md) "Motion Doctrine" (the modal as *orientation* — it arrives at center) + [`05-essays/03-ic-workflow.md`](../05-essays/03-ic-workflow.md) (the deliberate, consequential command action) + [`06-synthesis.md`](../06-synthesis.md) §1.5 / §4, **governed by [ADR-010](../11-decisions/ADR-010-status-commit-model.md)** (heavy confirmation reserved *only* for the destructive/terminal). Grounded in the **real v3 `.modal-overlay`** — nine overlays driven by `openModal()` / `closeModal()` (`app.js:3695`), most of which are *not* v4 modals (see below), the way [`card.md`](card.md) is grounded in v3's `renderResults()`. The modal mints **no token of its own**; the one new token it triggers — **`--scrim`** — is minted in its owner [`color.md`](../07-design-system/color.md) because the scrim is shared with [`sheet.md`](sheet.md) (sheet.md OQ1 deferred it to this issue). Every other value is owned by a sibling and cited. Distinct from [`sheet.md`](sheet.md) (bottom surface, everyday choice).

---

## Purpose

A modal is a surface that **sits at the center of the screen, dims everything behind it, and stops the operator until they decide.** Where the [sheet](sheet.md) rises to the thumb so the everyday choice never interrupts the flow, the modal is the opposite primitive on purpose: it interrupts. It is reached with a second hand and a moment of attention, and that friction is the point — it is reserved for the rare action that is consequential enough to deserve a stop, or for a task too large to fit a sheet.

The center is not an aesthetic choice. **The phone is the floor** ([`motion.md`](../07-design-system/motion.md)) and the bottom third is where a gloved thumb lives — so a center surface is *deliberately* awkward for one-handed use. That awkwardness is correct here: End Operation should not be as easy to fire as picking a base plate. The modal trades reach for gravity.

**Modal vs. sheet is a rule, not a judgment call** — the same discipline [`picker.md`](picker.md) imposes on its variants, and the exact inverse of the table in [`sheet.md`](sheet.md):

| Use a **modal** when… | Use a **sheet** when… |
|---|---|
| The action is destructive or terminal | The action is non-destructive — choosing, entering, reviewing |
| The operator must stop and decide before anything else | The parent screen should stay in context behind it |
| The action is rare and consequential | It is the everyday rhythm of an operation |
| **The content is a form too large for a 60vh sheet** (Start Operation, Add Shore Point) | The content fits a short form or a single choice |
| End Operation, un-deploy a strut, un-return equipment, delete | Base-plate picker, role assignment, wood size, Assign Equipment, action lists |

If the action is reversible and routine, it is **never** a modal — the everyday advance is a slide and is reversible from the card ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)); the everyday choice is a sheet that dismisses with nothing committed (Principle 6). See **Confirmation doctrine** below — it is the whole reason this primitive exists, and the whole reason it is rare.

---

## The variants

v4 ships four modal variants. Which one you reach for is determined by the action, not by taste.

| Variant | Holds | Example | Commit |
|---|---|---|---|
| **Destructive / terminal confirm** | A single irreversible decision the operator must stop for | End Operation; un-deploy a strut; delete an apparatus or department | Explicit **danger** button commits; **Cancel is the default**; backdrop + Esc cancel |
| **Inventory-consequential confirm** | A reversible-but-costly action that moves real inventory counts | A return / deploy that decrements or increments stock ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)) | Explicit confirm; the count change is stated in the body |
| **Full-screen form** | Multi-section input too large for a 60vh sheet | Start Operation; Add Shore Point; Add Apparatus | One primary **Save** + Cancel; validates before commit; pinned header/footer, body scrolls |
| **Blocking alert** | A system condition that must be acknowledged before anything continues | Force-update; an unrecoverable load / data error | Single **Acknowledge** — this is where v3's `alert()` calls land |

The first two are the destructive/terminal core. The **full-screen form** is the large-content host (the sheet's 60vh cap sends oversized forms here); it carries the v3 `.modal-scrollbody` pinned-header/footer split (v3.16.3 #101) so the actions never scroll out of reach. The **blocking alert** is the narrow exception that genuinely halts the app.

---

## Anatomy

| Property | Value | Token / source |
|---|---|---|
| Position | Centered on both axes; the card **translates up 8pt** as it appears (origin slightly below center → arrives at center) | [`motion.md`](../07-design-system/motion.md) §What moves |
| Max width | Phone fills width with 16pt side insets; tablet / laptop capped at a readable ~600–700pt | [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Surface breakpoints |
| Max height | **85vh** — the body scrolls inside; header/footer pinned for the form variant | v3 `.modal` / `.modal-scrollbody` |
| Corner radius | **16pt, all four corners** (a centered surface has no flush edge) | `--radius-sheet` — [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Corner radius (the shared large-overlay radius; the token name reflects its first use on the sheet, the value is the same 16pt) |
| Background | Elevated surface | `--surface-elevated` — [`color.md`](../07-design-system/color.md) |
| Border | 1pt hairline (2pt under sunlight) | `--surface-stroke` — [`color.md`](../07-design-system/color.md) |
| Elevation | A real cast shadow — modals and sheets are the only primitives granted one; the modal uses **`--shadow-modal`**, a *centered* downward cast distinct from the sheet's bottom-anchored geometry | `--shadow-modal` — [`color.md`](../07-design-system/color.md) §Strokes & elevation / [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Elevation |
| Scrim | Backdrop dims the parent, **fades 0 → `--scrim` (40%)** with the card's arrival | `--scrim` — [`color.md`](../07-design-system/color.md); timing in [`motion.md`](../07-design-system/motion.md) §What moves |
| Title | `--type-headline-2`; doubles as the dialog's accessible name | [`typography.md`](../07-design-system/typography.md) |
| Body padding | **`--space-8` (32pt)** — more generous than the sheet's 16pt; the modal is a considered, two-handed surface | [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Spacing tokens ("Modal internal padding") |
| Buttons | ≥ 56pt operational / ≥ 48pt non-operational; ≥ 120pt wide; 8pt dead zone; destructive primary uses `--danger` | [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Touch targets; `--danger` — [`color.md`](../07-design-system/color.md) |

The modal shares the sheet's elevated surface, 16pt overlay radius, and real cast shadow because the two are peer overlay surfaces; it diverges in three places — it is **centered not bottom-anchored**, it carries **32pt padding not 16pt** (a considered surface, not a thumb-reach one), and it rounds **all four corners** (no screen edge to sit flush against).

---

## Open / dismiss mechanics

- **Open.** The scrim fades `0 → --scrim` over `--motion-transition` (**200ms**) on `--ease-standard`, and the card translates up 8pt simultaneously — *orientation* ([`motion.md`](../07-design-system/motion.md) §What moves). 200ms, the same as the sheet: the operator is already waiting, and a slower modal feels sluggish.
- **Dismiss is asymmetric by variant.** A **form** or **blocking alert** is cancelable four equal ways — backdrop tap · **Esc** · the **Cancel** control · **system back** (Android) — and a cancel commits nothing. A **destructive confirm** treats backdrop tap and Esc as **cancel — the safe default**; only the explicit danger button commits the destructive action.
- **The destructive action is never the easy one.** It is never the default focus, never the backdrop action, never the Enter action. One stray gloved tap or keypress must not end an operation.
- **One modal at a time.** Opening a second dismisses the first — modals never stack. Stacked overlays are a stacking-context and focus-trap hazard, the exact failure ADR-010 was written against.
- **Reduced motion / broadcast.** The modal **appears**, it does not rise — every `--motion-*` collapses to `--motion-instant` ([`motion.md`](../07-design-system/motion.md)). Broadcast never renders a modal at all (see Surface adaptations).

---

## Confirmation doctrine — governed by ADR-010

This is the whole reason the modal exists, and the reason it is rare. It is the modal's equivalent of the sheet's "carried-forward" hardening: a rule v4 has already paid to settle, recorded here so it does not regress.

- **The everyday flow has no modal.** A shore point advances by a deliberate slide and is reversible from the card at any time ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)); a sheet dismisses with nothing committed (Principle 6). Neither asks "Are you sure?" A confirm-modal on a *reversible* action is the precise field failure ADR-010 rejected — a stacked "Advance to Cutting?" under stress, racing a gloved thumb (ADR-010 Alternatives).
- **The modal earns its interruption only when the action is genuinely terminal or destructive** — one a card cannot cheaply reverse: End Operation (it archives the whole operation), an inventory-decrementing return, a delete. ADR-010 reserves "heavy confirmation … only for destructive/terminal actions"; **this primitive *is* that heavy confirmation, and nothing lighter ever wears it.**
- **This is why v3's 10 `confirm()` + 19 `alert()` calls do not survive as 29 modals** ([`06-synthesis.md`](../06-synthesis.md) §Tech debt). The reversible ones dissolve into slide-to-advance and the [toast](toast.md) (repurposed to confirmation/notification only, per ADR-010); only the handful of truly terminal actions keep a modal.
- **The danger control is styled as danger** (`--danger`) and is **never the default** — so neither a fat-fingered tap, an Enter keypress, nor a backdrop dismiss can fire it.

---

## v3 grounding — nine overlays, most are not v4 modals

v3 has nine `.modal-overlay` surfaces (`index.html`), all opened by one `openModal()` / `closeModal()` pair (`app.js:3695`). v4 re-sorts them by the boundary above, **not** by their v3 markup:

- **Short forms and single choices → sheets.** Feedback, Add Hazard, Add Individual, Assign Role, Add Equipment, Add External — the everyday entry surfaces move to [`sheet.md`](sheet.md).
- **Large forms → the full-screen-form modal.** Start Operation and Add Shore Point exceed a sheet's 60vh cap, so they keep a modal — with v3's `.modal-scrollbody` pinned header/footer (v3.16.3 #101) carried forward so the body scrolls beneath fixed actions.
- **Terminal / destructive confirms → the v4 modal.** End Operation, un-deploy, un-return, delete.

Carried forward verbatim: the `.modal-scrollbody` scroll split; the **`document.body` reparenting** that any sheet/picker opened from *inside* a modal must do to escape the z-index-100 stacking context (`openPlatePicker()` / `closePlatePickers()` — shared with [`sheet.md`](sheet.md) §iOS reliability); and `openModal()`'s focus save + restore.

**The v4 gap to close:** v3 does **not** trap focus and does **not** make the background inert — Tab escapes a v3 modal to the content behind it. v4 closes both (see Accessibility floor; [`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard).

---

## Universal rules

1. **A modal is a stop, not a step.** It appears only for the destructive/terminal action or the over-sized form; the everyday choice is a sheet and the everyday advance is a slide ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)).
2. **The destructive action is never the default.** Cancel holds focus; backdrop tap and Esc cancel; only the explicit danger button commits.
3. **Esc always cancels.** If focus can enter, Esc can leave — there is no focus trap without an escape ([`accessibility.md`](../07-design-system/accessibility.md)).
4. **One modal at a time; never stacked.**
5. **The scrim is always present and dims the parent** — `--scrim`, the one scrim shared with the sheet.
6. **Focus is trapped while open and returns to the opener on close** — never to `<body>` (a v4 requirement; [`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard).
7. **Color is never the only signal** (Principle 9): the danger button carries a verb label and an icon, not just red; an invalid form field carries text, not just a red border.

---

## Surface adaptations

| Surface | Modal behavior |
|---|---|
| **Phone (team officer)** | Centered card, fills width (16pt insets), `max-height: 85vh`, body scrolls; the full-screen-form variant fills the screen under a pinned header/footer. The rare two-handed surface — the operator has stopped to make this decision. |
| **Tablet (command post)** | Centered, capped ~600–700pt, scrim over the board. The CP user confirming End Operation is the canonical case. |
| **Laptop (Toughbook)** | Centered / floating, **keyboard-first**: Esc cancels, Tab cycles within the trap, Enter commits the **safe** action (never the destructive one). |
| **Broadcast TV** | **Never renders.** Modals are interactive primitives and broadcast is read-only ([`picker.md`](picker.md) / [`sheet.md`](sheet.md)); `--shadow` is `none` here regardless. |

---

## Accessibility floor

- A modal is a **`role="dialog"` + `aria-modal="true"`** surface, **labelled by its title** (`aria-labelledby`); a destructive confirm adds **`aria-describedby`** pointing at the consequence sentence ("This archives the operation and returns all equipment"). VoiceOver / TalkBack announces **"[Title], dialog"** on open, and the background goes inert to the reader until it closes ([`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts).
- **Focus trap — a v4 requirement.** Focus enters on open, **cycles within** the dialog until dismissed, then **returns to the control that opened it** (never `<body>`). This closes the v3 gap where Tab escaped a modal to the inert background (`app.js:3695` restores focus but does not trap) — [`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard. **Esc always cancels.**
- **The background is `inert`** while the modal is open (applied to `#mainApp`), not merely dimmed — neither the reader nor the keyboard can reach it.
- **The destructive default is Cancel.** A keyboard or screen-reader user lands on the safe action; firing the destructive one takes a deliberate move to it. Backdrop tap and Esc resolve to that same cancel.
- **Touch targets:** primary actions ≥ 56pt operational (≥ 48pt on a non-operational surface such as a Settings delete), ≥ 120pt wide, 8pt dead zone between adjacent buttons ([`spacing-grid.md`](../07-design-system/spacing-grid.md) §Touch targets).
- **Reduced motion:** the modal appears instantly (no rise, no scrim fade-in); the title and danger styling carry the state, so nothing is lost ([`motion.md`](../07-design-system/motion.md)).
- **Screen-reader scripts** (per the [`accessibility.md`](../07-design-system/accessibility.md) registry grammar — *Role · Name · State · Action hint*): the destructive confirm announces **"Button, End Operation — archives this operation."**; Cancel announces **"Button, Cancel."** Activating either commits the matching dismissal. Consolidated in [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts.

---

## Anti-patterns (do not do these)

- **"Are you sure?" on a reversible action.** Reversibility handles regret — slide-to-advance + step-back, or a sheet that dismisses uncommitted ([ADR-010](../11-decisions/ADR-010-status-commit-model.md); Principle 6).
- **The destructive action as the default, the Enter action, or the backdrop action.** One stray input must not end an operation.
- **Stacked modals.** One at a time; a second is a focus-trap hazard.
- **A centered modal for an everyday non-destructive choice.** Out of thumb reach with a glove — that is a sheet ([`sheet.md`](sheet.md)).
- **A bare `alert()` / `confirm()`.** The v3 debt (29 calls) does not carry forward; use the modal primitive, or the [toast](toast.md) for the reversible.
- **A form modal taller than the viewport with no internal scroll.** Use the `.modal-scrollbody` pinned header/footer so the actions never scroll off.
- **Color-only danger.** The danger button needs a verb and an icon, not just red (Principle 9).
- **A modal with no focus trap or no inert background.** Tab escapes to the surface the operator was told to stop and decide before touching.
- **Re-deriving the scrim value.** It is `--scrim` now ([`color.md`](../07-design-system/color.md)); never hard-code `rgba(0,0,0,…)`.

---

## Open questions for downstream

1. ~~**`--shadow-modal` is not yet minted.**~~ **Resolved (2026-06-07):** minted in [`color.md`](../07-design-system/color.md) §Strokes & elevation — a *centered* downward cast (Light `0 8pt 32pt /.12` · Dark `/.32` · Sunlight `0 4pt 16pt /.20`; Broadcast none), distinct from `--shadow-sheet`'s bottom-anchored `0 -Npt …` geometry. (#184 minted the shared `--scrim`; the [ADR-011](../11-decisions/ADR-011-color-token-system.md) §Addendum mints the modal's own shadow.)
2. **When a full-screen form stops being a modal and becomes a screen.** At enough size / step-count, Start Operation may be better as a pushed full-screen route than an overlay — an IA decision per screen ([`08-information-architecture`](../08-information-architecture/), Phase F).
3. **"Type-to-confirm" for the most catastrophic deletes** (e.g. delete a department with live operations). Likely overkill against the danger-default rule, but flagged for the gate.
4. **Who may confirm a destructive action.** The destructive/reversal authorization model (owner / admin / member / IC) is the D7 auth work ADR-010's consequences already name; the modal renders whatever that model permits.

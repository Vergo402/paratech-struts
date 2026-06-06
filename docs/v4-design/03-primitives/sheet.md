# UI Primitive: The Sheet

> Phase E primitive spec. The **bottom-anchored slide-up surface.** Authored at the depth of [`picker.md`](picker.md).
> Source: essay [`05-essays/02-visual-language.md`](../05-essays/02-visual-language.md) "Motion Doctrine" (the sheet as an *origin* animation — it comes from the edge it lives on) + [`06-synthesis.md`](../06-synthesis.md) §1.5 (wet-screen / gloved interaction). Grounded in the **real v3 bottom sheet** — the plate connector picker (`style.css` `.plate-option-grid`, hardened for iOS in v3.5.1) — the way [`card.md`](card.md) is grounded in v3's `renderResults()`. The sheet mints **no tokens**; every value is owned by a sibling and cited: `--radius-sheet` + `--shadow-sheet` ([`spacing-grid.md`](../07-design-system/spacing-grid.md) §Corner radius / §Elevation), `--motion-transition` + `--ease-standard` ([`motion.md`](../07-design-system/motion.md)). Distinct from [`modal.md`](modal.md) (center surface, destructive stop).

---

## Purpose

A sheet is a surface that **slides up from the bottom edge of the screen and stops partway**, holding one focused task — a picker, a short form, a set of actions — while the parent screen stays visible and dimmed behind a scrim. It is the app's default overlay: when the operator needs to choose or enter something without leaving where they are, the surface rises from the bottom and they never lose their place.

The bottom edge is not an aesthetic choice. **The phone is the floor** ([`motion.md`](../07-design-system/motion.md)), and the operator is holding it one-handed with a structural glove. The bottom third of the screen is the only region a thumb reaches without a grip shift, so the surface that asks for a decision lives where the thumb already is. A dialog centered on the screen — reachable only with a second hand — is the wrong primitive for a gloved choice. That is what [`modal.md`](modal.md) is for, and it is reserved for the rare destructive stop, not the everyday decision.

**Sheet vs. modal is a rule, not a judgment call** — the same discipline [`picker.md`](picker.md) imposes on its variants:

| Use a **sheet** when… | Use a **modal** when… |
|---|---|
| Choosing, entering, or reviewing — non-destructive | Confirming something destructive or terminal |
| The parent screen should stay in context behind it | The operator must stop and decide before anything else |
| It is the everyday rhythm of an operation | The action is rare and consequential |
| The content fits a short form or a single choice | The content is a form too large for a 60vh sheet (Start Operation, Add Shore Point) |
| Base-plate picker, role assignment, wood size, Assign Equipment, action lists | End Operation, un-deploy a strut, un-return equipment, delete |

If the action is reversible and routine, it is a sheet — and the doubt-free escape principle (Principle 6) carries it: a sheet never asks "Are you sure?"; the operator dismisses it and nothing committed.

---

## The variants

v4 ships three sheet variants. Which one you reach for is determined by the content, not by taste.

| Variant | Holds | Example | Commit |
|---|---|---|---|
| **Standard sheet** | A short form, a set of actions, or contextual content | Assign Equipment; an action list; a non-destructive review | A form shows one **Apply / Done**; an action list commits on tap |
| **Picker sheet** | The [`picker.md`](picker.md) "bottom sheet picker" variant (5–7 single-select options) | Wood size, incident Level, role for assignment | **Commits immediately on tap**, then dismisses |
| **Visual-grid picker sheet** | The v3 plate / wood image-grid picker — **preserved verbatim** | Base-plate connector; footer / header wood | Commits on tap, dismisses |

All three are the **same shell** — handle, scrim, slide-up, dismiss gestures — differing only in what fills the body. The visual-grid variant is called out because, per [`picker.md`](picker.md) §Explicit Preservation, its **interaction is unchanged from v3.5.1**; this doc specifies the *container*, not a redesign. Eight or more options, or options needing search, is **not** a sheet — it is the picker's full-screen-list variant ([`picker.md`](picker.md)).

---

## Anatomy

| Property | Value | Token / source |
|---|---|---|
| Position | Fixed to the bottom edge, full width with 16pt side insets on phone; centered, capped at a readable max-width (v3: ~568pt) | v3 `.plate-option-grid` (`left/right: 16px; margin: 0 auto`) |
| Max height | **60vh** — never taller; the body scrolls inside | v3 `max-height: 60vh` |
| Corner radius | **Top two corners only** (bottom flush to the screen edge) | `--radius-sheet` (16pt) — [`spacing-grid.md`](../07-design-system/spacing-grid.md) |
| Drag handle | **64pt** affordance centered at the top edge | [`picker.md`](picker.md) rule 7 |
| Background | Elevated surface | `--surface-elevated` |
| Border | 1pt hairline (2pt under sunlight) | `--surface-stroke` / `--stroke-width` |
| Elevation | **A real cast shadow** — the one primitive allowed one | `--shadow-sheet` (per-theme: `0 -4pt 24pt …0.18` dark, `0 -2pt 16pt …0.08` light, `none` broadcast) — [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Elevation |
| Scrim | Backdrop dims the parent, **fades 0 → `--scrim` (40%)** with the slide | `--scrim` — [`color.md`](../07-design-system/color.md); timing in [`motion.md`](../07-design-system/motion.md) §What moves |
| Title (optional) | `--type-headline-2`; doubles as the dialog's accessible name | [`typography.md`](../07-design-system/typography.md) |
| Body padding | `--space-4` sides | [`spacing-grid.md`](../07-design-system/spacing-grid.md) |
| Row height | **56pt** (operational touch floor) for any tappable row | [`spacing-grid.md`](../07-design-system/spacing-grid.md) touch-target table |

The sheet is the one element with a real cast shadow because it genuinely overlays content — [`card.md`](card.md) keeps shadows *off* cards; [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Elevation grants the sheet its `--shadow-sheet`.

---

## Open / dismiss mechanics

- **Open.** The sheet translates `translateY(100%) → translateY(0)` over `--motion-transition` (**200ms**) on `--ease-standard`, and the scrim fades `0 → --scrim` (40%) simultaneously ([`motion.md`](../07-design-system/motion.md)). 200ms, **not** 300ms: the operator is already waiting with a gloved thumb, and a slower sheet feels sluggish in exactly the workflow that can least afford it.
- **Dismiss — four equal paths:** backdrop tap · **drag the handle down** (past a velocity / displacement threshold) · **Esc** (keyboard) · **system back** (Android). All four commit the same dismissal.
- **Single-select commits immediately and self-dismisses** (picker rule 2); the parent reflects the new value the instant the sheet closes. **No "Save / Cancel / Are you sure?"** on a single-select or non-destructive sheet (Principle 6). A multi-field form shows one primary **Apply / Done**.
- **One sheet at a time.** Opening a second dismisses the first — sheets never stack. Stacked overlays are a stacking-context and focus-trap hazard, and they bury the parent the sheet promised to keep in view.
- **Reduced motion / broadcast.** The sheet **appears**, it does not slide — every `--motion-*` collapses to `--motion-instant` ([`motion.md`](../07-design-system/motion.md)). Broadcast never renders a sheet at all (see Surface adaptations).

---

## iOS reliability — carried forward from v3.5.1, not re-derived

The v3 plate picker was hardened for iOS Safari across several patches. v4 inherits that hardening as **doctrine**, so the bottom sheet does not regress bugs v3 already paid to fix:

- **Toggle `visibility` + `pointer-events`, never `display`.** v3 reveals the sheet with `.open { visibility: visible; pointer-events: auto }` over a default `visibility: hidden`. Swapping `display: none → block` drops iOS scroll position and breaks the open transition; `visibility` keeps the element laid out and scrollable.
- **`touch-action: pan-y`** on the sheet container — forces vertical pan handling and stops Safari from reading an upward swipe as a page-level gesture (pull-to-refresh).
- **`transform: translateZ(0)`** — promotes the sheet to its own compositing layer so iOS scrolls it as a layer transform instead of trying to scroll the page underneath it.
- **`overscroll-behavior: contain` + `-webkit-overflow-scrolling: touch`** — the body scrolls; the scroll does not chain to the page behind the scrim.
- **Escape the stacking context.** A sheet opened from *inside* a modal/overlay must move to `document.body` on open and back on close — the v3 `.modal-overlay` (z-index 100) traps fixed children, so a sheet rendered inside it is clipped. This is the v3 `openPlatePicker()` / `closePlatePickers()` behavior (`app.js`), recorded here so any v4 sheet that can open from within an overlay does the same.

---

## Universal rules

1. **The handle is taught once.** A 64pt drag handle sits at the top edge of every sheet; dragging it down dismisses. Learned on day one, never relearned ([`picker.md`](picker.md) rule 7).
2. **The scrim is always present and dismisses on tap.** A sheet with no scrim hides which screen it came from.
3. **Single-select commits on tap; no confirm.** Reversibility, not confirmation (Principle 6; [`card.md`](card.md) rule 7).
4. **Never taller than 60vh on phone.** The parent must stay partly visible — that is the whole reason it is a sheet and not a screen.
5. **One sheet at a time; never stacked.**
6. **Destructive actions are not sheets — they are modals** ([`modal.md`](modal.md)). The everyday choice never wears the same surface as End Operation.
7. **Color is never the only signal inside a sheet** (Principle 9): a selected row carries a check + weight change, not just a fill, and the trigger shows the chosen value when collapsed ([`picker.md`](picker.md) rule 3).

---

## Surface adaptations

| Surface | Sheet behavior |
|---|---|
| **Phone (team officer)** | The canonical bottom sheet. Full width (16pt insets), `max-height: 60vh`, scrim over the parent, swipe-down dismiss. The thumb-reach primitive. |
| **Tablet (command post)** | Becomes a **center popover anchored to the triggering control** ([`picker.md`](picker.md) surface table) — a CP user is not thumb-reaching one-handed, and a bottom sheet on a 1024pt screen wastes the context. Same content, same commit rules; the scrim still dims the board. |
| **Laptop (Toughbook)** | A **floating panel** beside the trigger; **keyboard-first** — Esc dismisses, Tab cycles, arrow keys move within a picker, Enter commits (see Accessibility). |
| **Broadcast TV** | **Never renders.** Sheets are interactive primitives and broadcast is read-only ([`picker.md`](picker.md) / [`card.md`](card.md)); the current value renders large, the sheet affordance does not. `--shadow-sheet` is `none` here regardless. |

---

## Accessibility floor

- A sheet is a **`role="dialog"` + `aria-modal="true"`** surface, **labelled by its title** (`aria-labelledby`); with no visible title it carries an `aria-label`. VoiceOver / TalkBack announces **"[Title], dialog"** on open ([`accessibility.md`](../07-design-system/accessibility.md) registry).
- **Focus trap — a v4 requirement.** Focus enters the sheet on open and **cycles within it** until dismissed, then **returns to the control that opened it** (never to `<body>`). This closes the v3 gap where Tab could escape a modal to the inert background ([`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard). **Esc always dismisses** — there is no focus trap without an escape.
- **Assistive tech cannot drag** — the parallel of "assistive tech cannot slide" ([`accessibility.md`](../07-design-system/accessibility.md)). The swipe-down handle is an **enhancement, never the only path**: every sheet exposes a focusable, labelled **"Close"** control (plus backdrop tap and Esc) that commits the identical dismissal. The handle is a real `role="button"` with an accessible name, not a bare visual nub.
- **Touch targets:** handle and any in-sheet primary action ≥ 56pt (operational floor); rows ≥ 56pt; 8pt dead zone between adjacent targets ([`spacing-grid.md`](../07-design-system/spacing-grid.md)).
- **Reduced motion:** the sheet appears instantly (no slide, no scrim fade-in); color and label carry the state, so nothing is lost ([`motion.md`](../07-design-system/motion.md)).
- **Power Select fallback.** When VoiceOver / TalkBack is active or "Native Controls" is on, a **picker sheet** falls back to the OS-native `<select>` ([`picker.md`](picker.md) / [`accessibility.md`](../07-design-system/accessibility.md)) — a screen reader gets real platform semantics, never a custom surface faking them.
- Per-control VoiceOver / TalkBack scripts are consolidated in [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts.

---

## Anti-patterns (do not do these)

- **A centered dialog for an everyday choice.** Out of thumb reach with a glove. Bottom sheet, not modal.
- **A sheet taller than 60vh**, or a full-height sheet that hides the parent — that is not a sheet; an oversized *list or choice* becomes the full-screen list ([`picker.md`](picker.md)), an oversized *form* becomes the full-screen-form [`modal.md`](modal.md).
- **Stacked sheets.** One at a time; a second dismisses the first.
- **"Are you sure?" on a non-destructive sheet.** Reversibility handles regret (Principle 6).
- **Toggling `display` to show / hide.** Drops iOS scroll and the transition; use `visibility` + `pointer-events`.
- **A handle with no button equivalent.** Locks out every assistive-tech and keyboard user (*assistive tech cannot drag*).
- **A sheet with no scrim.** The operator loses which screen it overlays.
- **Re-styling the plate / wood picker.** Visual polish only; the v3 interaction is preserved ([`picker.md`](picker.md)).
- **A drop shadow on a card to imitate a sheet.** Shadows belong to sheets and modals only ([`card.md`](card.md)).

---

## Open questions for downstream

1. ~~**Scrim is not yet a named token.**~~ **Resolved (#184):** the sheet and modal share one scrim, now minted **once** as `--scrim` in its owner [`color.md`](../07-design-system/color.md) (per theme: 40% light/dark, 55% sunlight; none in broadcast) — neither primitive mints it. The fade *timing* stays with [`motion.md`](../07-design-system/motion.md). Landed with [`modal.md`](modal.md).
2. **Swipe-down dismiss threshold.** The exact velocity / displacement that commits a swipe-down (vs. snapping back) is affordance geometry, finalized in the vertical slice (Phase H) — like the card's exact slide mechanics ([`card.md`](card.md) OQ1). The *principle* (drag the handle down, one sheet at a time, 200ms) is fixed here.
3. **Tablet popover anchoring.** Whether the center-popover variant tethers with a pointer/arrow to its trigger or floats free is an IA decision per screen (Phase F).

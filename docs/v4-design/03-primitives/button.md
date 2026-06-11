# UI Primitive: The Button

> Phase E primitive spec. The **action primitive** — a momentary control the operator presses to *do* one thing now. Authored at the depth of [`picker.md`](picker.md).
> Source: essay [`05-essays/02-visual-language.md`](../05-essays/02-visual-language.md) "Component Library" + [`06-synthesis.md`](../06-synthesis.md) §3.1 (one canonical action), governed by **Principle 4** (*one canonical action per state*) and **Principle 9** (*no mystery meat — no icon-only primary*). Grounded in the **real v3 button sprawl** — 32 button-shaped CSS classes and 66 `<button>` elements across `index.html` / `style.css` / `app.js`, the way [`badge.md`](badge.md) is grounded in v3's badge classes and [`card.md`](card.md) in `renderResults()`. The button cites its geometry from siblings (`--radius-button` / the touch-target table [`spacing-grid.md`](../07-design-system/spacing-grid.md), `--type-body-medium` [`typography.md`](../07-design-system/typography.md), `--motion-micro` [`motion.md`](../07-design-system/motion.md), the `--accent` / `--danger` palette [`color.md`](../07-design-system/color.md)) and **flags one token color.md must mint** — the on-accent foreground pair for a filled primary (`--on-accent`; see Anatomy + Open questions). Distinct from the nav tab, the segmented selector, the toggle, and the slide-to-advance control — see **The action boundary**.

---

## Purpose

A button is a **momentary control that performs one action** — assign equipment, log a hazard, start an operation, confirm a deletion. The operator presses it, the action fires, the button returns to rest. It owns no state of its own; it is a verb, not a setting. After the picker (which *chooses*) and the card (which *holds an object*), the button is the third foundational interactive primitive: the one that *acts*.

The reason v3 needs this doc is the reason [`picker.md`](picker.md) and [`badge.md`](badge.md) needed theirs: **the same conceptual thing looks different in a dozen places, and several things that are not buttons at all wear button markup.** v3 grew 32 button-shaped classes — `.btn` with seven color/size modifiers, plus `.fab-arc`, `.quick-start-fab`, `.nav-btn`, `.qty-btn`, `.system-toggle`, `.inv-qty-btn`, `.plate-picker-btn`, `.sp-edit-btn`, `.division-add-btn`, and more — each hand-tuned at its call site. Worse, many `<button>` elements are not actions: the bottom nav is a tab set (`role="tab"`), the quantity picker is a segmented selector (`role="radio"`), the strut-system filter is a multi-select chip set (`aria-pressed`), the inventory `±` is a stepper. They share a tag and nothing else.

v4 collapses the genuine buttons into a **small, ruled emphasis vocabulary** and **evicts everything that is not an action** to the primitive that actually owns it. The discipline is the system's promise kept once more: a button is one shape, three emphasis levels, one intent overlay — and if a control selects, navigates, or toggles instead of acting, it is not a button.

---

## The variants

A button's variant is its **emphasis** — how loud it is relative to everything else on the screen — and emphasis is set by the action's *role*, not by taste. v4 ships **three emphasis levels and one intent overlay.**

| Variant | When | Treatment | v3 origin |
|---|---|---|---|
| **Primary** | The one canonical action of the screen / sheet / modal (Principle 4) | Solid `--accent` fill, `--on-accent` text | `.btn-primary` (v3 blue fill) |
| **Secondary** | A supporting action present alongside the primary | Outline — `--accent` or neutral stroke, no fill | `.btn-outline`, `.btn-gold-outline`, `.btn-blue-outline` |
| **Tertiary** | Lowest-emphasis / inline / dismiss (Cancel, "Add", a suggestion's dismiss) | Text only — accent or neutral label, no fill, no stroke | Cancel buttons, `.btn-suggest-dismiss`, the small add affordances |
| **Destructive** *(overlay)* | A terminal or inventory-mutating action — End Operation, un-deploy, return-that-decrements | `--danger`, applied to a primary (fill) or secondary (text/outline) | `.btn-danger` |

**Destructive is an overlay, not a fourth emphasis level** — it swaps the accent for `--danger` on whichever emphasis the action already carries, the same way a severity badge swaps the status palette for the feedback palette ([`badge.md`](badge.md)). A destructive primary is a red-filled button; a destructive secondary is a red-outlined one. It never stands on its own emphasis ladder.

One **special form** is a button but constrained, specified in its own section below: the **icon button** (a glyph-only button, permitted for secondary/tertiary actions *only*, never primary — Principle 9). The **Advance / Step-back control** — the button twin earlier drafts paired with the card's slide gesture — is **retired by [ADR-026](../11-decisions/ADR-026-slide-only-status-commit.md)**: the slide is the only status commit path. The v3 **FAB / arc speed-dial is retired** — see *Icon buttons & the retired FAB*.

---

## The action boundary

**Button vs. not-a-button is a rule, not a judgment call** — the same discipline [`picker.md`](picker.md) imposes on its variants and [`badge.md`](badge.md) imposes with its read-only boundary. A button *performs an action and returns to rest.* Anything that selects, navigates, or holds a state is a different primitive wearing the same tag.

| It is a **button** when… | It is **not** a button when… |
|---|---|
| Pressing it *does* something — fires an action, opens a flow, commits a change | Pressing it *selects* one option from a set → **segmented** ([`segmented.md`](segmented.md)) |
| Its label is a verb the operator performs | It *switches which view is shown* → **navigation / tab** (a nav primitive) |
| It is momentary — returns to rest after the press | It holds an on/off state → **toggle** ([`toggle.md`](toggle.md)) |
| It owns no state; it triggers and resets | It advances the shore-point lifecycle by a deliberate slide → the **slide control** ([`card.md`](card.md) / [ADR-010](../11-decisions/ADR-010-status-commit-model.md)) |
| It acts within the app | It *navigates to a destination* (a URL, a document) → a **link** (`<a>`), not a `<button>` |

> **A button acts. If it selects, navigates, toggles, or holds state, it is not a button.**

The v3 elements this evicts, each to its true owner:

- **The bottom nav** (`.nav-btn` ×5, `style.css:145`; `index.html` `showTab(...)`) is a **tab set**, not five buttons — it switches which screen is shown and one tab is always selected. [`accessibility.md`](../07-design-system/accessibility.md) already scripts it as *"Tab, Operations, 2 of 4, selected"* — a tab role, confirming the boundary. The Operations/Cut-Table view switcher (`role="tab"` in `index.html`) is the same. These belong to the navigation primitive, not here.
- **The quantity picker** (`.qty-btn` 1–4, `role="radio"`, `style.css:946`) and **the theme picker** (`.theme-option`, `role="radio"`) **select one of a set** → [`segmented.md`](segmented.md). They look like button rows and behave like inline pickers — the *inline-segmented* picker variant from [`picker.md`](picker.md).
- **The strut-system filter** (`.system-toggle` gold / grey / lockstroke, `aria-pressed`, `style.css:424`) looks like the same button row but is **multi-select** — `toggleSystem()` toggles each independently and `getActiveSystemFilter()` returns an array (`app.js:404`), so it is **zero-or-many, not one-of-N**. A multi-select filter is **filter chips → [`input.md`](input.md)**, not a segmented control ([`segmented.md`](segmented.md) makes the same ruling and forwards it there). Only the *single*-select theme and quantity pickers above are segmented.
- **The inventory stepper** (`.inv-qty-btn` `±`, `style.css:639`) edits a numeric value → the numeric stepper in [`input.md`](input.md).
- **The slide-to-advance control** on a `ShorePointCard` is a *slide*, not a tap ([`card.md`](card.md)); a safety-consequential commit must not be a button a wet-screen ghost-tap can fire. It has **no button equivalent, visible or hidden** — the slide is the only status commit path ([ADR-026](../11-decisions/ADR-026-slide-only-status-commit.md)).
- **The assignment chip's `×`** removes an assignment → the interactive chip in [`input.md`](input.md) (already evicted there by [`badge.md`](badge.md)).

What *stays* a button: every `.btn-primary` / `.btn-outline` / `.btn-danger`, the modal/sheet **Close** (an icon button), the **plate-picker launcher** (`.plate-picker-btn` — a secondary button that opens a sheet; its *value display* follows [`picker.md`](picker.md) rule 3), and the per-card / per-row action affordances (`.sp-edit-btn`, `.ops-add-sp-btn`, `.division-add-btn`, `.org-card-btn`) — all re-sorted into the three emphasis levels by their role on the screen.

---

## Anatomy

| Property | Value | Token / source |
|---|---|---|
| Corner radius | **12pt** — matches the card, so a button reads as part of the card language | `--radius-button` — [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Corner radius |
| Height — non-operational | **48pt**, 120pt min width (Settings, department setup) | [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Touch targets (B-16) |
| Height — operational | **56pt** — every primary action during an active operation, all themes | [`spacing-grid.md`](../07-design-system/spacing-grid.md) (G-1 / G-17) |
| Height — sunlight status transition | **60pt** — the Advance control only | [`spacing-grid.md`](../07-design-system/spacing-grid.md) (B-6) |
| Height — tertiary / disclosure | **44pt** floor — disclosure contexts only, **never a primary** | [`spacing-grid.md`](../07-design-system/spacing-grid.md) (the WCAG floor, not a design target) |
| Horizontal padding | **16pt** (`--space-4`); a 4pt CSS hit-extension may pad the operational hit area past the visible edge | [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Touch targets |
| Inter-target spacing | **8pt** dead zone min, **64pt** center-to-center for adjacent primaries | [`spacing-grid.md`](../07-design-system/spacing-grid.md) (G-7) |
| Label | **14 / 500**, sentence case, an **imperative verb** | `--type-body-medium` ("button text") — [`typography.md`](../07-design-system/typography.md); voice → [`voice-and-tone.md`](../07-design-system/voice-and-tone.md) |
| Icon (when paired) | **16px** leading or trailing, supplemental to the word — never replacing it on a primary | `--icon-size-sm` — [`iconography.md`](../07-design-system/iconography.md) |
| Color — primary | `--accent` fill + **`--on-accent`** text | `--on-accent` — [`color.md`](../07-design-system/color.md) §The filled-primary foreground (per-theme, contrast-verified) |
| Color — secondary | `--accent` (or `--text-secondary`) stroke + label, transparent fill | [`color.md`](../07-design-system/color.md) |
| Color — tertiary | `--accent` or `--text-secondary` label, no fill, no stroke | [`color.md`](../07-design-system/color.md) |
| Color — destructive | `--danger` (fill for primary, label/stroke for secondary) | [`color.md`](../07-design-system/color.md) ("`--danger` is feedback, not a status") |
| Elevation | **none** — no drop shadow, ever; shadows belong to the sheet and modal | [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Elevation / [`color.md`](../07-design-system/color.md) |

The button shares the **card's 12pt radius** on purpose — a docked action reads as part of the surface it sits on, not a foreign object pasted over it ([`spacing-grid.md`](../07-design-system/spacing-grid.md): "cards and buttons share 12pt so a button reads as part of the card language"). Like the card, it carries **no shadow at rest**; emphasis comes from fill / stroke / weight, never elevation.

### The one token the button needed minted — `--on-accent` (now in `color.md`)

A **filled primary** needs a foreground that clears WCAG AA on the `--accent` fill, and the required foreground **flips by theme**: dark-theme `--accent` `#D4A017` is light gold (needs *dark* text); light-theme `--accent` `#8C6700` is dark gold (needs *light* text). White-on-gold and black-on-gold each fail in one theme — so the pair cannot be a fixed color. This was the button's lone token requirement, and [`color.md`](../07-design-system/color.md) §The filled-primary foreground **now mints it** — a per-theme `--on-accent` (Light `#FFFFFF` 5.18 · Dark `#1C1F23` 6.96 · Sunlight `#FFFFFF` 7.47; Broadcast renders no buttons), verified by [`wcag-contrast.mjs`](../07-design-system/wcag-contrast.mjs) — exactly as [`sheet.md`](sheet.md) flagged `--scrim` for [`modal.md`](modal.md) to mint. The primary's foreground is now defined.

---

## Emphasis & the one-primary rule

**Exactly one primary button per context** (Principle 4 — *one canonical action per state*). A screen, a sheet, a modal: each has at most one filled accent button, the action the operator is there to take. Everything else steps down — a supporting action is secondary, a dismiss is tertiary. Two filled primaries competing for the eye is the v3 kitchen-sink sin (Principle 4's rejected alternative), and it is the most common button mistake.

The pairing the operator sees most is a **confirm + cancel** in a modal ([`modal.md`](modal.md)): the confirm is the primary (or destructive primary), Cancel is tertiary. Never two equally-weighted buttons; the screen always says which one is the answer.

*Which* emphasis a given action earns on a given screen is partly a Phase F (information architecture) decision — there is one primary per screen, and which action wins it depends on the screen's purpose. The **vocabulary and the rules are fixed here**; the per-screen assignment is IA's to make (the same hedge [`card.md`](card.md) and [`badge.md`](badge.md) draw between primitive and placement).

---

## The default fill is the accent — exit the console

v3's primary button is **blue** (`.btn-primary { background: var(--blue); color: white }`, `style.css:210`), with **green** for save (`.btn-success`, `style.css:1536`) and **red** for danger. Three fill colors is the navy-and-red dispatch-console palette [`color.md`](../07-design-system/color.md) explicitly exits ("Navy + saturated red … is the dispatch-console look v4 exits"). v4 collapses it:

- **Primary fills with the one accent — gold.** v3's `--blue` primary becomes `--accent`. Gold is the single identity color; a button does not get to introduce a second ([`color.md`](../07-design-system/color.md) one-accent rule).
- **Green and blue stop being button colors.** `.btn-success` green and any blue primary are retired — green is the `secured` status hue, blue the `process` hue; they are the *lifecycle palette*, not button identity ([`color.md`](../07-design-system/color.md): "Success and info reuse the `secured` green and `process` blue hues" — as status, not chrome). Save Edit becomes an ordinary gold primary.
- **Emphasis is carried by fill → outline → text, not by color.** Three buttons of different importance are gold-fill, gold-outline, gold-text — not blue, green, grey.
- **The one sanctioned non-gold fill** is a button whose *sole job is to commit one lifecycle transition*: **Assign Equipment** wears `process` blue ([`card.md`](card.md) — the pending-card deploy action), because there the color is *information* (the state you are entering), not decoration. It is the lone exception, principled and narrow; every other primary is gold. (Lifecycle *advances* are the slide, not a button — so this is the only lifecycle button there is.)

---

## States

| State | Treatment | Source |
|---|---|---|
| **Rest** | The variant's fill / stroke / label | — |
| **Pressed** | A brief fill / opacity shift over `--motion-micro` (100ms, `--ease-micro`) — **no scale, no bounce**; a **light haptic on touch-start** ("the screen saw the touch") | [`motion.md`](../07-design-system/motion.md) §Duration ("Button press state") + §Haptics |
| **Committed** *(consequential actions)* | A **medium-impact haptic** on commit ("it went through") — the same confirmation channel as a status slide | [`motion.md`](../07-design-system/motion.md) §Haptics |
| **Disabled** | Muted fill + label, non-interactive; the **reason sits adjacent**, never hidden — a disabled primary with no explanation is a dead end | [`voice-and-tone.md`](../07-design-system/voice-and-tone.md) (*say why*) |
| **Loading / in-flight** | Inline indicator, **self-disabled to block a double-fire** (see below) | [`loading-state.md`](loading-state.md) |
| **Focus** | A visible focus ring (keyboard); v3's `:focus-visible` outline (`style.css:1414`) carries forward | [`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard |

Press motion is the *one* place a button is allowed to move — `--motion-micro` names "Button press state" as a legitimate job ([`motion.md`](../07-design-system/motion.md)). It is a fill/opacity change, **not** a scale or shake (the card's no-scale doctrine applies — scale on a control the operator is watching is noise). Under `prefers-reduced-motion` the press feedback drops to instant, but **the haptic survives** — a haptic is not motion and is the confirmation channel for an operator whose eyes are on the rubble ([`motion.md`](../07-design-system/motion.md) / [`accessibility.md`](../07-design-system/accessibility.md)).

### Double-fire guard — `guardClick` becomes intrinsic

v3 wraps its consequential actions in **`guardClick(this, fn)`** (`app.js:1946`, 13 call sites: End Operation, Save Settings, confirm-add, confirm-start) — a manual, opt-in debounce against the double-tap a wet screen or gloved thumb produces. v4 makes that protection **intrinsic to the button**: a button that triggers a consequential or async action **disables itself on press for the duration of the action** (entering the loading state), so double-fire protection is structural, not remembered per call site. The wet-screen ghost-tap that the slide-to-advance gesture defends against ([`card.md`](card.md)) is the same threat a button defends against here — the design just makes the defense automatic.

---

## The destructive button

A **destructive or terminal action** — End Operation, un-deploy a strut, a return that decrements inventory — is the `--danger` overlay on a primary or secondary button, and it is the one button class that **routes through a confirmation surface**. Per [ADR-010](../11-decisions/ADR-010-status-commit-model.md) and [`modal.md`](modal.md), everyday lifecycle advances commit immediately and reverse from the card (no confirm); only the destructive / inventory-mutating action raises a [`modal.md`](modal.md) confirmation before it fires. So a destructive button is **rare, always labeled with its exact consequence** ("End operation," not "Done"), and **always gated** — never a fast, unguarded path to data loss. The v3 `guardClick` on End Operation (`index.html` `cmdEndOpBtn`) is the seed of this; v4 pairs the intrinsic guard with the modal confirmation.

---

## The Advance / Step-back control — RETIRED (ADR-026)

Earlier drafts specified a focusable **"Advance to [next status]"** / **"Step back to [previous status]"** button pair as the slide's accessible equal, and the Phase G gate (OQ #37) escalated it to a visible phone control. **Both are retired by [ADR-026](../11-decisions/ADR-026-slide-only-status-commit.md)** — Alex's final KB-5 ruling at the Phase H gate ([#248](https://github.com/Vergo402/paratech-struts/issues/248)): the slide gesture is the **only** status commit path. No button twin renders beside the track, and no hidden AT/keyboard twin exists either — a status transition is not a button, anywhere, in any form. (The doubled control failed the gate drive; a button is also exactly the ghost-tappable commit surface the slide was chosen to eliminate.)

What remains in button territory around the lifecycle: **deploy (Assign Equipment), un-deploy, return, and End Operation are ordinary buttons/modals** with full keyboard/AT operability — the exception covers status transitions only. The gated slide's *reason* line and the commit announcements are owned by [`slider.md`](slider.md) §Accessibility floor.

---

## Icon buttons & the retired FAB

**Icon button** — a glyph-only button — is permitted for **secondary and tertiary actions only, never primary** (Principle 9 — *no mystery meat; icon-only buttons are forbidden in primary actions*). It is reserved for the small set of **universally recognized** glyphs (a Close `×`, a back chevron) and **always carries an `aria-label`**. The canonical instance is the modal / sheet **Close** (`.modal-close`, `style.css:1511`, already `aria-label`'d in v3) — registered in [`accessibility.md`](../07-design-system/accessibility.md) as *"Button, Close."* Any glyph not in the universally-recognized set gets a text label; a wrench or saw icon rides *beside* the word ("Assign Equipment" with the wrench, not the wrench alone — [`voice-and-tone.md`](../07-design-system/voice-and-tone.md) retires v3's "🔧 Assign Equipment" emoji for the [`iconography.md`](../07-design-system/iconography.md) set + word).

**The FAB and the arc speed-dial are retired.** v3 ships a floating action button family — `.quick-start-fab`, the radial `.fab-arc` / `.fab-arc-fill` / `.fab-arc-track` speed-dial, and the inventory quick-view `#qvFab` (`style.css`). v4 does **not** define a "FAB" as an emphasis variant:

- **The arc / speed-dial is a kitchen-sink toolbar** — multiple actions fanning from one floating control — which Principle 4 rejects outright. It does not return.
- **The quick-start FAB** backed the solo-IC quick-start mode that was **cut as scope creep** (plan §V "Removed from this list"). Gone with it.
- **A floating launcher is not a primitive** — where a screen genuinely wants a docked or floating action (the inventory quick-view is the live example), it is **just a button** placed by the information architecture (Phase F), subject to every rule here: labeled or universally-recognized-icon-with-`aria-label`, never the screen's *sole canonical primary* hidden behind a mystery glyph. The primary action lives in the layout, not floating over content.

---

## v3 grounding — 32 classes, one vocabulary, several evictions

v3 renders button-shaped UI from many call sites with no shared primitive and no boundary between an action and a selection. v4 re-sorts every one — **by what it does, not by its v3 markup:**

| v3 class(es) | v4 |
|---|---|
| `.btn-primary` (`style.css:210`, blue fill) | **Primary** (gold fill) |
| `.btn-outline`, `.btn-gold-outline`, `.btn-blue-outline` (`style.css:212`) | **Secondary** (outline) |
| Cancel / dismiss buttons, `.btn-suggest-dismiss`, the small add affordances | **Tertiary** (text) |
| `.btn-danger` (`style.css:211`, red) | **Destructive** overlay |
| `.btn-success` (`style.css:1536`, green), `.btn-purple` | **Retired as button colors** → Primary/Secondary; green/blue/purple are status hues, not button identity |
| `.btn-sm`, `.btn-xs`, `.btn-block` (`style.css:217/1432/1535`) | **Not variants** — height (48/56/60pt) and full-width are the touch-target + surface rules ([`spacing-grid.md`](../07-design-system/spacing-grid.md)), not ad-hoc size classes |
| `.btn-loading` (`style.css:1449`) | **Loading state** (intrinsic; doubles as the double-fire guard) |
| `guardClick(this, fn)` (`app.js:1946`, 13×) | **Intrinsic double-fire guard** — self-disable on consequential press |
| `.modal-close`, `.inv-qv-close` (`style.css:1511`) | **Icon button** (Close) — `aria-label` mandatory |
| `.plate-picker-btn` (`style.css:1328`), `.sp-edit-btn`, `.ops-add-sp-btn`, `.division-add-btn`, `.org-card-btn`, `.legend-action`, `.reload-btn` | **Primary / Secondary / Tertiary or Icon button** by emphasis — not per-call-site classes |
| `.nav-btn` (`style.css:145`), the `role="tab"` view switcher | **Not a button** → navigation / tab |
| `.qty-btn` (`style.css:946`), `.theme-option` | **Not a button** → [`segmented.md`](segmented.md) (inline-segmented picker) |
| `.system-toggle` (`style.css:424`) — **multi-select**, `getActiveSystemFilter()` returns an array | **Not a button** → multi-select **filter chips**, [`input.md`](input.md) |
| `.inv-qty-btn` `±` (`style.css:639`) | **Not a button** → numeric stepper, [`input.md`](input.md) |
| `.fab-arc*`, `.quick-start-fab`, `#qvFab` | **Retired** — no FAB variant; a launcher is a button placed by IA, the arc speed-dial is a Principle-4 anti-pattern |

**The v4 gap this closes:** the every-button-styled-per-call-site inconsistency itself — one radius (`--radius-button`), one label token (`--type-body-medium`), one fill color (`--accent`), one danger overlay, three emphasis levels — applied everywhere, with the not-actually-buttons sent home to the primitives that own them.

---

## Universal rules

1. **A button acts.** If it selects, navigates, toggles, or holds state, it is a different primitive ([`segmented.md`](segmented.md) / nav / [`toggle.md`](toggle.md) / [`card.md`](card.md)). The action boundary is a rule.
2. **One primary per context** (Principle 4). At most one filled accent button per screen / sheet / modal; everything else steps down to secondary or tertiary.
3. **Emphasis is fill → outline → text, not color.** The three levels are gold-fill / gold-outline / gold-text. The only color swap is the `--danger` destructive overlay.
4. **No icon-only primary** (Principle 9). Icon buttons are secondary/tertiary, universally-recognized glyphs only, always `aria-label`'d. Every primary carries a word.
5. **The label is an imperative verb, sentence case, no emoji** ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md)) — "Assign Equipment," not "Equipment" or "🔧 Assign."
6. **Operational floor is 56pt** (48pt non-operational, 60pt the sunlight status transition; 44pt for tertiary disclosure only). 8pt dead zone between adjacent targets ([`spacing-grid.md`](../07-design-system/spacing-grid.md)).
7. **No shadow at rest.** Elevation belongs to the sheet and modal; a button is fill / stroke / weight ([`spacing-grid.md`](../07-design-system/spacing-grid.md) §Elevation).
8. **Press is micro motion + haptic, never scale.** `--motion-micro` fill shift + light haptic on touch-start, medium haptic on consequential commit; the haptic survives reduced motion ([`motion.md`](../07-design-system/motion.md)).
9. **Consequential actions self-guard against double-fire** — the button disables on press for the action's duration (the v3 `guardClick` made intrinsic).
10. **Destructive actions are gated and named.** A `--danger` button routes through a [`modal.md`](modal.md) confirmation and states its exact consequence ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)).
11. **Navigation is a link, action is a button.** A control that goes to a destination is `<a>`; a control that does something is `<button>` — correct semantics, so assistive tech announces the right affordance.

---

## Surface adaptations

The button is authored for the phone and inherited by the larger surfaces (Principle 2 — *designed for the role, not the device*); only size and the keyboard story flex.

| Surface | Button behavior |
|---|---|
| **Phone (team officer)** | 56pt operational floor; primaries are commonly full-width and **sit above the bottom safe-area inset**, never in it ([`spacing-grid.md`](../07-design-system/spacing-grid.md)). Labels never truncate — the operational reach demands the full word. |
| **Tablet (command post)** | Same vocabulary; buttons sit inline in toolbars and sheet footers at higher density. 56pt operational. No new variants. |
| **Laptop (Toughbook)** | **Keyboard-first** — visible focus ring, Enter / Space activates, Tab follows reading order with the primary reachable without hunting. Non-operational 48pt; the after-action surface is not a fireground. |
| **Broadcast TV** | **No buttons render.** Broadcast is read-only ([`picker.md`](picker.md) / [`card.md`](card.md) surface tables) — the action a button would trigger is unavailable; the board shows state, never a control. |

The **sunlight** theme thickens strokes 1pt → 2pt and bumps the label weight one step ([`color.md`](../07-design-system/color.md) / [`typography.md`](../07-design-system/typography.md)) so a secondary's outline and a button's label survive glare; the status-transition button grows to 60pt. The vocabulary is unchanged — a sunlight button is the same button, weightier.

---

## Accessibility floor

- **Every button announces as its role + verb** — *"Button, Assign Equipment"* — never a bare icon ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md) / [`accessibility.md`](../07-design-system/accessibility.md)). The button's scripts are registered in [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts.
- **No icon-only primary** (Principle 9). An icon button (Close, back) is secondary/tertiary, a universally-recognized glyph, and always carries an `aria-label`.
- **Link vs. button semantics are honored** — a navigating control is a real `<a>`, an acting control a real `<button>`, so the screen reader announces "link" vs. "button" correctly (a v3 gap, where `<button onclick>` navigates).
- **Keyboard parity** — Enter / Space activates; the delegated Enter/Space handler that makes `role="button"` elements operable (`app.js:8756`) is the v3 mechanism v4 inherits ([`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard). Focus order follows reading order; the primary precedes secondary controls (Principle 4).
- **Disabled is announced and explained** — a disabled button reads as unavailable with its reason adjacent ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md) *say why*); a loading button sets `aria-busy` and blocks re-press.
- **No button is the assistive-tech path for the slide commit** — the status slide is pointer-only ([ADR-026](../11-decisions/ADR-026-slide-only-status-commit.md), the recorded exception in [`accessibility.md`](../07-design-system/accessibility.md) §Assistive tech cannot slide); transitions announce through the card's polite live region. Every other consequential action stays a fully operable button.
- **The press haptic survives `prefers-reduced-motion`** — it is the non-visual confirmation channel for an operator who cannot watch the screen ([`motion.md`](../07-design-system/motion.md)).
- Touch targets and the inter-target dead zone are owned by [`spacing-grid.md`](../07-design-system/spacing-grid.md); this primitive obeys the 56pt operational floor.

---

## Anti-patterns (do not do these)

- **A second primary competing on the same screen** (Principle 4). One filled accent button; the rest step down.
- **A nav tab, a segmented selector, a filter, or a toggle dressed as a button.** The bottom nav is a tab, the theme/quantity pickers are segmented, gold/grey/lockstroke is a multi-select filter ([`input.md`](input.md)), the inventory `±` is a stepper — each goes to its own primitive (the action boundary).
- **An icon-only primary action** (Principle 9). Mystery meat fails the gloved, first-time, or non-visual operator. Every primary carries a word.
- **A FAB or arc speed-dial.** No floating-primary variant; a launcher is a button placed by IA, and the radial speed-dial is a kitchen-sink toolbar (Principle 4).
- **Emphasis by color** — a green "save," a blue "go," a purple "special." Emphasis is fill → outline → text; the only color swap is `--danger`.
- **Blue or green as a button fill.** They are the `process` / `secured` *status* hues, not button identity ([`color.md`](../07-design-system/color.md)). The primary is gold.
- **A raw hex or a fixed white/black label on the accent fill.** The foreground flips by theme — use the flagged `--on-accent`, not a hard-coded color.
- **Scale / zoom / bounce on press.** Press is a micro fill shift + haptic; motion that decorates is cut ([`motion.md`](../07-design-system/motion.md)).
- **A drop shadow to make a button "pop."** Elevation is the sheet's and modal's ([`spacing-grid.md`](../07-design-system/spacing-grid.md)).
- **A vague or cute label** — "Done," "Go," "Oops," "Let's start." The label is the exact imperative verb of the action ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md)).
- **An unguarded destructive button**, or one that does not name its consequence. Destructive routes through a confirmation and says exactly what it will do ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)).
- **A `<button>` that navigates** (or an `<a>` that acts). Semantics match the action so assistive tech announces the right affordance.

---

## Open questions for downstream

1. ~~**`--on-accent` must be minted in [`color.md`](../07-design-system/color.md).**~~ **Resolved (2026-06-07):** minted in [`color.md`](../07-design-system/color.md) §The filled-primary foreground — a per-theme foreground (Light `#FFFFFF` · Dark `#1C1F23` · Sunlight `#FFFFFF`), all clearing AA on the `--accent` fill and [`wcag-contrast.mjs`](../07-design-system/wcag-contrast.mjs)-verified. The button primitive has no remaining un-minted token dependency.
2. **Exact per-emphasis geometry.** Pixel padding, the secondary stroke weight, the tertiary's hit area, the focus-ring offset, and the press-state fill delta are affordance geometry finalized in the **vertical slice (Phase H)** — like the sheet's swipe threshold and the card's slide mechanics. The *vocabulary* (three emphasis levels + destructive overlay, one radius, gold fill, 56pt operational) is fixed here.
3. **The inventory quick-view launcher.** Retiring the FAB *variant* is settled; whether the Inventory screen keeps a floating quick-view *button* (and where it docks) is an information-architecture call (Phase F), not a primitive one. Flagged so the useful affordance is not silently dropped with the speed-dial.
4. **The loading-state form.** The exact in-flight indicator (inline spinner vs. progress vs. label swap) and its `aria-busy` timing are [`loading-state.md`](loading-state.md)'s to specify; this doc fixes only that a consequential button self-disables while in flight.

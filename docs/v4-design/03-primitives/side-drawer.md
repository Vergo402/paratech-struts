# UI Primitive: The Side-Drawer

> Phase E primitive spec — **the cascade's fifteenth file, added at the Phase F #217 gate** ([ADR-019](../11-decisions/ADR-019-side-drawer-primitive.md)). The **edge-anchored slide-in companion panel.** Authored at the depth of [`picker.md`](picker.md) / [`sheet.md`](sheet.md).
> Source: the Phase F [#217](https://github.com/Vergo402/paratech-struts/issues/217) gate (CH-3 / CH-4, Alex) — both checklist screens move from front-and-center destinations to "a small tab off to the side with a checkmark-box, which slides open" on demand. **Net-new** — no v3 antecedent and no Phase C essay proposed it; it is a deliberate primitive-cascade addition recorded in [ADR-019](../11-decisions/ADR-019-side-drawer-primitive.md). The side-drawer mints **exactly one token** — `--shadow-drawer` (the sideways-inward cast; the existing `--shadow-sheet` / `--shadow-modal` cast vertically only) — minted in its owner [`color.md`](../07-design-system/color.md) §Strokes & elevation and recorded in [ADR-011](../11-decisions/ADR-011-color-token-system.md) §Addendum; **every other value is owned by a sibling and cited** (`--scrim`, `--motion-transition` + `--ease-standard`, `--surface-elevated` / `--surface-stroke`, `--radius-sheet`, `--space-*`). Distinct from [`sheet.md`](sheet.md) (bottom surface, everyday choice) and [`modal.md`](modal.md) (center surface, destructive stop).

---

## Purpose

A side-drawer is a surface that **slides in from a vertical screen edge and holds a companion to the work** — a reference list or a secondary task the operator consults *while staying on the canvas*. It is summoned from a **persistent edge tab** (a small checkmark-box handle that lives on the edge), pulled open when needed, and pushed closed again — the main screen is never left behind. The canonical case is a **checklist** (the Task Level and IC Command attestation trees): the operator pulls it open to work through it, pushes it closed to see the board.

The side edge is not an aesthetic choice, and it is **not** the bottom edge. [`sheet.md`](sheet.md) lives at the bottom because the phone is the floor and a gloved thumb reaches the bottom third — a sheet is the surface that **interrupts** to ask for one choice, then leaves. A side-drawer is the opposite posture: a **persistent companion** you summon and dismiss repeatedly without it ever owning the screen. A bottom sheet that re-rises every time you want to glance at a checklist is the wrong primitive; so is a centered [`modal.md`](modal.md), which exists to **stop** the operator for a destructive decision. The drawer comes from the side because the side is where a persistent, always-available panel belongs — out of the canvas, one tab away.

**Side-drawer vs. sheet vs. modal is a rule, not a judgment call** — the same discipline [`picker.md`](picker.md) imposes on its variants:

| Use a **side-drawer** when… | Use a **sheet** when… | Use a **modal** when… |
|---|---|---|
| Consulting a companion **while staying on the canvas** | Choosing / entering **one** thing, then leaving | Confirming something **destructive or terminal** |
| A **persistent** affordance you open and close repeatedly | A **transient** surface summoned for a single task | A rare, consequential stop |
| The content lives **alongside** the work (a checklist, a reference) | The content **interrupts** the work briefly | The operator must **stop and decide** before anything else |
| Task Level Checklist, IC Command Checklist | Base-plate picker, role assignment, wood size, Assign Equipment | End Operation, un-deploy a strut, delete |

If the surface is something the operator returns to again and again while working — not a one-shot choice and not a stop — it is a side-drawer.

---

## The variant(s)

v4.0 ships **one** side-drawer variant — the **checklist drawer**. The drawer is a content-agnostic *container* (the shell — edge tab, slide-in, scrim/companion, dismiss gestures), so a later release may ride other companion content on it; only the checklist use is specified and shipped in v4.0.

| Variant | Holds | Example | Commit |
|---|---|---|---|
| **Checklist drawer** | A [`nested-checklist`](nested-checklist.md) attestation tree | Task Level Checklist ([#204](https://github.com/Vergo402/paratech-struts/issues/204)); IC Command Checklist ([#203](https://github.com/Vergo402/paratech-struts/issues/203)) | Leaf checks **tap-toggle in place** inside the drawer ([`nested-checklist.md`](nested-checklist.md)); the drawer itself commits nothing — it is a container |

The drawer specifies the *container*, not the checklist: the tree's depth, attestation, signing (role + time, D7.5), and one-section-open behavior are unchanged and owned by [`nested-checklist.md`](nested-checklist.md). This doc is the surface the checklist now lives **in**, the way [`sheet.md`](sheet.md) is the surface the plate picker lives in.

---

## Anatomy

| Property | Value | Token / source |
|---|---|---|
| Anchored edge | A **vertical screen edge — right by default** (thumb-reachable; left is a trivial mirror — see Open questions) | — |
| Edge tab (the affordance) | A **persistent** handle on the edge: a **checkmark-box icon + label**, ≥ 56pt, `role="button"`, showing open / closed state | [`spacing-grid.md`](../07-design-system/spacing-grid.md) touch targets; [`iconography.md`](../07-design-system/iconography.md) |
| Panel width | Phone: **near-full-width** (a sliver of canvas + scrim behind). Tablet / laptop: a **companion column** (~360–420pt) inset from the edge | `--space-12` (tablet edge inset) — [`spacing-grid.md`](../07-design-system/spacing-grid.md) |
| Height | **Full height** of the content area (top to bottom), the body scrolls inside | — |
| Corner radius | The **two corners facing the canvas** (the inner edge); the anchored edge is flush | `--radius-sheet` (16pt) — [`spacing-grid.md`](../07-design-system/spacing-grid.md) |
| Background | Elevated surface | `--surface-elevated` — [`color.md`](../07-design-system/color.md) |
| Border | 1pt hairline on the inner edge (2pt under sunlight) | `--surface-stroke` / `--stroke-width` |
| Elevation | **A real cast shadow, cast sideways/inward** from the anchored edge toward the canvas — the one direction `--shadow-sheet` (up) and `--shadow-modal` (down) do not cover | **`--shadow-drawer`** (per-theme; `none` broadcast) — [`color.md`](../07-design-system/color.md) §Strokes & elevation |
| Scrim | **Phone only:** the canvas sliver behind dims, fades 0 → `--scrim`. **Tablet / laptop: no scrim** — the canvas stays live beside the companion | `--scrim` — [`color.md`](../07-design-system/color.md); timing in [`motion.md`](../07-design-system/motion.md) |
| Title | The checklist name; `--type-headline-2`; doubles as the panel's accessible name | [`typography.md`](../07-design-system/typography.md) |
| Body padding | `--space-4` sides | [`spacing-grid.md`](../07-design-system/spacing-grid.md) |
| Row height | **56pt** (operational touch floor) for any tappable row | [`spacing-grid.md`](../07-design-system/spacing-grid.md) touch-target table |

The side-drawer joins the sheet and the modal as the **third surface allowed a real cast shadow**, because — like them — it genuinely overlays content. Its shadow is the one *direction* the existing tokens never needed: a sideways inward cast. That single missing value is why it mints `--shadow-drawer` and nothing else ([ADR-011](../11-decisions/ADR-011-color-token-system.md) §Addendum; [ADR-019](../11-decisions/ADR-019-side-drawer-primitive.md)).

---

## Open / dismiss mechanics

- **The tab is always present.** Unlike a sheet (summoned, then gone), the side-drawer's edge tab is **persistent chrome** on the active-operation screen — closed by default, showing a checkmark-box affordance. The operator opens and closes it as often as the work demands.
- **Open.** The panel translates `translateX(100%) → translateX(0)` (from the anchored edge) over `--motion-transition` (**200ms**) on `--ease-standard` — an *origin* animation, it comes from the edge it lives on, exactly as the sheet comes from the bottom ([`motion.md`](../07-design-system/motion.md)). On phone the scrim fades `0 → --scrim` simultaneously; on tablet / laptop there is no scrim (the canvas stays live).
- **Dismiss — equal paths:** **tap the tab again** (it toggles) · **swipe toward the anchored edge** (past a threshold) · **scrim tap** (phone) · **Esc** (keyboard) · **system back** (Android). All commit the same close, and focus returns to the tab.
- **The drawer commits nothing.** It is a container; the checklist inside tap-toggles its own leaves ([`nested-checklist.md`](nested-checklist.md)). There is no "Save / Cancel" on the drawer — closing it loses nothing (the checks are already committed in place).
- **One drawer at a time.** A screen has at most one side-drawer; it never stacks with another drawer.
- **Reduced motion / broadcast.** The panel **appears**, it does not slide — every `--motion-*` collapses to `--motion-instant` ([`motion.md`](../07-design-system/motion.md)). Broadcast never renders a drawer at all (see Surface adaptations).

---

## Companion, not interrupt — the load-bearing distinction

A side-drawer is a **companion**: it sits beside the work and the operator keeps working. A sheet and a modal are **interrupts**: they take the foreground until resolved. That difference drives every behavior above, and two consequences in particular:

- **On a large screen the canvas stays live.** Tablet / laptop render the drawer as a column **beside** the board, with **no scrim** — the IC can read the SitStat board and the IC Command Checklist at the same time. This is the whole point of a companion, and it is why the drawer is not just a sheet that opens sideways.
- **An interrupt may open over a companion.** If a [`sheet.md`](sheet.md) or [`modal.md`](modal.md) is summoned while the drawer is open, the interrupt layers **above** the drawer (it is the transient foreground; the drawer is the persistent companion). The drawer does **not** dismiss the sheet and the sheet does **not** dismiss the drawer — they are different layers. (On phone, where the drawer is near-full-width, it is the effective screen, and a sheet rises over it normally.) The "one sheet at a time" rule ([`sheet.md`](sheet.md)) is unchanged — it governs sheets, not the companion beneath them.

---

## Universal rules

1. **The tab is persistent and taught once.** A labeled checkmark-box tab lives on the screen edge; tapping toggles the drawer. Learned on day one, never relearned ([`picker.md`](picker.md) rule 7; the sheet's handle is the parallel).
2. **The tab carries a label, never a bare nub.** A checkmark-box **icon + text** — no mystery-meat edge sliver (Principle 9; [`button.md`](button.md) icon-button rule).
3. **Origin animation.** The panel comes from the edge it lives on (the sheet's rule, on the x-axis) — never a fade-in from nowhere ([`motion.md`](../07-design-system/motion.md)).
4. **Phone scrims; large screens are companions.** Phone dims the sliver behind (`--scrim`); tablet / laptop keep the canvas live beside the drawer (no scrim). The companion posture is the reason the primitive exists.
5. **The swipe is an enhancement, never the only path.** The tab, **Esc**, and a focusable **Close** all commit the identical close (*assistive tech cannot slide* — [`accessibility.md`](../07-design-system/accessibility.md)).
6. **It holds a companion, not a decision.** A destructive decision is a [`modal.md`](modal.md); a single everyday choice is a [`sheet.md`](sheet.md). The drawer is for consult-while-you-work content.
7. **Color is never the only signal** (Principle 9): the tab's open / closed state carries an icon + label change, not just a fill.

---

## Surface adaptations

| Surface | Side-drawer behavior |
|---|---|
| **Phone (team officer)** | A **near-full-width panel** from the right edge over a `--scrim`; the edge tab is a thumb-reachable handle; swipe-to-edge or tap-tab dismiss. The drawer is the effective screen while open. |
| **Tablet (command post)** | A **companion column beside the canvas** (~360–420pt), **no scrim** — the board stays live and readable. The IC reads SitStat and the IC Command Checklist together. The tab pins to the edge. |
| **Laptop (Toughbook)** | The companion column, **keyboard-first** — Esc closes, Tab cycles within it, focus returns to the tab; may be **pinned open** beside the deep-data view (see Open questions). |
| **Broadcast TV** | **Never renders.** A side-drawer is an interactive primitive and broadcast is read-only ([`badge.md`](badge.md) is the only primitive that renders there); `--shadow-drawer` is `none` on broadcast regardless. |

---

## Accessibility floor

- **Phone (scrimmed) = a `role="dialog"` + `aria-modal="true"`** surface, **labelled by its title** (`aria-labelledby`); VoiceOver / TalkBack announces **"[Title], drawer"** on open, and the canvas behind goes inert to the reader until it closes ([`accessibility.md`](../07-design-system/accessibility.md) registry).
- **Tablet / laptop (companion) = a non-modal labelled region** (`role="complementary"`, `aria-label` the checklist name): focus moves **freely** between the live canvas and the drawer — it is **not** focus-trapped, because the canvas beside it is genuinely interactive. **Esc** still closes it and **returns focus to the tab**.
- **Focus discipline.** In the modal (phone) case, focus enters on open and **cycles within** until dismissed, then **returns to the tab** (never `<body>`) — the v4 focus-trap requirement ([`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard). In the companion case, opening moves focus into the drawer's first control but does not trap it. **Esc always closes.**
- **Assistive tech cannot slide.** The swipe-to-edge dismiss is an **enhancement, never the only path**: the tab is a real `role="button"` with an accessible name, and a focusable **Close** control plus Esc commit the identical close ([`accessibility.md`](../07-design-system/accessibility.md)).
- **Touch targets:** the edge tab and any in-drawer primary action ≥ 56pt (operational floor); rows ≥ 56pt; 8pt dead zone between adjacent targets ([`spacing-grid.md`](../07-design-system/spacing-grid.md)).
- **Reduced motion:** the drawer appears instantly (no slide, no scrim fade-in); the tab's icon + label carry the open / closed state, so nothing is lost ([`motion.md`](../07-design-system/motion.md)).
- Per-control VoiceOver / TalkBack scripts are consolidated in [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts.

---

## Anti-patterns (do not do these)

- **A bare edge nub with no label.** Mystery meat — the tab carries a checkmark-box icon **and** text (Principle 9).
- **A drawer for a destructive decision** (→ [`modal.md`](modal.md)) **or for a single everyday choice** (→ [`sheet.md`](sheet.md)). The drawer is the persistent companion, not the interrupt.
- **A side drawer realized as a sheet that opens sideways.** The sheet is bottom-anchored doctrine ([`sheet.md`](sheet.md)) and an *interrupt*; the drawer is a *companion* with a live canvas on large screens. They are different primitives ([ADR-019](../11-decisions/ADR-019-side-drawer-primitive.md)).
- **Focus-trapping the companion on a large screen.** The canvas beside it is live; trapping focus defeats the companion posture (phone-scrim mode traps; companion mode does not).
- **A swipe with no tab / button equivalent.** Locks out every assistive-tech and keyboard user (*assistive tech cannot slide*).
- **Stacked drawers.** One drawer per screen.
- **A drawer with no shadow or inner-edge stroke.** Without `--shadow-drawer` + `--surface-stroke` it reads as part of the page, not an overlay (the parallel of the sheet's no-scrim / no-shadow anti-patterns).
- **A phone drawer with no scrim.** The operator loses which screen it overlays (mirror of [`sheet.md`](sheet.md)'s no-scrim anti-pattern).

---

## Open questions for downstream

1. **Swipe-to-edge dismiss threshold + peek geometry.** The exact velocity / displacement that commits a swipe-close (vs. snapping back), and any partial-peek behavior, is affordance geometry — finalized in the vertical slice (Phase H), like the sheet's swipe threshold ([`sheet.md`](sheet.md) OQ2) and the card's slide mechanics ([`card.md`](card.md) OQ1). The *principle* (origin slide, 200ms, tab-toggle, one at a time) is fixed here.
2. **Pinned-open companion on laptop.** Whether the tablet / laptop companion can be **pinned open** persistently (vs. always a toggle) is an IA / per-screen decision — confirmed for the checklists in [`22-task-level-checklist.md`](../08-information-architecture/22-task-level-checklist.md) / [`33-ic-command-checklist.md`](../08-information-architecture/33-ic-command-checklist.md), geometry to Phase H.
3. **Anchored edge — right vs. left, and handedness.** Right is the default (thumb reach for the dominant grip); whether a left-handed / per-operator flip is offered is a Phase H settings question, not a primitive decision. The doctrine (anchored to a vertical edge, origin animation inward) holds either way.

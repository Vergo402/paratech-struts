# UI Primitive: The Floating Panel

> Phase I primitive spec — **the sixteenth interaction primitive**, added during the Operations-board redesign ([ADR-037](../11-decisions/ADR-037-floating-draggable-panel.md)). A **free-floating, pointer-draggable companion that hovers over the board.** Authored at the depth of [`side-drawer.md`](side-drawer.md), its nearest sibling.
> **Deliberate deviation from the locked 15-primitive set — FLAG FOR THE PHASE J DOCTRINE AUDIT** (sibling of [#346](https://github.com/Vergo402/paratech-struts/issues/346)). Source: the Phase I Operations-board redesign (Alex) — the Details and Available-Inventory companions had been permanent docked columns that starved the shore-card board; the directive made the board dominant and the companions on-demand panels the user can **drag aside to read the cards underneath**. Mints **no token** — every value is owned by a sibling and cited (`--shadow-modal`, `--surface-elevated` / `--surface-stroke`, `--radius-sheet`, `--space-*`).

---

## Purpose

A floating panel is a surface that **hovers over the board and can be dragged anywhere within the work area** — a companion the operator summons, moves out of the way, reads, and dismisses, all without the board ever giving up its width. The canonical cases are the Operations **Details** (Quick View — the deployed shore's bill of materials, sources, safety) and **Available Inventory** glance.

It exists because the alternative — a docked companion column ([`side-drawer.md`](side-drawer.md) on desktop) — is *fixed in place* and *takes layout width*. On the Operations board both were true at once: two docked columns consumed ~56% of the screen and the board was left cramped, and a docked column cannot be slid aside to reveal the cards beneath it. The floating panel is the opposite: it takes **no layout width** (the board fills the stage) and the operator **drags it wherever the work needs it**.

**Floating-panel vs. side-drawer vs. sheet vs. modal is a rule, not a judgment call:**

| Use a **floating panel** when… | Use a **side-drawer** when… | Use a **sheet / modal** when… |
|---|---|---|
| A companion that must **float over** a full-width canvas and be **moved out of the way** | A companion **docked to an edge** beside the canvas | A transient **interrupt** (one choice / a destructive stop) |
| The board must stay **full width** (no column reserved) | A reserved companion column is acceptable | The operator must **stop** on the surface |
| The operator wants to **read the canvas underneath** by repositioning the panel | The companion stays put at the edge | — |
| Operations Details (Quick View), Available Inventory | Task Level / IC Command Checklist | Assign Equipment, End Operation, delete |

If the operator needs to see the canvas *under* the companion and the canvas must keep its full width, it is a floating panel. If a fixed edge column is fine, it is a side-drawer.

---

## Anatomy

| Property | Value | Token / source |
|---|---|---|
| Positioning | **`position: fixed`** — stays put in the viewport while the board scrolls beneath it; clamped to the scroll-pane bounds so it never covers the fixed header or bottom nav | — |
| Width | `clamp(320px, 28vw, 420px)` | [`spacing-grid.md`](../07-design-system/spacing-grid.md) |
| Height | Caps to the scroll-pane bounds (measured, inline); the body scrolls inside | — |
| Open position | Top-right of the bounds; a second panel opens one width to its **left** (side by side) where there's room, else a small diagonal cascade | — |
| Drag handle | The **header** (grip glyph + title + Close); `touch-action: none` | — |
| Corner radius | All four (it floats free of every edge) | `--radius-sheet` (16pt) |
| Background | Elevated surface | `--surface-elevated` |
| Border | 1pt hairline (2pt sunlight) | `--surface-stroke` / `--stroke-width` |
| Elevation | A real centered cast shadow — it genuinely overlays the board | **`--shadow-modal`** (reused; a docked column casts none) |
| Title | `--type-headline-2`; doubles as the panel's accessible name | [`typography.md`](../07-design-system/typography.md) |
| Z-order | Click-to-front: the last-touched panel rises above the other; base above the board, below scrim (290) / overlay (300) / picker (400) | — |
| Close | A focusable 44pt Close button in the header | [`spacing-grid.md`](../07-design-system/spacing-grid.md) |

The floating panel joins the sheet, modal, and side-drawer as a surface allowed a real cast shadow, because it genuinely overlays the board. It reuses `--shadow-modal` (the centered cast) rather than minting one — unlike the side-drawer's sideways `--shadow-drawer`, a floating panel is not anchored to any edge.

---

## Drag / position / z-order mechanics

- **Drag from the header.** Hand-rolled Pointer Events (the [`slider.md`](slider.md) / [`sheet.md`](sheet.md) `setPointerCapture` + `touch-action:none` idiom — no drag dependency). 1:1 transform-based move; the Close button stops propagation so a close-tap never starts a drag.
- **Clamped to the bounds.** The panel can't be dragged off-screen or under the header / bottom nav — `clampPanelPosition` keeps it inside the scroll-pane rect (a pure, unit-tested helper).
- **Click-to-front.** A pointer-down anywhere on a panel raises it above the other (a monotonic z counter — last-touched wins).
- **Two can coexist.** Details and Inventory open side by side and move independently; either can be dragged over the board to read the cards under the other.
- **Session-only position.** Where the operator parks a panel persists for the session (React state); it is **not** persisted to storage — pixel geometry goes stale on resize/surface change (localStorage persistence is a deferred enhancement, ADR-037).

---

## Surface adaptations

| Surface | Floating-panel behavior |
|---|---|
| **Phone (team officer)** | **Does not render** — the companion is the modal [`side-drawer.md`](side-drawer.md) (near-full-width, scrim, focus-trapped). There is no room to float a panel over a 375pt board, and phone is the floor (Principle 2). |
| **Tablet (command post)** | Floats over the board, draggable; the board keeps its full width and stays live beneath. |
| **Laptop (Toughbook)** | Same, mouse-first; the header is the grab handle, Close + Esc dismiss. |
| **Broadcast TV** | **Never renders** — an interactive primitive on a read-only surface. |

The phone↔desktop split is the same surface-adaptive mechanism the pickers use ([ADR-032](../11-decisions/ADR-032-surface-adaptive-pickers.md)): the caller renders a `FloatingPanel` at ≥768px and the modal `SideDrawer` below.

---

## Accessibility floor (matches side-drawer.md companion mode)

- **Non-modal** — `role="dialog"` with an accessible name (the title), **no `aria-modal`**: the board stays live, so there is **no scrim and no focus trap** (Tab can leave the panel; the canvas beside it is genuinely interactive).
- **Focus on open, restore on close.** Opening moves focus into the panel's Close; **Esc** (while focus is inside) closes and returns focus to the opener — via a **local** listener, not the overlay stack, so a layered sheet/modal/picker keeps its own Esc and the board is never inerted.
- **Drag is pointer-only; that is acceptable here.** A keyboard reposition is **deferred** — the panel never blocks the board and is fully usable (open / read / close) without moving it (the same posture as the [`accessibility.md`](../07-design-system/accessibility.md) "assistive tech cannot slide" exception: the capability the gesture adds is non-essential). The grip glyph is decorative (`aria-hidden`); Close is a real labelled button.
- **Touch targets:** Close ≥ 44pt; reuses the `--space-*` scale throughout.

---

## Anti-patterns (do not do these)

- **A floating panel on phone.** No room over a 375pt board — use the modal side-drawer (Principle 2).
- **A floating panel for an interrupt** (→ [`sheet.md`](sheet.md) / [`modal.md`](modal.md)) **or for an edge-docked companion** (→ [`side-drawer.md`](side-drawer.md)). The floating panel is the *movable over-the-board* companion, nothing else.
- **`position: absolute` within the board stage.** It scrolls away with a tall board and grows to the stage height — anchor it to the viewport (`fixed`), clamped to the scroll pane (ADR-037).
- **Dragging it off-screen or under the header / bottom nav.** The clamp keeps it inside the bounds; without it a panel is lost.
- **Focus-trapping it.** The board beside it is live; trapping defeats the companion posture.
- **A drag with no Close / Esc.** Locks out keyboard and assistive-tech users.

---

## Open questions for downstream

1. **localStorage-persisted position.** Whether the parked position survives a reload (clamped-on-load to the current bounds) — deferred; session-only for v4.0 (ADR-037).
2. **Keyboard reposition.** Optional arrow-key nudge while the handle is focused — deferred (non-essential; the panel never blocks the board).
3. **Phase J doctrine audit.** This primitive is a deliberate addition beyond the locked 15; the audit reconciles it with [`side-drawer.md`](side-drawer.md) and the primitive set ([ADR-037](../11-decisions/ADR-037-floating-draggable-panel.md)).

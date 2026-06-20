# ADR-037: Floating draggable companion panel (Operations board)

> Architecture Decision Record. Every committed design choice gets one.

---

## Status

- [x] Accepted

**Date:** 2026-06-20
**Author:** Phase I session (Operations board redesign)
**Reviewer(s):** Alex

---

## Context

The desktop/tablet Operations board ([`08-information-architecture/20-operations.md`](../08-information-architecture/20-operations.md)) rendered its two companions — the Quick View **Details** panel (ADR-019 / ADR-033) and the **Available Inventory** glance — as *permanent docked columns* (`.fs-drawer--dock`, `clamp(360px,32%,420px)` + `clamp(280px,26%,340px)`). Together they consumed ~56% of the width, leaving the shore-card board ~38% (as little as ~370px for a 2-column lane grid on a 1024px tablet). An empty dashed "Select a point's Details…" placeholder permanently reserved ~30% of a laptop screen for nothing, and the two tall bordered panels under the Operations/Cutting-Station segmented control read as *nested under it*. The board — the primary work surface (Principle 1: the fireground is the product) — stopped looking like the focus.

The locked 15-primitive set (`00-INDEX.md`) provides exactly one companion surface: the edge-anchored **SideDrawer** (ADR-019), which is either a phone modal or a desktop docked column. Neither posture lets the board own the full width *and* show a companion on demand.

Alex's directive: the board is the star; Details/Inventory should appear only when summoned and **float over the board, draggable anywhere**, so the user can move a panel aside to read the cards underneath.

---

## Decision

Add a **FloatingPanel** — a 16th interaction primitive: a non-modal, pointer-draggable companion that floats over the board (`position: fixed`, clamped to the scroll-pane bounds) — and use it as the desktop (≥768px) posture for the Operations Details and Available-Inventory companions; phone keeps the modal SideDrawer.

> This is a **deliberate addition beyond the locked 15 primitives** — flagged for the Phase J doctrine audit (sibling of [#346](https://github.com/Vergo402/paratech-struts/issues/346)).

---

## Rationale

- **The board reclaims the width.** With companions floating instead of docked, the board fills the stage (lanes go to a full 2-/3-column grid again). Net deletion of the permanent-column CSS; the empty placeholder is gone entirely.
- **Floating, not docked, is what the directive asked for.** A docked column can't be dragged aside to reveal the cards beneath it. A free-floating panel can, and two can sit side by side or be moved independently.
- **`position: fixed`, not absolute-within-stage.** An absolute panel anchored to the (very tall) board stage scrolls away as the board scrolls; a fixed panel stays put in the viewport while cards scroll beneath it — the persistent-reference behavior the companion needs. It is clamped to the `.fs-shell-main` scroll-pane rect so it never covers the fixed header or bottom nav.
- **Distinct from SideDrawer, so the doctrine boundary stays clean.** SideDrawer is the *edge-anchored* companion (ADR-019). Folding a third, free-floating, z-ordered posture into it would muddy that definition and make the Phase J audit harder. One file = one paradigm.
- **Reuses the proven idioms.** Drag is hand-rolled Pointer Events (the `Slider.tsx` / `Sheet.tsx` `setPointerCapture` + `touch-action:none` idiom — no new dependency). The clamp + z-order are a pure, unit-tested helper (`floatingPanelGeometry.ts`). Head/body chrome reuses `.fs-drawer-*`.
- **Phone stays the floor (Principle 2).** Float+drag is a ≥768px enhancement; below it the rail collapses to the existing filter chips and the companions are the unchanged full-screen modal SideDrawers.

---

## Alternatives Considered

- **Keep docked columns, just shrink them.** Rejected: even minimum-width docks (360+280) starve the board on a tablet, and a docked column can't be dragged aside to read the cards under it — the explicit requirement.
- **A desktop "float" mode bolted onto SideDrawer.** Rejected: a free-floating, dragged, z-ordered surface is a genuinely different interaction from an edge-anchored companion; overloading SideDrawer with a third posture blurs ADR-019 and the Phase J review.
- **`position: absolute` within the board stage (the first plan).** Rejected after live verification: the panel scrolled away with the tall board and grew to the stage height (~1100px). Fixed-to-viewport, clamped to the scroll pane, is correct.
- **localStorage-persisted panel position.** Deferred: pixel geometry goes stale on resize/surface change; session-only React state is enough. A clamped-on-load persistence is a later enhancement if the field asks.

---

## Consequences

- **Positive:** the board is the dominant region on every surface ≥768px; companions are on-demand and movable; the empty placeholder and two permanent columns are deleted.
- **Negative:** a 16th primitive beyond the locked set — recorded as a deviation, owed a Phase J doctrine-audit pass. Drag is pointer-only (no keyboard reposition in v1).
- **Neutral:** the Operations board moves from `.fs-ops-shell` (flex, still used by the read-only `PastOperationView`) to a new `.fs-ops-stage` grid; SideDrawer's desktop dock posture is now used only by the archive view.

### Accessibility floor (matches side-drawer.md)

- **Non-modal** (`role="dialog"` + accessible name, no `aria-modal`): the board stays live — no scrim, **no focus trap** (Tab can leave the panel).
- On open, focus moves into the panel's Close; **Esc** (while focus is inside) closes and restores the opener, via a *local* listener — not the overlay stack — so a layered modal/sheet/picker keeps its own Esc and the board is never inerted.
- The drag handle is the header; the grip glyph is decorative (`aria-hidden`). A **keyboard reposition is deferred** — the panel never blocks the board and is fully usable (open/read/close) without it (same posture as the ADR-026 "AT cannot slide" exception: the capability the gesture adds is non-essential).

---

## Related

- Principles: 1 (fireground is the product), 2 (phone is the floor), 9 (never color/state by one signal alone — the rail active row pairs accent with weight).
- Other ADRs: builds beside **ADR-019** (side-drawer — the edge-anchored companion this is distinct from), **ADR-032** (surface-adaptive primitives — same phone/desktop split mechanism), **ADR-033** (the sourced BOM the Details panel renders).
- Open questions resolved: none formally; realizes the desktop drilldown rail described in `20-operations.md` §Drilldown.
- Open questions surfaced: localStorage panel-position persistence; optional keyboard reposition.

---

## Notes

Verified live (preview MCP) at 1280 and 375: board-dominant default, two panels side-by-side over the board with grip + close, clamped within the scroll pane (clear of header and bottom nav), phone falls to the modal SideDrawer. Drag, click-to-front, and edge-clamp are exercised by the pure `clampPanelPosition` test and a pointerdown z-bump test; the actual pointer-drag is **verified manually** (the preview MCP forces the mouse branch and synthetic pointer drag is unreliable headless).

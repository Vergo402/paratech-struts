# IA Spec: Cutting Station

> Phase F information-architecture spec. Cites [`00-ia-foundation.md`](00-ia-foundation.md) for all cross-cutting rules and does not re-derive them.
> Source: [`06-synthesis.md`](../06-synthesis.md) §3.2 + Q7 (Cutting Station as a first-class v4.0 screen); recs **K-10**, **G-16**; [ADR-008](../11-decisions/ADR-008-nims-org-structure.md) (Cutting Station = a workstation under Operations); [ADR-010](../11-decisions/ADR-010-status-commit-model.md); [`03-primitives/card.md`](../03-primitives/card.md) (the `ShorePointCard` cutting state + off-queue red-slash); GitHub [#294](https://github.com/Vergo402/paratech-struts/issues/294). Grounded in v3 `renderCutTableView()` (app.js:7221), `renderCutTableCard()` (7287), `markCutDone()` (7382), `sendToRunner()` (7356), `returnEquipment()` (7770).

---

## Purpose

The cut-the-strut-to-length workstation: the queue of shore points whose struts need cutting, each showing the **one number the cutter acts on — the cut length** — so the saw operator works down the queue, marks each cut done, and sends it to a runner. It is the v3 "Cut Table" promoted from a hidden view-toggle to a first-class screen.

## Where it lives

- **Tab / parent:** **Operations** — a sub-screen / **workstation under Operations** (NIMS: a workstation card like Staging, [ADR-008](../11-decisions/ADR-008-nims-org-structure.md)), not a sixth tab ([ADR-014](../11-decisions/ADR-014-tab-structure.md)).
- **How it is reached:** a **sub-nav entry on the [Operations](20-operations.md) screen** (the v3 Operations↔Cut-Table view toggle becomes this entry) and as the cutter's default landing when assigned to the Cutting Station. It **replaces the v3 Cut Table view** wholesale.
- **Issue:** [#294](https://github.com/Vergo402/paratech-struts/issues/294).

## Primary role(s) and surface(s)

- **Primary role(s):** the **Cutting Station lead / saw operator** (the cutter). The Operations Section Chief / Shoring Group Supervisor monitor it.
- **Primary surface(s):** **phone is the floor** — the cutter works the queue and commits on a phone (K-10 requires phone-functional). **Tablet** is the natural cutting-table surface (bigger, props on the table) and adds **drag-reorder** (rec G-16); **phone is read-only order**. Broadcast can project the queue read-only.

## Information hierarchy (above / below fold) — per surface

### Phone (the floor)
- **Above fold:** persistent chrome; the **queue** — a single [`list`](../03-primitives/list.md) of cut cards in work order, the **first/next card at the top**, its **cut length the largest element on screen**.
- **Below fold:** completed-but-not-yet-sent cards, then sent-to-runner cards (read-only tail).

### Tablet (CP / cutting table)
- **Above fold:** the queue as a board with **drag handles for priority reorder** (G-16); a count of cuts remaining; the cut length glanceable across the table.
- **Below fold:** sent-to-runner tail.

### Laptop (Toughbook)
- **Above fold:** dense queue, keyboard-navigable (focus card + Advance/Step-back; reorder via keyboard); same ordering.

### Broadcast TV (read-only projection)
- The queue as a status-card grid at ≥ 32pt; **cut length is the largest element**; no drag, no slide, no input. No animation.

## Primary action + secondary actions

- **Primary action (one — Principle 4):** advance the cut through its workstation steps — **Mark Cut Done**, then **Send to Runner** — each a **slide-to-advance** on the card ([ADR-010](../11-decisions/ADR-010-status-commit-model.md), [`slider`](../03-primitives/slider.md)), **not the v3 buttons**. Role-gated to **Cutting** (IC / Safety override).
- **Secondary actions:** **priority reorder** (tablet drag / read-only on phone); **enter the actual cut length** (optional [`input`](../03-primitives/input.md)); **step back** (reverse slide).
- **Destructive / inventory-mutating:** none originate here — the inventory-decrementing return happens on the [Operations](20-operations.md) Shore Secured card. Advancing here never raises a confirm overlay.

## Composed primitives

- [x] [card](../03-primitives/card.md) — the **`ShorePointCard` in its `cutting` state**: cut length promoted (larger, bold, in the status hue), opening→expected-cut, deduction context, the slide. The **off-queue red-slash "Removed from cut list"** state lives here (see below).
- [x] [list](../03-primitives/list.md) — the queue (ordered, virtualized at scale); **drag-reorder is a tablet enhancement**, phone is read-only order.
- [x] [slider](../03-primitives/slider.md) — the Mark Cut Done / Send to Runner advance (and step-back).
- [x] [input](../03-primitives/input.md) — the optional **actual cut length** numeric/measurement field; surfaces the expected-vs-actual diff.
- [x] [badge](../03-primitives/badge.md) — the cutting status badge; an "actual ≠ expected" diff flag.
- [x] [empty-state](../03-primitives/empty-state.md) — the **"No cuts in queue"** state (rec K-4).
- [x] [segmented](../03-primitives/segmented.md) — the Operations↔Cutting-Station sub-nav entry.
- [ ] picker · sheet · modal · toggle · toast · loading-state · nested-checklist · warning-gate (not core here).

## The queue (v3's three sections → one ordered list)

v3 renders three stacked sections (`renderCutTableView()`): **Ready to Cut** → **Cut Complete · Send Runner** → **Sent to Runner** (read-only tail), ordered by `cuttingStartedAt` oldest-first. v4 keeps the meaning and tightens it:

- **One FIFO queue**, default-ordered by `cuttingStartedAt` (oldest first) — the cut that's waited longest is next. The three v3 groupings become **state within the queue** (awaiting cut → cut done, awaiting runner → handed off), carried by each card's status, not three separate headers.
- **Priority override (new in v4):** the lead can pull an urgent cut to the top. On **tablet**, drag the card (G-16); on **phone**, priority is **read-only** (the cutter works the order the lead set) — phone is the floor, drag-reorder is the enhancement.
- **The sent-to-runner tail stays visible, read-only**, until [Operations](20-operations.md) returns the equipment — faithful to v3 (the cutter sees what they've handed off).
- **Single station in v4.0.** This is **one** cut station's queue. When more than one saw station runs (Saw A / Saw B / …), routing each cut to a *named* station is a multi-station concern (OQ4) — workstation-instancing like running more than one Staging area, not v4.0.

## The cut card

- **Cut length is the one promoted number** ([`card.md`](../03-primitives/card.md) cut-table emphasis — v3 renders it 36px bold; v4 promotes via size + weight + the cutting hue, never a loud fill). Shown as **opening → expected cut** with the 1/8″ digit-pair fraction ([ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md), [`typography.md`](../07-design-system/typography.md)).
- **Optional actual-cut [`input`](../03-primitives/input.md):** the cutter may record what they actually cut; if it differs from expected, the card shows the **expected-vs-actual diff** (faithful to v3) as a [`badge`](../03-primitives/badge.md), not an error.
- **Deduction context** (header/footer/connectors) is available for the cutter to verify the math, demoted beneath the cut length.
- **Capacity is not shown** (demoted, [`00-ia-foundation.md`](00-ia-foundation.md)).

## Actions as v4 commits (the v3 buttons become slides)

| Step | v3 (button) | v4 |
|---|---|---|
| Cut finished | `Mark Cut Complete` button (`markCutDone()`) | **slide → Cut Done** (sets cut-done; stays in `cutting`); role-gated Cutting |
| Hand to runner | `Send to Runner` button (`sendToRunner()`) | **slide → Runner** (advances status; leaves the active queue, drops to the read-only tail); role-gated Cutting |
| Mistake / pull back | `← Send Back` (to Strut Set) on Operations | **step-back slide**; if it steps **out of `cutting`**, the card shows the **off-queue red-slash "Removed from cut list"** ([`card.md`](../03-primitives/card.md)) — **never silently vanishes** (Principle 10; this visible signal is new in v4 — v3 just removed it). |

The role gate (who may commit a cut) is the D7 authorization work; the screen renders a disabled affordance with a reason when the viewer lacks the role (faithful to v3's gated controls).

## Locked cross-cutting rules this screen honors

- [x] **Phone is the floor** — the full cut workflow works phone-only; drag-reorder is the tablet-only enhancement (G-16).
- [x] **Status = slide-to-advance, always reversible** ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)); AT gets Advance/Step-back buttons ([`accessibility.md`](../07-design-system/accessibility.md) §Assistive tech cannot slide).
- [x] **No silent removal** — off-queue = the red-slash card state, never a disappearance (Principle 10, [`card.md`](../03-primitives/card.md)).
- [x] **Measurements** — 1/8″ floored, digit-pair fractions ([ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md)).
- [x] **NIMS terminology** — Cutting Station is a workstation under Operations; runner is a task/resource, not an org box ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- [x] **Capacity demoted** — never shown on the cut card.
- [x] **Tap geometry** — 60pt status cards, 56pt actions, 8pt dead zones; the actual-cut field is a 56pt gloved input ([`input.md`](../03-primitives/input.md), [`spacing-grid.md`](../07-design-system/spacing-grid.md)).
- [x] **Modal-vs-sheet** per the ADR-016 Cutting Station row ([`00-ia-foundation.md`](00-ia-foundation.md)): advance = slide; reorder = drag (tablet) / read-only (phone); **no confirm overlay**.
- [x] **No safety-hold / no comms / no push** (Principle 10).
- [x] **Persistent Safety Officer + OP header**.

## The four-surface table (this screen)

| Dimension | Phone | Tablet (cutting table) | Laptop | Broadcast |
|---|---|---|---|---|
| Layout | single-column queue | board + drag handles | dense queue + keyboard | status-card grid |
| Above fold | next cut; **cut length largest** | cuts-remaining count; cut length glanceable | dense queue | cut length largest |
| Primary-action affordance | slide on card | slide + drag-reorder | slide + keyboard Advance/Step-back | — (read-only) |
| Added density | one cut focus | drag priority (G-16) | sortable, keyboard | — |
| Does NOT render | drag-reorder | — | — | slide, drag, input |

## Empty / error / loading states

- **Empty — no cuts queued:** the [`empty-state`](../03-primitives/empty-state.md) "all-clear"/first-run variant with specific copy — **"No cuts in queue"** + a line pointing back to Operations ("Move a shore point to Cutting to queue it") — faithful to v3's empty cut-table message, made specific (rec K-4).
- **Error:** a failed write queues locally (sync indicator), never `alert()`.
- **Loading:** local-first — renders instantly from local state; show nothing ([`loading-state.md`](../03-primitives/loading-state.md)).

## Accessibility / screen-reader notes

**Cite [`accessibility.md`](../07-design-system/accessibility.md), do not restate.**
- Each cut card's slide has focusable, labeled **Mark Cut Done / Send to Runner / Step back** equivalents (the "assistive tech cannot slide" contract) — registry in [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts.
- **Drag-reorder has a keyboard/AT equivalent** (move-up/move-down on the focused card) — the tablet drag is an enhancement, never the only path ("assistive tech cannot drag," [`accessibility.md`](../07-design-system/accessibility.md) / [`sheet.md`](../03-primitives/sheet.md) precedent).
- The off-queue red-slash conveys its meaning via the announced text "Removed from cut list," not the slash alone ([`card.md`](../03-primitives/card.md)).
- The actual-cut field announces label + value + the diff if present ([`input.md`](../03-primitives/input.md)).

## Open questions (per-screen)

1. **Priority-override model** — is reorder a free drag, or a small set of priority tiers? Free drag (G-16) is the default; tiers are an alternative if free order proves fragile at scale. Finalized in the Phase G cutting workflow.
2. **Exact slide gesture + drag threshold** — affordance geometry inherited from [`card.md`](../03-primitives/card.md) OQ1 / [`sheet.md`](../03-primitives/sheet.md) OQ2; finalized in the Phase H slice.
3. **Grouped cuts** — how a T-Shore group's three individual cuts present in the queue (each is an individual card post-cutting per the phase-split, [`20-operations.md`](20-operations.md)); ordering of group-mates finalized in the Phase G grouped-shore workflow.
4. **Multiple saw stations (Saw A / B / n…).** v4.0 assumes **one** cut station / queue. When a second+ saw station opens, each cut must be **placed at a named station** — per-station queues + cut routing are a multi-station design (workstation-instancing under Operations, like multiple Staging areas, [ADR-008](../11-decisions/ADR-008-nims-org-structure.md)); planned for the Phase G cutting workflow / future scale, not v4.0. (Raised by Alex at the #217 gate.)

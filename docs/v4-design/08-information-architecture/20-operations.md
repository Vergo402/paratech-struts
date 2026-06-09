# IA Spec: Operations

> Phase F information-architecture spec. Cites [`00-ia-foundation.md`](00-ia-foundation.md) for all cross-cutting rules (tab map, navigation, modal-vs-sheet row, four-surface framework, persistent chrome) and does not re-derive them.
> Source: [`06-synthesis.md`](../06-synthesis.md) §1.2, §2.7 (the card tear), §3.2; [`03-primitives/card.md`](../03-primitives/card.md) (the `ShorePointCard` is specified there — this spec composes it, it does not re-spec it); [ADR-010](../11-decisions/ADR-010-status-commit-model.md), [ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md); GitHub [#199](https://github.com/Vergo402/paratech-struts/issues/199). Grounded in v3 `renderOperations()` (app.js:5185), `renderShorePointCards()` (5257), `STATUS_ORDER`/`STATUS_LABELS` (714), `updateShoreStatus()` (6363), `getGroupMembers()` (6356), the drilldown (`renderBreadcrumb()` 6653 / `renderDrilldownTree()` 6542).

---

## Purpose

The live shoring job board: every shore point in the active operation, grouped by where it is in the seven-state lifecycle, so the team officer (and the CP) can see what is pending, in progress, being cut, and secured — and advance each one. It is the most-touched screen in the app during an incident.

## Where it lives

- **Tab / parent:** **Operations** — the tab home (per the [tab map](00-ia-foundation.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md)). Its sibling sub-screens under Operations are [Cutting Station](21-cutting-station.md), Task Level Checklist (#204), and the ORM/TCRM button-bar (#205).
- **How it is reached:** the Operations bottom-nav tab (default destination for the team officer). Drilldown happens *within* this screen; the [Cutting Station](21-cutting-station.md) is reached from a sub-nav entry here (it replaces the v3 "Cut Table" view toggle).
- **Issue:** [#199](https://github.com/Vergo402/paratech-struts/issues/199).

## Primary role(s) and surface(s)

- **Primary role(s):** the **team officer** in/near the structure (advancing shore points); the **Operations Section Chief** / **Group Supervisors** reading the board at the CP (NIMS titles spelled out — [ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- **Primary surface(s):** **phone is the floor** (the officer advances points one-handed, gloved). Tablet is the CP board; laptop adds density + keyboard; broadcast projects the board read-only.

## Information hierarchy (above / below fold) — per surface

### Phone (the floor)
- **Above fold:** persistent chrome (Safety Officer + OP-period header, sync dot — see [`00-ia-foundation.md`](00-ia-foundation.md) §Persistent chrome); the operation name + a **drilldown scope control**; then the **active-status lanes** — the lanes with work needing attention (Pending, In Process, Cutting, Runner) lead, each a [`list`](../03-primitives/list.md) section of [`ShorePointCard`](../03-primitives/card.md)s with a count.
- **Below fold:** later-lifecycle lanes (Shore Secured, Strut Equipment Returned), archived operations.

### Tablet (CP)
- **Above fold:** a **status-summary bar** with counts per lane (rec G-15 — phone omits this); lanes as a multi-column board; the drilldown tree expanded in the left rail (per [`00-ia-foundation.md`](00-ia-foundation.md) navigation table). Glance-across-the-room status read via the card's left stripe ([`card.md`](../03-primitives/card.md)).
- **Below fold:** archived operations.

### Laptop (Toughbook)
- **Above fold:** denser board, keyboard-navigable (arrow keys move the focus card; the command palette jumps to a shore point); the same lanes + summary bar; drilldown tree in the rail.

### Broadcast TV (read-only projection)
- Lanes render as a status-card grid at ≥ 32pt; the SP name + measurement are largest; status is the 4pt left border + label. **No interactive primitives** — no slide, no buttons, no overlays. No animation.

## Primary action + secondary actions

- **Primary action (one — Principle 4):** advance a shore point to its next status — a **slide-to-advance** on the [`ShorePointCard`](../03-primitives/card.md) / [`slider`](../03-primitives/slider.md) ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)). The exception is **Pending**, whose primary action is **Assign Equipment** (a deploy, not a slide — see below).
- **Secondary actions:** **Step back** (the reverse slide, below the track); **Add Shore Point** (full-screen-form modal); **Start / End Operation**; **Begin Briefing** — the [ORM / TCRM](23-orm-tcrm.md) crew-briefing entry, a button-bar action on this active-operation screen (not a navigated screen); drill into building → division → area; switch to the [Cutting Station](21-cutting-station.md). None competes with the slide for the card face.
- **Destructive / terminal / inventory-mutating:** **End Operation** and an inventory-decrementing **return** raise a [`modal`](../03-primitives/modal.md) confirm (the ADR-016 Operations row); everyday advances never confirm.

## Composed primitives

- [x] [card](../03-primitives/card.md) — **`ShorePointCard`** is the unit of this screen (status stripe + slide-to-advance + deployed-strut cradle-to-grave + hazard badge + group "N/total" badge + off-queue red-slash). One per shore point.
- [x] [list](../03-primitives/list.md) — the lanes are sectioned card lists; the drilldown is the tree/drill form; virtualized past the fold (the 250-SP K-15 scale rule).
- [x] [slider](../03-primitives/slider.md) — the slide-to-advance / step-back control the card hosts.
- [x] [segmented](../03-primitives/segmented.md) — the within-screen scope control (drilldown level / status filter); the Operations↔Cutting-Station sub-nav.
- [x] [sheet](../03-primitives/sheet.md) — **Assign Equipment** (a pending point's deploy surface, where its `RecommendationCard` alternatives live).
- [x] [modal](../03-primitives/modal.md) — Start Operation + Add Shore Point (full-screen form); End Operation + inventory-decrementing return (destructive/inventory-consequential).
- [x] [badge](../03-primitives/badge.md) — status badge (label + count), group badge, hazard badge.
- [x] [empty-state](../03-primitives/empty-state.md) — no active operation (first-run); a filtered drilldown with no points.
- [x] [button](../03-primitives/button.md) — Add Shore Point, Start/End Operation, breadcrumb.
- [x] [warning-gate](../03-primitives/warning-gate.md) — rides a deployed point carrying an unrated-zone / over-capacity strut (inherited from the `RecommendationCard` at deploy time).
- [ ] picker · input · toggle · toast · loading-state · nested-checklist (not core to this screen).

> **A new primitive would be a gate escalation, not a spec decision** — every behavior here composes the 14.

## The status lanes (the spine of the screen)

The shore point moves through the **seven v4 states** ([`card.md`](../03-primitives/card.md), [`color.md`](../07-design-system/color.md) status palette), displayed with the v4 labels ratified in [`voice-and-tone.md`](../07-design-system/voice-and-tone.md):

| # | Internal id | v4 display label | v3 label (changed) |
|---|---|---|---|
| 1 | `pending` | **Pending** | "Pending — No Equipment" |
| 2 | `process` | **In Process** | "In Process" |
| 3 | `strutset` | **Strut Set** | "Strut Installed" → renamed |
| 4 | `cutting` | **Cutting** | "Cutting" |
| 5 | `runner` | **Runner** | "Runner" |
| 6 | `secured` | **Shore Secured** | "Secured" → renamed |
| 7 | `returned` | **Strut Equipment Returned** | "Removed & Returned" → renamed |

- Points are grouped into **collapsible lanes in lifecycle order** (never alphabetical — [`list.md`](../03-primitives/list.md) doctrine), each with a **count badge**. Lane order follows `STATUS_ORDER` verbatim.
- Lane collapse is ephemeral per-session (faithful to v3 `laneCollapsedState`). Cards within a lane are newest-first.
- **Per-status card behavior is owned by [`card.md`](../03-primitives/card.md)** — this spec does not restate it. What this screen fixes is *which slide each lane commits* and *the role gate on it*:

| Lane | Primary action on the card | Role gate (IC / Safety override) |
|---|---|---|
| **Pending** | **Assign Equipment** (deploy → In Process) — a [`sheet`](../03-primitives/sheet.md), **not a slide** (reaching In Process *means* a strut was deployed; faithful to v3's Assign-Equipment button) | — |
| **In Process** | slide → **Strut Set** | — |
| **Strut Set** | slide → **Cutting** (and step-back → In Process) | — |
| **Cutting** | (advanced from the [Cutting Station](21-cutting-station.md): Mark Cut Done → Send to Runner) | Cutting |
| **Runner** | slide → **Shore Secured** | Runner (the v3 `mark-secured` gate) |
| **Shore Secured** | **Remove & Return Equipment** → Strut Equipment Returned — an inventory-decrementing [`modal`](../03-primitives/modal.md) confirm | Entry / Rescue / Shoring (the v3 `return-equipment` gate) |
| **Strut Equipment Returned** | none (terminal; de-emphasized — resolves [`card.md`](../03-primitives/card.md) OQ2: warm-neutral hue + reduced emphasis, collapsible archive lane, no opacity trick) | — |

The role-gate model (who may advance what) is the D7 authorization work; this screen renders whatever that model permits and shows a disabled affordance with a reason when it doesn't (faithful to v3's gated buttons + tooltip).

## The card-tear fix (K-5 / [`card.md`](../03-primitives/card.md) OQ3) — resolved here

v3 risked one card per fitting strut per shore point (synthesis §2.7 predicted a ~220-card tear at scale). **Resolution:** the Operations lanes render **exactly one [`ShorePointCard`](../03-primitives/card.md) per shore point** — never a `RecommendationCard` as a sibling in a lane. A **pending** point's fitting alternatives (the `RecommendationCard`s) appear **only inside the Assign Equipment [`sheet`](../03-primitives/sheet.md)** raised from that card, and in Quick Find ([#198](https://github.com/Vergo402/paratech-struts/issues/198), spec next session). `ShorePointCard` and `RecommendationCard` stay distinct data classes (Principle 12); they never share a lane.

## Drilldown (within-screen navigation, not a new level of nav)

- **Hierarchy:** building → division (numbered by floor) → area. **`assignedResource` is shown on the card, not a drill level** (NIMS rename: v3 `group` → **assignedResource**; the field stores an apparatus assignment, not a NIMS Group — [ADR-008](../11-decisions/ADR-008-nims-org-structure.md)). Building only appears when the operation is multi-building (faithful to v3 `getHierarchyLevels()`).
- **Phone:** push one level at a time with a **breadcrumb** back-path (`All › Div 2 › Area 3`); the tab bar stays mounted (per [`00-ia-foundation.md`](00-ia-foundation.md) navigation). Each drilldown row shows status pills + a count.
- **Tablet / laptop:** the drilldown renders as an **expanded sidebar tree** (the v3 desktop tree), so both the tree and the cards are visible — drilling **filters** the card pane, it does not navigate away.

## Grouped shore points (the phase-split, carried verbatim)

A shore type created with qty > 1 (e.g. a T-Shore ×3) shares a `groupId`; members render as **individual cards in the same lane** with a **"N/total" group badge** ([`card.md`](../03-primitives/card.md)). The v3.8/3.9 **phase-based split crosses unchanged**:
- **Pre-cutting** (Pending → In Process → Strut Set → Cutting) — a slide advances **all group members at once** (`getGroupMembers()`), and a step-back never regresses a mate already further along (the v3 `STATUS_ORDER` guard).
- **Cutting onward** (Cutting → Runner → Shore Secured → Strut Equipment Returned) — each piece advances **individually** (its own cut length, its own slide).
The card signposts which mode applies via the group badge; the full grouped-shore interaction is finalized in the Phase G workflow.

## Locked cross-cutting rules this screen honors

- [x] **Phone is the floor** — every lane, drill, and advance works phone-only.
- [x] **Status = slide-to-advance, always reversible** ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)); AT gets focusable Advance/Step-back buttons ([`accessibility.md`](../07-design-system/accessibility.md) §Assistive tech cannot slide).
- [x] **NIMS terminology** — spelled-out titles; `group` → **assignedResource**; the renamed status labels above ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [`voice-and-tone.md`](../07-design-system/voice-and-tone.md)).
- [x] **Capacity demoted** — the card never leads with rated capacity; it rides the deduction context only.
- [x] **Measurements** — 1/8″ floored, digit-pair fractions ([ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md)).
- [x] **No safety-hold / no in-app comms / no push** (Principle 10) — hazards show as a card badge; advancement is never gated on them.
- [x] **Tap geometry** — 60pt status cards, 56pt primary actions, 8pt dead zones ([`spacing-grid.md`](../07-design-system/spacing-grid.md)).
- [x] **Modal-vs-sheet** per the ADR-016 Operations row ([`00-ia-foundation.md`](00-ia-foundation.md)): Start Op + Add SP = modal; Assign Equipment = sheet; End Op + return = modal; advance = slide.
- [x] **No silent removal** — a card stepping off a queue shows the red-slash "Removed from cut list" ([`card.md`](../03-primitives/card.md); the off-queue state is read on the [Cutting Station](21-cutting-station.md)).
- [x] **Visible safety** — a deployed unrated/over-capacity strut carries its [`warning-gate`](../03-primitives/warning-gate.md) onto the card (Principle 7).
- [x] **Persistent Safety Officer + OP header** (IC-facing).

## The four-surface table (this screen)

| Dimension | Phone | Tablet | Laptop | Broadcast |
|---|---|---|---|---|
| Layout | single-column lanes | multi-column board + rail tree | denser board + rail + palette | status-card grid |
| Above fold | active lanes; scope control | summary bar (G-15) + board | summary bar + dense board | largest = SP name + measurement |
| Primary-action affordance | slide on card | slide on card; tablet drag affordances elsewhere | slide + keyboard Advance/Step-back | — (read-only) |
| Added density | one lane focus | counts-per-lane bar; tree expanded | sortable, keyboard nav | — |
| Does NOT render | — | — | — | slides, buttons, overlays |

## Empty / error / loading states

- **Empty — no active operation:** the first-run [`empty-state`](../03-primitives/empty-state.md) variant — set-glyph + "No active operation" + one primary **Start Operation** (faithful to v3's no-op state). Archived operations list below.
- **Empty — filtered drilldown:** the filtered [`empty-state`](../03-primitives/empty-state.md) variant with a clear-filter / breadcrumb-up action; settle before empty.
- **Error:** a write that fails surfaces inline / via the sync indicator (local-first means it's queued, not lost — [`00-ia-foundation.md`](00-ia-foundation.md)); never `alert()`.
- **Loading:** local-first — the board renders from local state instantly; show nothing. A first Firebase hydration on a cold device is the only real wait ([`loading-state.md`](../03-primitives/loading-state.md)).

## Accessibility / screen-reader notes

**Cite [`accessibility.md`](../07-design-system/accessibility.md), do not restate.**
- The `ShorePointCard` slide has focusable, labeled **Advance to [next] / Step back to [prev]** equivalents (the load-bearing "assistive tech cannot slide" contract) — script registry in [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts.
- Lanes are landmarks; each card announces *object · status · area* ("Shore point B-2, Cutting, Division 2"); status changes announce via `aria-live` (per [`card.md`](../03-primitives/card.md)).
- Drilldown rows are buttons with the level name + count; the breadcrumb is a navigable back-path → [`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard.
- Power Select applies to the Assign Equipment picker under VoiceOver/TalkBack-or-Settings.

## Open questions (per-screen)

1. **Exact slide gesture** (full-card swipe vs. a dedicated slide control) — inherited from [`card.md`](../03-primitives/card.md) OQ1; affordance geometry finalized in Phase G (Operations workflow) + the Phase H slice.
2. **Status-summary-bar contents at scale** — which counts the tablet/laptop bar shows beyond per-lane totals (e.g. hazards, unrated) — finalized with the Phase G board layout.
3. **Returned-lane archival** — whether Strut Equipment Returned auto-collapses into an archive group after the operation ends (resolves [`card.md`](../03-primitives/card.md) OQ2 direction; mechanics in the end-of-operation workflow, Phase G).

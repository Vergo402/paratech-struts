# IA Spec: Command / SitStat

> Phase F information-architecture spec. Cites [`00-ia-foundation.md`](00-ia-foundation.md) for all cross-cutting rules and does not re-derive them.
> Source: [`06-synthesis.md`](../06-synthesis.md) §1.10, §2.5 (command transfer), §2.7; recs C-1 (SitStat datums), C-6 (persistent Safety Officer), C-13 (broadcast layout), K-13 (role history); [ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [ADR-010](../11-decisions/ADR-010-status-commit-model.md), [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md); GitHub [#201](https://github.com/Vergo402/paratech-struts/issues/201). Grounded in v3 `renderCommand()` (app.js:5134), `renderDashboardStats()` (6990), role assignment (`openMyRoleModal` 3992, `roles` dict, `canPerformShoreAction` 2285), rosters (`renderAssignedApparatus` 5033, `renderExternalEquipmentList` 5096, `renderIndividualsList` 5114).

---

## Purpose

The Incident Commander's home: the one screen that answers "what is the state of this incident, and what needs my decision next?" Its home view **is SitStat** — six canonical datums above the fold — and it is the launch point for the org chart, the hazard log, command transfer, and resource assignment.

## Where it lives

- **Tab / parent:** **Command** — the tab home (per the [tab map](00-ia-foundation.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md)). **SitStat is this tab's home composition, not a separate screen** (rec C-1, §2.7 tear #3).
- **How it is reached:** the Command bottom-nav tab. From here, one tap opens the [Org Chart](31-org-chart.md) and one tap opens the [Hazard Log](32-hazard-log.md); the IC Command Checklist ([#203](https://github.com/Vergo402/paratech-struts/issues/203), future) also nests here.
- **Issue:** [#201](https://github.com/Vergo402/paratech-struts/issues/201).

## Primary role(s) and surface(s)

- **Primary role(s):** the **Incident Commander**; the **Operations Section Chief** and **Group Supervisors** read it (NIMS titles spelled out — [ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- **Primary surface(s):** **phone is the floor** (a solo IC runs command from a phone). Tablet is the canonical CP surface; laptop adds the after-action/audit depth; **broadcast** (deferred past v4.0 — tracked in #496, ruled 2026-08-17).

## Information hierarchy (above / below fold) — per surface

### Phone (the floor)
- **Above fold:** the **persistent chrome** — Safety Officer name + status, operational-period + elapsed (foundation §Persistent chrome, C-6) — then **SitStat**: the six datums (below).
- **Below fold:** one-tap entries to **Org Chart** and **Hazard Log**; **command transfer** (on the IC header); the **resource roster** (assigned apparatus / external / individuals / My Role); **End Operation**.

### Tablet (CP)
- **Above fold:** SitStat as a board — the per-status counts as a glanceable row; the org-chart **preview** to Section-Chief depth beside it (one tap to expand); Safety Officer + OP in the header.
- **Below fold:** rosters; hazard summary.

### Laptop (Toughbook)
- **Above fold:** denser SitStat + the command-palette jump; role-history / audit reachable.

### Broadcast TV (deferred past v4.0 — tracked in #496, ruled 2026-08-17)
- **Design** (read-only projection — the C-13 layout): **Left third:** the org chart to Section-Chief depth. **Center:** the shore-point status board (per-status counts). **Persistent header:** incident name + IC + Safety Officer + OP/elapsed. ≥ 32pt; no interactive primitives; no animation. **Build status:** not included in v4.0; implementation tracked in #496.

## Primary action + secondary actions

- **Primary action (one — Principle 4):** reach the next command decision — read SitStat and open the relevant detail (the **one-tap Org Chart / Hazard Log** entries are the canonical next steps).
- **Secondary actions:** **command transfer** (on the IC header); **role assignment**; **manage the resource roster**; **End Operation**.
- **Destructive / terminal:** **End Operation** = an IC-gated destructive [`modal`](../03-primitives/modal.md) (faithful to v3's live-`myRole` gate).

## Composed primitives

- [x] [card](../03-primitives/card.md) — the SitStat datum tiles; the org-chart **org-node** preview; base cards for roster entries.
- [x] [list](../03-primitives/list.md) — the resource roster (apparatus / external / individuals); the role-history list.
- [x] [badge](../03-primitives/badge.md) — the per-status counts, personnel count, role badges, the Safety-Officer status indicator.
- [x] [button](../03-primitives/button.md) — the Org Chart / Hazard Log entries; End Operation; roster add flows.
- [x] [sheet](../03-primitives/sheet.md) — **role assignment** (My Role; apparatus/individual → ICS position); roster add flows (Add Apparatus / External / Individual re-home here per ADR-016).
- [x] [modal](../03-primitives/modal.md) — **End Operation** (destructive, IC-gated).
- [x] [segmented](../03-primitives/segmented.md) — section scoping within Command if needed (roster vs. structure views).
- [x] [empty-state](../03-primitives/empty-state.md) — no active operation (first-run → Start Operation).
- [ ] picker · input · toggle · slider · toast · loading-state · nested-checklist · warning-gate (not core; the checklist screen owns nested-checklist).

> **Command transfer is not an overlay primitive** — see below (a full-screen takeover, not a sheet/modal).

## SitStat — the six canonical datums (rec C-1)

The Command home shows, above the fold, **exactly these six**, seeded by v3's `renderDashboardStats` (elapsed / apparatus / SP total / 7-status grid / progress) and reframed:

1. **Incident name** — the operation's name/location.
2. **Incident Commander** — name, with the **gold accent underline** (the one place the accent marks "who is in command").
3. **Safety Officer** — name + status, **in the persistent header** (C-6); one tap opens the [Hazard Log](32-hazard-log.md).
4. **Personnel count** — assigned apparatus + individuals.
5. **Shore-point counts per status** — the seven v4 statuses with counts (the v3 status grid; shares the [`20-operations.md`](20-operations.md) lane labels).
6. **Operational period + elapsed** — the OP indicator with the running clock.

Nothing competes with these six above the fold; everything else is a tap away.

**Amended 2026-08-17 per #491:** Hazard chip placement — a compact hazard chip (count + worst severity + location suffix) rides at the top of Command; the chip strip (Safety Officer + hazard) appears on Operations and Cutting headers; the Hazards entry row below the fold remains.

### SitStat scope — All incident vs. By Division ([#353](https://github.com/Vergo402/paratech-struts/issues/353), built)

The per-status board (datum 5) defaults to the **whole-incident** 7-status tally — unchanged. At Surfside scale the IC also needs to see *which Division is behind*, so a [`segmented`](../03-primitives/segmented.md) toggle above the board flips its scope:

- **All incident** (default) — the existing whole-incident 7-status board, untouched.
- **By Division** — a table, one **row per Division** (top-floor-first via `compareDivisionValues` / `divisionLabel`, with full-word accessible names), columns = the seven statuses (abbreviated headers — Pend / Assign / Set / Cut / Run / Secured / Ret'd) plus a **Total** column, and a bottom **"All divisions"** totals row equal to the whole-incident numbers.
  - **Lagging-Division flag:** the Division with the most shore points still at **Pending Equipment** (`pending`) gets a danger tint + an alert-triangle icon. Single, fixed heuristic — most-awaiting-equipment, ties broken by board order; no configurable scoring.
  - **Expand a Division row** to reveal its grouped shores (clustered by `groupId`; solo points are their own cluster) with per-group, per-status counts — a plain lazy expand/collapse.
- **Surface adaptation:** **phone** (the floor) opens By Division as a [`sheet`](../03-primitives/sheet.md) (an interrupt over the board); **desktop/tablet** (`useIsDesktop`, ≥768px, [ADR-032](../11-decisions/ADR-032-surface-adaptive-pickers.md)) renders it **inline** in the command rail.
- Soft-deleted points (`deletedAt != null`) are skipped in every tally, matching the board. Pure display of data already present — no new schema, no new data. The aggregation is a pure core function (`src/core/command/sitstat-rollup.ts`, `rollupByDivision`); the React view (`SitStatRollup`) stays thin.

**Amended 2026-08-17 per #491:** legend removed (per #434, reaffirmed as design decision); headers use full-word accessible names.

## Command transfer (§2.5)

v3 has **no transfer ceremony** — command moves implicitly when a device self-assigns the `ic` role, and the End-Op gate re-checks the live `myRole` each render. v4 adds an **explicit transfer ceremony**: a transfer affordance **on the persistent IC header** → a **full-screen takeover** (the ADR-016 Command row, not a stacked modal) where the outgoing IC initiates, carrying an **auto-assembled six-datum SitStat snapshot brief** (real content, no manual entry; doctrine-expanded ICS-201 fields v4.1). **It is a two-party handshake** ([ADR-021](../11-decisions/ADR-021-command-transfer-handshake.md)): the outgoing IC **retains command until the incoming IC accepts** — so the incident is **never** in a no-IC state and the End-Op gate is always satisfiable. The incoming IC sees a **pending-acceptance** state on the command surface (on next sync — **not a push**, Principle 10; the verbal "you have command / I have command" is on the radio); Cancel/Decline returns command to the outgoing IC. Both ends write **role-history** events (K-13: initiated-by → accepted-by, timestamped). Full flow in the Phase G command-transfer workflow.

## Role assignment & the resource roster

- **Role assignment** = a [`sheet`](../03-primitives/sheet.md): **My Role** (this device picks its ICS position, faithful to v3 `openMyRoleModal`); apparatus/individual → ICS position (feeds the [Org Chart](31-org-chart.md)). Role gates per `canPerformShoreAction` with **spelled-out NIMS names** ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- **The resource roster** (assigned apparatus / external equipment / individuals) is the **assignment surface** that populates org-chart positions; add flows are sheets (the v3 Command modals re-home per ADR-016).
- **Accountability-screen boundary:** Command owns **org structure + assignment**; the **[Accountability](41-accountability.md)** screen ([#297](https://github.com/Vergo402/paratech-struts/issues/297), under Inventory; renamed from "Roster") owns **accountability + per-row sync**. Same resources, two lenses — cross-ref, don't duplicate. (Resolved in the [Accountability](41-accountability.md) spec.)

## Locked cross-cutting rules this screen honors

- [x] **Phone is the floor** — a solo IC runs command phone-only.
- [x] **Persistent Safety Officer + OP header** on Operations / Cutting Station / Command (C-6, narrowed 2026-08-17 per #491 Q4).
- [x] **NIMS terminology** — titles spelled out, no acronyms ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)); `group` → **assignedResource**.
- [x] **No safety-hold / no in-app comms / no push** (Principle 10) — SitStat surfaces hazards/safety **visibly**; it never gates or signals.
- [x] **Status = slide-to-advance, always reversible** ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)) — Command reads status; advancing happens on the [Operations](20-operations.md) cards.
- [x] **Tap geometry** — 56pt one-tap entries; End-Op button ≥ 56pt with the destructive default-Cancel modal.
- [x] **Modal-vs-sheet** per the ADR-016 Command/SitStat row: transfer = full-screen takeover; role assignment + roster adds = sheet; End Operation = modal.
- [x] **Capacity demoted** — not a SitStat datum.
- [x] **Broadcast = read-only** (broadcast surface deferred past v4.0 — tracked in #496, ruled 2026-08-17).

## The four-surface table (this screen)

| Dimension | Phone | Tablet (CP) | Laptop | Broadcast |
|---|---|---|---|---|
| Layout | header + SitStat stack | SitStat board + org-chart preview | dense + palette + audit | left-third org chart · center status board (C-13) |
| Above fold | 6 datums | 6 datums + org preview | 6 datums + role history | incident · IC · SO · OP + the board |
| Primary-action affordance | one-tap Org Chart / Hazard Log | tap to expand panes | keyboard + palette | — (read-only) |
| Command transfer | header action → full-screen takeover | same | same | — |
| Does NOT render | — | — | — | transfer, End-Op, role edits, any overlay |

## Empty / error / loading states

- **Empty — no active operation:** the first-run [`empty-state`](../03-primitives/empty-state.md) — "No active operation" + **Start Operation** (faithful to v3's `noActiveOpCommand`).
- **Error:** a failed write queues locally (sync indicator); never `alert()`.
- **Loading:** local-first — SitStat renders instantly from local state; the elapsed clock ticks client-side ([`loading-state.md`](../03-primitives/loading-state.md)).

## Accessibility / screen-reader notes

**Cite [`accessibility.md`](../07-design-system/accessibility.md), do not restate.**
- SitStat datums are a labeled group; each announces label + value; the per-status counts read as a list ([`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts).
- The persistent Safety-Officer header is a consistent landmark with a labeled "open Hazard Log" control; command transfer and End-Operation announce their consequence (End-Operation = the destructive-confirm script from [`modal.md`](../03-primitives/modal.md)).
- Role-assignment sheet + roster lists are keyboard-navigable; Power Select gives the role picker a native `<select>` fallback under VoiceOver/TalkBack-or-Settings.

## Open questions (per-screen)

1. **Command roster ↔ Accountability-screen boundary** — exactly which resource attributes live in Command (assignment) vs. the [Accountability](41-accountability.md) screen ([#297](https://github.com/Vergo402/paratech-struts/issues/297), accountability/sync); resolved with the Accountability spec.
2. **Command-transfer brief default by Level** — ICS-201 brief default at Level III+ vs. optional at IV–V; the choreography is the Phase G command-transfer workflow.
3. **SitStat datum prominence at broadcast scale** — the exact C-13 left-third/center split sizing; affordance geometry finalized in the Phase H slice / broadcast spec ([#213](https://github.com/Vergo402/paratech-struts/issues/213)).

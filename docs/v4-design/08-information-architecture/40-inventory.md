# IA Spec: Inventory

> Phase F information-architecture spec. Cites [`00-ia-foundation.md`](00-ia-foundation.md) for all cross-cutting rules and does not re-derive them.
> Source: [`06-synthesis.md`](../06-synthesis.md) §1.2; recs F-24 (Excel round-trip), I-7 (per-row sync → Accountability, not here); [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md), [ADR-008](../11-decisions/ADR-008-nims-org-structure.md); GitHub [#200](https://github.com/Vergo402/paratech-struts/issues/200). Grounded in v3 `renderInventory()` (app.js:3445), `renderApparatusTabs()` (3091), `updateQty()` (3536), `quickAdd()` (3657), `exportInventory()` (7906), `handleImport()` (7992), `renderQuickViewInventory()` (8361).

---

## Purpose

The apparatus-centric equipment catalog: what struts, extensions, and connector plates each rig carries, how many are available vs. deployed, and the Excel import/export that keeps it in sync with the department's real cache. It is the stock a deploy decrements and a return restores.

## Where it lives

- **Tab / parent:** **Inventory** (per the [tab map](00-ia-foundation.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md)). Its sibling under this tab is **[Accountability](41-accountability.md)** ([#297](https://github.com/Vergo402/paratech-struts/issues/297); renamed from "Roster"), which owns resource **accountability + per-row sync** — Inventory owns **stock**.
- **How it is reached:** the Inventory bottom-nav tab; also surfaced as the **Quick View** stock panel from anywhere ([10-quick-find.md](10-quick-find.md) / [20-operations.md](20-operations.md) deploy contexts read the same stock).
- **Issue:** [#200](https://github.com/Vergo402/paratech-struts/issues/200).

## Primary role(s) and surface(s)

- **Primary role(s):** the Logistics/CP role and any team member stocking a rig pre-incident; read during deploy by the team officer.
- **Primary surface(s):** **phone is the floor** (stock a rig from the apparatus floor, gloved). Tablet/laptop add density + the keyboard-friendly Excel flows; broadcast may project a read-only stock summary.

## Information hierarchy (above / below fold) — per surface

### Phone (the floor)
- **Above fold:** the **apparatus scope** selector ([`segmented`](../03-primitives/segmented.md)); the selected rig's equipment list, grouped by system.
- **Below fold:** further system groups + connector plates; Add Equipment / Add Apparatus / import-export actions.

### Tablet / laptop
- **Above fold:** apparatus scope as a rail or wider segmented; equipment as a denser multi-column grid; laptop adds keyboard qty entry + the Excel import/export buttons foregrounded.

### Broadcast TV
- Optional read-only **stock summary** (available counts per system) at ≥ 32pt; no qty controls, no add flows, no overlays.

## Primary action + secondary actions

- **Primary action (one — Principle 4):** adjust stock — the **± quantity stepper** on an item row ([`input.md`](../03-primitives/input.md)).
- **Secondary actions:** **Add Equipment** (quick-add grids); **Add Apparatus**; **Import / Export Excel**; open **Quick View**; switch apparatus scope.
- **Destructive / inventory-consequential:** removing an apparatus or an item, and an **import that would orphan deployed struts**, raise a [`modal`](../03-primitives/modal.md) confirm (the ADR-016 Inventory row); a `±` that would drop a deployed item below its deployed count is clamped, not destructive.

## Composed primitives

- [x] [segmented](../03-primitives/segmented.md) — the **apparatus scope** (the v3 `.apparatus-tabs` → the scope-tabs variant).
- [x] [list](../03-primitives/list.md) — the equipment list (sectioned by system → type; rows).
- [x] [input](../03-primitives/input.md) — the **± quantity stepper** per row (the `±` routed here per [`button.md`](../03-primitives/button.md)).
- [x] [badge](../03-primitives/badge.md) — the **deployed-count** badge per row; an available-vs-quantity count; low-stock indicator in Quick View.
- [x] [sheet](../03-primitives/sheet.md) — **Add Equipment** quick-add grids; the **visual-grid plate picker**; **Quick View**; the apparatus-type picker.
- [x] [modal](../03-primitives/modal.md) — **Add Apparatus** (full-screen form if large); **delete** apparatus/item (destructive); **import orphan-detection** confirm.
- [x] [button](../03-primitives/button.md) — Add Equipment / Add Apparatus / Import / Export.
- [x] [empty-state](../03-primitives/empty-state.md) — no apparatus yet (first-run); an apparatus with no equipment.
- [x] [loading-state](../03-primitives/loading-state.md) — the **Excel import/export** is a genuine wait → determinate progress (one of the few legitimate loaders).
- [ ] picker(standalone) · card · toggle · slider · toast · warning-gate · nested-checklist (not core).

## The equipment list

- **Apparatus scope first:** a [`segmented`](../03-primitives/segmented.md) scope-tab per apparatus (name + item-count); selecting filters the list to that rig (faithful to v3 `selectedApparatus`).
- **Grouped system → type** (faithful order): **Gold (LongShore) · Grey (AcmeThread) · LockStroke** sections, each with struts (sorted by collapsed length) then extensions (by length); then a system-independent **Connector Plates** section (alphabetical).
- **Each item row** ([`list.md`](../03-primitives/list.md) row): model / size / plate-name; a **deployed-count [`badge`](../03-primitives/badge.md)** when an operation is active and any are deployed; the **± stepper** ([`input.md`](../03-primitives/input.md)) showing available vs. quantity. Dropping qty to 0 with nothing deployed removes the item (faithful to v3); a `±` is **clamped** so available never exceeds quantity and a deployed item can't be removed (the v3.5.2 transaction-sanity rule).

## Add flows

- **Add Equipment** — the **strut / extension / plate quick-add grids** in a [`sheet`](../03-primitives/sheet.md); tapping a grid cell increments that item for the selected rig (faithful to `quickAdd()`). The **plate grid is the preserved visual-grid picker** ([`picker.md`](../03-primitives/picker.md) §Explicit Preservation).
- **Add Apparatus** — name + **type** (the apparatus-type set, [ADR-008](../11-decisions/ADR-008-nims-org-structure.md) terms); a [`modal`](../03-primitives/modal.md) when it carries the manage/edit/delete list, with delete as a destructive confirm.

## Quick View

The at-a-glance **available-stock** panel ([`sheet`](../03-primitives/sheet.md), phone-first): inventory grouped by apparatus, each item showing **available / total** with low-stock emphasis. During an operation it scopes to the assigned apparatus. It is a read surface — adjustments happen on the main Inventory list.

## Excel import / export

- **Export** writes the catalog with the **ID and Plate-ID columns** so deployed-strut references survive a round-trip (the v3.5.2 / v3.9.0 fixes).
- **Import** (xlsx/csv) reads those IDs back; if an import would **delete IDs referenced by deployed shore points**, it raises the **orphan-detection [`modal`](../03-primitives/modal.md)** ("Import anyway?") rather than silently breaking deployed cards.
- Both are a real wait → **determinate [`loading-state`](../03-primitives/loading-state.md)**; parse failure resolves inline / via a blocking-alert modal, never a bare `alert()`.

## Per-row sync lives in Accountability, not here

The **per-row sync state** (synced / pending, the PAR/accountability visibility win, rec I-7) is the **[Accountability](41-accountability.md)** screen's job ([#297](https://github.com/Vergo402/paratech-struts/issues/297)) — a foundation decision. Inventory shows **stock counts**; Accountability shows **who/what is here and synced**. Keeping them separate stops the stock list from carrying two orthogonal meanings.

## Locked cross-cutting rules this screen honors

- [x] **Phone is the floor** — stock, add, and adjust all work phone-only.
- [x] **NIMS terminology** — apparatus types + spelled-out terms ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- [x] **Tap geometry** — 56pt rows + stepper targets; 8pt dead zones ([`spacing-grid.md`](../07-design-system/spacing-grid.md)).
- [x] **Modal-vs-sheet** per the ADR-016 Inventory row: pickers/quick-add/Quick View = sheet; Add Apparatus (large) / delete / import-orphan = modal.
- [x] **No silent data loss** — the import orphan-confirm + the qty clamp protect deployed references (Principle 10 / the v3.5.2 transaction-sanity lessons).
- [x] **Visual-grid plate picker preserved** verbatim ([`picker.md`](../03-primitives/picker.md) / [`sheet.md`](../03-primitives/sheet.md)).
- [x] **Loaders are the exception** but the Excel round-trip is a real one → determinate ([`loading-state.md`](../03-primitives/loading-state.md)).
- [x] **Capacity demoted** — not shown here (Inventory is counts, not ratings).

## The four-surface table (this screen)

| Dimension | Phone | Tablet | Laptop | Broadcast |
|---|---|---|---|---|
| Layout | scope selector → single-column list | scope rail + multi-column grid | dense grid + keyboard qty + Excel | read-only stock summary |
| Above fold | apparatus scope + its stock | scope + denser grid | scope + grid + import/export | available counts per system |
| Primary-action affordance | ± stepper on row | ± stepper | ± stepper + keyboard | — (read-only) |
| Add / Excel | sheets + buttons | foregrounded | keyboard-first | — |
| Does NOT render | — | — | — | qty controls, add flows, overlays |

## Empty / error / loading states

- **Empty — no apparatus:** the first-run [`empty-state`](../03-primitives/empty-state.md) — "No apparatus yet" + a primary **Add Apparatus**.
- **Empty — apparatus with no equipment:** the first-run variant scoped to the rig — "No equipment on [apparatus]" + **Add Equipment**.
- **Error:** import parse failure → a blocking-alert [`modal`](../03-primitives/modal.md) with the reason; inline [`input.md`](../03-primitives/input.md) validation on qty; never `alert()`.
- **Loading:** instant for local stock; **determinate progress** only for the Excel import/export ([`loading-state.md`](../03-primitives/loading-state.md)).

## Accessibility / screen-reader notes

**Cite [`accessibility.md`](../07-design-system/accessibility.md), do not restate.**
- The apparatus scope (segmented), the ± stepper, and the quick-add grids announce per the registry ([`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts); the stepper exposes labeled increment/decrement with the current value, not icon-only (Principle 9).
- Import/export progress announces via `aria-live`; the orphan-confirm modal traps focus + names the consequence ([`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard).
- Power Select gives the plate/type pickers a native `<select>` fallback under VoiceOver/TalkBack-or-Settings.

## Open questions (per-screen)

1. **Quick View placement** — a sheet raised from Inventory vs. a persistent shell affordance reachable from deploy contexts; affordance geometry, finalized in the Phase H slice / the deploy workflow (Phase G).
2. **Inventory ↔ Accountability boundary at the edges** — e.g. external/mutual-aid equipment (v3 "external equipment from Dept N") shows source for return; confirm it reads in Inventory stock while accountability stays in [Accountability](41-accountability.md); resolved with the Accountability spec ([#297](https://github.com/Vergo402/paratech-struts/issues/297)).
3. **Apparatus-type editing** — whether custom apparatus types are managed here or in Settings; resolved with the Settings spec ([#202](https://github.com/Vergo402/paratech-struts/issues/202)).

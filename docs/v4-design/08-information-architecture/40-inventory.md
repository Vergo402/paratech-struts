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

This is a **pre-incident cache-loading tool** — not an asset tracker, not an operational snapshot. The file answers one question: *which apparatus carries how many of which item?* The app owns everything else (available count, deployed state, collapsed/extended dimensions).

### What the ID represents — stock record, not asset serial

FieldShore tracks inventory as a **quantity-based cache**: one record per apparatus × item-type pairing, with a Quantity field saying how many physical pieces that record covers. "Engine 270 carries 4 LongShore S54-96 struts" is one record. Individual strut barcodes or per-piece serial numbers are out of scope — this is accessible inventory, not equipment management.

The `ID` column is a FieldShore-generated stock-record identifier, never visible in normal use. It exists only to survive **round-trips**: export → edit quantities → re-import without creating duplicates or orphaning deployed references.

### The column contract (10 columns)

`Collapsed (in)` and `Extended (in)` are intrinsic to the Paratech model — the app resolves them from `STRUTS[]` when a Model is validated; the operator does not enter them. `Available` is runtime state managed by the app (deploys decrement it, returns restore it); it has no place in the file.

| Column | Strut | Extension | Plate | Notes |
|---|---|---|---|---|
| `ID` | ✓ | ✓ | ✓ | FieldShore stock-record ID. **Blank on first upload** — app assigns on import. Preserved automatically on round-trip exports. |
| `Apparatus` | ✓ | ✓ | ✓ | Human-readable apparatus name (e.g., "Engine 270"). |
| `Apparatus ID` | ✓ | ✓ | ✓ | FieldShore apparatus ID. Blank on first upload → a new apparatus is created on import. |
| `Type` | `Strut` | `Extension` | `Plate` | **All three types now.** v3 silently dropped plates from the export — the broken round-trip this fixes. |
| `Model` | ✓ | — | — | Paratech model name. Validated against `STRUTS[]` on import; app resolves collapsed/extended from model automatically. |
| `System` | ✓ | — | — | `Gold` / `Grey` / `LockStroke`. Validated on import. |
| `Plate ID` | — | — | ✓ | **The round-trip fix.** Export now writes this; import reads it back. Key for the plate — `Plate Name` is the display label. |
| `Plate Name` | — | — | ✓ | Human-readable display label. Read-only on import — `Plate ID` is the key; name is resolved from `BASE_PLATES[]`. |
| `Extension Length (in)` | — | ✓ | — | Positive integer. The only descriptor an extension needs. |
| `Quantity` | ✓ | ✓ | ✓ | How many this apparatus carries. The only number the operator sets. |

**Blank = not carried.** If an apparatus doesn't stock a particular item, that row simply doesn't exist for it. No zero-quantity rows, no "confirm it's absent" step — absence is the signal.

**Per-apparatus organization.** Rows are sorted by Apparatus (alphabetical), then by Type (Strut → Extension → Plate), then by system / length within each type. The Apparatus column carries the grouping — no special section-header rows (self-describing rows, like the CheckIt pattern). The xlsx export may insert a blank separator row between apparatus blocks for readability; csv omits separators.

### The downloadable template

The template ships with **column headers + 3–4 clearly labeled example rows** ("EXAMPLE — delete before importing") to show the format, not to pre-populate fake inventory. The xlsx template adds a **Reference sheet** listing all valid Paratech Model names (by system) and all known Plate IDs, so the operator knows the exact values to enter without guessing. The csv template ships headers + example rows only.

### Validated import flow (Flatfile-style — 4 steps in a [`sheet`](../03-primitives/sheet.md))

A step-indicator at the top of the import sheet tracks progress. Phone: each step is full-screen-height. Laptop: step 3 shows the column-map and row-validation table side by side.

**Step 1 — File pick.** xlsx or csv accepted. An instant 5-row preview confirms "yes, that's my file" before the operator proceeds.

**Step 2 — Column mapping.** The app auto-detects standard column names and shows a one-screen map ("Your column X → FieldShore field Y"). Mismatches are highlighted; the operator fixes them before proceeding. Extra columns → "Ignore." A file exported from FieldShore auto-maps with zero mismatches.

**Step 3 — Row validation** (runs instantly, local):
- `Type` is one of `Strut` / `Extension` / `Plate`.
- `Model` is in the known strut list — warning (not block) for unknown values (future strut models).
- `Plate ID` is in the known plate list — warning for unknown values.
- `Extension Length` is a positive number (Extension rows).
- `Quantity` is a positive integer.
- `Apparatus` is non-empty; if `Apparatus ID` is blank, a new apparatus will be created (surfaced as an info note).
- Cross-apparatus ID collision: an import row's ID matches an existing item on a *different* apparatus → flagged.
- Active-operation guard: if an operation is in progress, a banner warns that deployed items won't be affected by the import.

**Step 4 — Error review + commit gate.** A summary card reads "N rows will import · M warnings · K rows skipped." The operator can: scroll to a flagged row and edit inline, skip individual rows, or cancel entirely. "Import N rows" is the final confirm → [`loading-state`](../03-primitives/loading-state.md) determinate progress bar during the write.

**Orphan-detection** is the final pre-write check: if rows being replaced or removed reference IDs currently used by deployed shore points in an active operation → [`modal`](../03-primitives/modal.md) confirm before proceeding. This is an edge case (the tool is for pre-incident loading), but the guard remains.

### File formats

Both **xlsx** and **csv** are accepted on import and produced on export. xlsx gets the optional blank apparatus-separator rows and the Reference sheet; csv is a flat, separator-free file. Parse failure in either format surfaces via a blocking-alert [`modal`](../03-primitives/modal.md) with the reason — never a bare `alert()`.

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

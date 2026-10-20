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
- **Destructive / inventory-consequential:** removing an apparatus or an item, and an **import that would orphan deployed struts**, raise a [`modal`](../03-primitives/modal.md) confirm (the ADR-016 Inventory row); quantity floors at the units held (ADR-041); an import or a peer quantity below held is not blocked, it reads as over-allocated.

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
- **Each item row** ([`list.md`](../03-primitives/list.md) row): model / size / plate-name; a **deployed-count [`badge`](../03-primitives/badge.md)** when an operation is active and any are deployed; the **± stepper** ([`input.md`](../03-primitives/input.md)) showing available vs. quantity. Dropping qty to 0 with nothing deployed removes the item (faithful to v3); a `±` floors quantity at the units **held** (ADR-041), so a deployed item can't be removed. An import or a peer quantity below held reads as **over-allocated**: the count reads negative in the danger color with the chip "over-allocated — needs resolving" (accepted mockup `.claude/audits/phase-j/499-shots/mockup-accepted-2026-10-10.png`).

## Add flows

- **Add Equipment** — the **strut / extension / plate quick-add grids** in a [`sheet`](../03-primitives/sheet.md); tapping a grid cell increments that item for the selected rig (faithful to `quickAdd()`). The **plate grid is the preserved visual-grid picker** ([`picker.md`](../03-primitives/picker.md) §Explicit Preservation).
- **Add Apparatus** — name + **type** (the apparatus-type set, [ADR-008](../11-decisions/ADR-008-nims-org-structure.md) terms); a [`modal`](../03-primitives/modal.md) when it carries the manage/edit/delete list, with delete as a destructive confirm.

## Quick View

The at-a-glance **available-stock** panel ([`sheet`](../03-primitives/sheet.md), phone-first): inventory grouped by apparatus, each item showing **available / total** with low-stock emphasis. During an operation it scopes to the assigned apparatus. It is a read surface — adjustments happen on the main Inventory list.

## Excel import / export

> **Shipped as CSV.** This section keeps its "Excel" name because the rest of the spec set points at it; the file format that ships is **CSV**, for import and export both. xlsx input, xlsx export and the xlsx template's Reference sheet are **deferred** ([File formats](#file-formats)). Everything below is checked against the `v4-redesign` build at `903a68e`: `src/data/inventory/excel.ts` (parse / validate / serialize), `src/ui/inventory/ImportFlow.tsx` (the flow), `src/ui/inventory/ImportExport.tsx` (the controls) and `upsertImport` in `src/data/store/inventoryStore.ts` (the write).

This is a **pre-incident cache-loading tool** — not an asset tracker, not an operational snapshot. The file answers one question: *which apparatus carries how many of which item?* The app owns everything else (available count, deployed state, collapsed/extended dimensions).

### What the ID represents — stock record, not asset serial

FieldShore tracks inventory as a **quantity-based cache**: one record per apparatus × item-type pairing, with a Quantity field saying how many physical pieces that record covers. "Engine 270 carries 4 LongShore LS 203 struts" is one record. Individual strut barcodes or per-piece serial numbers are out of scope — this is accessible inventory, not equipment management.

The `ID` column is a FieldShore-generated stock-record identifier, never visible in normal use. It exists only to survive **round-trips**: export → edit quantities → re-import without creating duplicates or orphaning deployed references. Re-importing an unchanged file sets the same quantities and doubles nothing.

### The column contract (10 columns)

`Collapsed (in)` and `Extended (in)` are intrinsic to the Paratech model — the app resolves them from `STRUTS[]` when a Model is validated; the operator does not enter them. `Available` is runtime state the app derives (`quantity − held`, [ADR-041](../11-decisions/ADR-041-canonical-event-order-and-derived-inventory.md)); it has no place in the file and import never reads or sets it.

| Column | Strut | Extension | Plate | Notes |
|---|---|---|---|---|
| `ID` | ✓ | ✓ | ✓ | FieldShore stock-record ID. **Blank on first upload** — the app mints one on import. Kept on every export, so a re-import updates the same record. |
| `Apparatus` | ✓ | ✓ | ✓ | **Required.** Human-readable apparatus name (e.g., "Engine 270"). Matched by exact name when `Apparatus ID` is blank. |
| `Apparatus ID` | ✓ | ✓ | ✓ | FieldShore apparatus ID. **Blank is normal on first upload:** the rig is found by its `Apparatus` name among the existing apparatus and stock, and only a name found nowhere creates a new apparatus (type **Other**), written in the same transaction as the items. |
| `Type` | `Strut` | `Extension` | `Plate` | **Required**, read without regard to case. **All three types round-trip** — v3 silently dropped plates from the export. Anything else is flagged. |
| `Model` | ✓ | — | — | Paratech model name; must match a catalog model (`STRUTS[]`) exactly. An unknown model is **flagged and not imported**. |
| `System` | — | ✓ | — | `Gold` / `Grey` / `LockStroke` (import also accepts `LongShore`, `AcmeThread`, `Gray`). **Extension rows need it** — an extension has no model to read it from — and an unrecognised value is flagged. **Strut rows: not read**; the system comes from the catalog entry for `Model`. Export writes it wherever a record carries one. |
| `Plate ID` | — | — | ✓ | **The round-trip fix.** Key for the plate; must match a catalog plate (`BASE_PLATES[]`). An unknown Plate ID is **flagged and not imported**. |
| `Plate Name` | — | — | ✓ | Display label, written on export from the catalog. **Ignored on import** — `Plate ID` is the key. |
| `Extension Length (in)` | — | ✓ | — | Positive whole number; flagged otherwise. |
| `Quantity` | ✓ | ✓ | ✓ | **Required.** How many this apparatus carries. The only number the operator sets. A positive whole number, plain digits only — `0`, `0x12`, `1e2` and `+3` are flagged rather than coerced into a wrong count. |

**Blank = not carried.** If an apparatus doesn't stock a particular item, that row simply doesn't exist for it. No zero-quantity rows, no "confirm it's absent" step — absence is the signal. Export omits zero-quantity records; import flags a Quantity of 0 rather than reading it as a removal. An import only adds and updates: stock the file does not mention is left as it is.

**Per-apparatus organization.** Rows are sorted by Apparatus (alphabetical), then by Type (Strut → Extension → Plate), then by system / length within each type (plates by name). The Apparatus column carries the grouping — no section-header or separator rows (self-describing rows, like the CheckIt pattern).

### Export

**Export inventory** writes the cache as `fieldshore-inventory.csv` — the ten columns above, sorted as described, in RFC-4180 form (quotes protect commas, newlines and the plate names' inch mark) with CRLF line endings. An `Apparatus` or `Model` cell that opens with a spreadsheet formula character (`=`, `+`, `-`, `@`, tab, carriage return) is written with a leading apostrophe so Excel and Sheets read it as text; import strips exactly that apostrophe and nothing else, so an export → import → export cycle is byte-faithful. The download is immediate; there is no export progress.

### The downloadable template

**Download template** writes `fieldshore-inventory-template.csv`: the ten column headers plus **three clearly labeled example rows**, one per type (Strut, Extension, Plate), each carrying `EXAMPLE — delete before importing` in the Apparatus column. The rows show the format; they do not pre-populate fake inventory. Import drops rows carrying **exactly** that marker and nothing looser — a rig legitimately named "EXAMPLE Co" still imports — and counts them with the blank rows it ignored. The template is a CSV: it has no Reference sheet ([File formats](#file-formats)).

### Where the controls live

The Inventory header carries one quiet data button ("Import and export inventory") that raises an *Inventory data* sheet with three rows — **Export inventory**, **Download template**, **Import inventory**. **Settings → Data Management** shows the same three rows inline — one implementation, two doors ([`50-settings.md`](50-settings.md)). **Import** needs the *Manage inventory & apparatus* toggle; **Export** and **Template** need *Export / delete department data* ([ADR-017](../11-decisions/ADR-017-custom-department-roles.md)). A member with neither sees no data controls.

### Validated import flow (Flatfile-style — 4 steps, full-screen)

Bespoke on the design-system primitives, no library, fully offline ([ADR-038](../11-decisions/ADR-038-bespoke-column-mapping.md)). The flow is one **full-screen dialog** (the picker's full-screen container, not a [`sheet`](../03-primitives/sheet.md)), single-column at every width — there is no laptop side-by-side layout. A step indicator at the top reads "Step N of 4" over a four-segment bar. **Cancel** (top right; **Done** once a result shows) dismisses with nothing written, and is disabled while the write runs.

**Step 1 — File pick.** **CSV only** — the file picker is filtered to `.csv`. After a pick the dialog shows the file name, its column and row counts and a **First 5 rows** preview confirming "yes, that's my file"; **Change** re-picks. Continue stays disabled until a file is chosen. A file that cannot be read raises a blocking-alert [`modal`](../03-primitives/modal.md), "Couldn't read that file", with the reason — an unterminated quote (nothing is read) or no data rows (it needs a header row plus at least one item) — never a bare `alert()`.

**Step 2 — Column mapping.** Every column in the file is listed with ✓ matched, ! no match or — ignored, and a picker over the ten FieldShore fields plus "Ignore this column". The app pre-fills by **case-insensitive header-name match**; a file exported from FieldShore auto-maps with zero mismatches. A field maps to exactly one column — choosing it frees whichever column held it. **Type, Apparatus and Quantity must each be mapped** to continue; that is the only gate. Other unmatched columns are highlighted but treated as ignored. Under Native Controls the picker is an OS `<select>`.

**Step 3 — Row validation** ("Check the rows"; runs instantly, on-device). Two chips — **N will import** and **N to fix** — then each flagged row as "Row N: reason", where N is the file line with the header as line 1, as a spreadsheet shows it. Checked in this order:
- The row has the same number of fields as the header — otherwise it is flagged and can only be skipped (usually a mis-pasted multi-line value).
- `Type` is `Strut` / `Extension` / `Plate`.
- `Apparatus` is non-empty. (A row whose Apparatus is exactly the template marker, and a wholly blank line, is dropped without a flag.)
- `Quantity` is a positive whole number.
- Strut rows: `Model` is in the catalog. Extension rows: `Extension Length` is a positive whole number and `System` is recognised. Plate rows: `Plate ID` is in the catalog.

Unknown values are **flagged, not warned**: a `Model` or `Plate ID` outside the catalog is a row to fix and is never imported as entered. If an operation is in progress, a banner reads that deployed items are not changed by the import and that any row that would strand deployed gear is skipped. Import is allowed during an operation, never blocked.

**Step 4 — Review and import** (the error review + commit gate). Chips read **N ready** and **N to fix**; a "N rows ready to import" line expands to list them (apparatus · item · ×quantity). Each flagged row gets a fix card — its reason, a one-field editor chosen by the failing field, and **Skip this row instead**:
- `Quantity`, `Extension Length` — numeric text field.
- `Apparatus` — text field.
- `Model`, `Plate ID` — a searchable list of the catalog's models or plates.
- `System`, `Type` — a short picker.

Editing re-validates that one row and moves it to ready the moment it passes. A skipped row collapses to one line with **Undo**. A wrong-width row has no editor (skip only); a row whose failing field has no mapped column says to go Back and map one, or skip. Going Back to Step 2 and continuing re-validates from the file and discards Step 4 fixes and skips. **Import N rows** is the single commit — nothing is saved before it — and is disabled at zero ready rows. A flagged row that is neither fixed nor skipped is **left out** and reported.

### What the write does — and the orphan guard

**Import N rows** runs as one local transaction: all of it lands or none of it does ("Import failed — Nothing was saved."). While it runs the header reads "Importing…", Cancel and the Import button are disabled and Escape does not close the dialog; no determinate progress bar ships. Then the rows push to the cloud. The rules:

- **A row with an ID** updates that record and sets its quantity to the file's number. A same-kind row sets the quantity under the rig the row names; no separate cross-apparatus ID-collision flag ships. Reusing an ID for a different kind of item (a Strut ID now describing a Plate) is **skipped** — returns resolve by ID, so a re-typed record would restore the wrong item.
- **A row with a blank ID** merges into identical stock on the same rig (same type and model, length and system, or plate) or adds a new record. Within one file, blank rows of one identity **sum** (2 + 3 = 5); the total then **sets** the existing quantity, so re-importing the same file never doubles stock.
- **Orphan guard — orphan rows are skipped.** A row whose quantity would fall below the units currently held by deployed shore points is **skipped**: not written, and not put to a confirm modal. The result reports it as "N skipped — would strand deployed stock." Held units are never touched, which is why import can run during an operation. (The orphan-confirm [`modal`](../03-primitives/modal.md) this spec once drew is not built.)

**Result.** The dialog ends on "Import complete" with one line per outcome, so every row in the file is accounted for: rows imported; rows merged with an identical row; rows skipped as would-strand; rows skipped as a type mismatch; rows still flagged and not imported; rows the operator skipped; blank (and template) rows ignored. A cloud line closes it — saved on this device and in the cloud, saved on this device and will sync on reconnect, saved on this device with nothing to sync, or an amber line naming how many rows did not reach the cloud. A failed write shows "Import failed" and "Nothing was saved."

### File formats

**CSV only**, for import and export: UTF-8 text in RFC-4180 form. A spreadsheet is imported by saving it as CSV first. A read failure surfaces via a blocking-alert [`modal`](../03-primitives/modal.md) with the reason — never a bare `alert()`.

**Deferred — not built for v4.0:**
- **xlsx input** — the Step 1 "xlsx or csv" pick.
- **xlsx export**, including the optional blank apparatus-separator rows.
- The **Reference sheet** in the xlsx template — every valid Model (by system) and Plate ID, so the operator need not guess.

[ADR-038](../11-decisions/ADR-038-bespoke-column-mapping.md) scopes its decision to the mapping UI and records the file format as a deferred scope note ("CSV only (xlsx deferred)"): xlsx parsing needs a spreadsheet library (SheetJS), a separate tooling question. The Reference sheet exists only inside an xlsx workbook, so it waits with it. Whether and when to add the library is not yet a numbered open question. Until then the Step 4 fix pickers list the valid Models and Plate IDs.

## Per-row sync lives in Accountability, not here

The **per-row sync state** (synced / pending, the PAR/accountability visibility win, rec I-7) is the **[Accountability](41-accountability.md)** screen's job ([#297](https://github.com/Vergo402/paratech-struts/issues/297)) — a foundation decision. Inventory shows **stock counts**; Accountability shows **who/what is here and synced**. Keeping them separate stops the stock list from carrying two orthogonal meanings.

## Locked cross-cutting rules this screen honors

- [x] **Phone is the floor** — stock, add, and adjust all work phone-only.
- [x] **NIMS terminology** — apparatus types + spelled-out terms ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- [x] **Tap geometry** — 56pt rows + stepper targets; 8pt dead zones ([`spacing-grid.md`](../07-design-system/spacing-grid.md)).
- [x] **Modal-vs-sheet** per the ADR-016 Inventory row: pickers/quick-add/Quick View = sheet; Add Apparatus (large) / delete / import-orphan = modal.
- [x] **No silent data loss** — the import orphan-confirm + the quantity-floors-at-held rule (and the over-allocated tell) protect deployed references (Principle 10 / the v3.5.2 transaction-sanity lessons).
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

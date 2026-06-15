# ADR-033: A deployed shore point sources its full bill-of-materials (strut + plates + extensions) per-component from inventory

> Architecture Decision Record. Restores v3 parity (struts **and** extensions **and** plates decrement on deploy / restore on return) onto the v4 event-sourced model, and makes the **per-component apparatus source** first-class — each physical piece on a shore can come from a *different* rig. Builds on [ADR-009](ADR-009-database-firebase-rtdb.md) (event log is the spine; state is a projection), [ADR-027](ADR-027-deploy-mode-and-v3-shore-point-entry.md) (deploy modes), [ADR-016](ADR-016-modal-vs-sheet-rules.md) (Assign Equipment = sheet; step-back = inventory-consequential modal), [ADR-030](ADR-030-recoverable-shore-point-delete.md). Realizes the deferred line in [`40-inventory.md`](../08-information-architecture/40-inventory.md) ("extension + base-plate stock decrement deferred from Phase H") and amends workflow [#221](../09-workflows/12-deploying-a-strut.md).

---

## Status

- [x] Accepted

**Date:** 2026-06-15
**Author:** Claude Opus 4.8 (FieldShore architect session)
**Reviewer(s):** Alex — accepted 2026-06-15. The flagged product call is resolved: plate not-stocked = **quick-add, then deploy** (Alex's call); extensions follow the same quick-add model; disambiguation defaults to the strut's rig. **Refinement (Alex, 2026-06-15):** deploying a component that *stays* untracked (the operator declines quick-add) is permitted but **requires an explicit confirmation popup** — untracked deploy is always deliberate and flagged, never silent. Build is sequenced with the Inventory block ([#200](https://github.com/Vergo402/paratech-struts/issues/200)).

---

## Context

A USAR firefighter put the bar plainly: *"this one shore needs a strut off Rescue 2 and a base plate off Engine 1 — does the app account for both rigs?"* It must. A deployed shore is a small **bill-of-materials** (BOM) — one strut, zero-to-two connector plates (top / bottom), zero-to-two extensions — and in the field those pieces are pulled from whichever rig has them on board, **not necessarily the same rig**. The app has to record which apparatus each piece came from, decrement each from *that* rig on deploy, and restore each to *its own* rig on un-deploy (step-back) and at end-of-operation.

**v3 is the parity spec, and v3 already did this.** Verified in `app.js`:

- `deployShorePoint()` (app.js:6430) sources three independent descriptors per shore point:
  - **strut** — `opInv.find(i => i.type==='strut' && i.model===… && i.available>0)` → stored as `deployedStrut { inventoryId, model, system, apparatus, external, deptName }`.
  - **extensions** — for each required extension length, an independent `opInv.find(i => i.type==='extension' && i.length===… && system-compatible && i.available>0)` → `deployedExtensions[]`. Each carries its own `inventoryId` + `apparatus`.
  - **plates** — for each non-`none` plate the operator selected as a deduction (top and/or bottom), an independent `opInv.find(i => i.type==='plate' && i.plateId===…)` → `deployedPlates[]`. Each carries its own `inventoryId` + `apparatus`.
  - **The three `find`s are independent** — the plate is sourced from whatever rig stocks that plate model, which **can be a different apparatus than the strut**. This is exactly the "strut off Rescue 2, plate off Engine 1" case, and v3 supports it today.
- `runDeployTransactions()` (app.js:8099) decrements **all** of them (strut + every extension + every plate) under per-item guarded transactions, and **compensates** (re-increments) the ones that committed if any abort — i.e. deploy is **all-or-nothing across the whole BOM**.
- `returnInventoryItems()` (app.js:8192) restores **all three** — `deployedStrut`, every `deployedExtensions[]`, every `deployedPlates[]` — each to its own `inventoryId`.
- Deploy is **atomic on the plate selection**: if the operator chose a plate model and stock can't satisfy it, the *entire* deploy aborts with a message ("Restock, adjust inventory, or set the plate dropdown to 'None'") — v3.17.4. Extensions, by contrast, are **best-effort**: `if (ext) extInvItems.push(ext)` — a missing extension is silently skipped (it was offered only because the engine pooled stock, so this is a rare race, not the normal path).

**v4 today is strut-only on the deploy path** (verified):

- `DeployedStrut = { model, source, inventoryId }` is the *only* sourced record on `ShorePoint` (`src/core/schema/shorepoint.ts`). There is no place to record a sourced plate or extension.
- Deploy is one `StrutDeployed` event carrying `deployedStrut` (`src/core/schema/event.ts`). The store (`src/data/store/operationStore.ts → commit`) runs **one** Dexie transaction per event via `applyDeployTxn(db, deployedStrut.inventoryId)` — decrements exactly one strut unit. `StrutReturned` → `applyReturnTxn` restores it.
- **Inventory-consequential events commit one at a time** — `commitMany` explicitly rejects `StrutDeployed`/`StrutReturned` ("inventory-consequential events commit one at a time"). The group-aware step-back already honors this: `OperationsBoard` collects `stepBackMembers` (all In-Process members of a grouped shore) and `StepBackConfirmModal` commits **one `StrutReturned` per member** in a loop.
- **Plates are a math-only deduction** (`Deductions.topPlate/bottomPlate` = `BASE_PLATES` ids), chosen from the full catalog via the visual-grid picker — *never* sourced from inventory. **Extensions** are decided by the engine (`engine.ts` *pools* availability across rigs to gate whether a combo is offered, `reduce((sum,i)=>sum+i.available,0)`), but the result `StrutCombination` only carries the **strut's** `inventoryId` — the extension and plate `inventoryId`s are not surfaced to the deploy UI at all.
- The `InventoryItem` schema *already* models all three types (`type: 'strut' | 'extension' | 'plate'`, per-apparatus `quantity`/`available`). The data model is ready; only the deploy path is strut-only.

So this is a **parity gap, not a redesign** — but closing it on the event-sourced spine touches the deployed-record shape, the event model, the store's transaction loop, the engine's result contract, and the deploy/return UI. It also **depends on plate/extension stock existing**, which needs the Inventory block's Add-Equipment grids ([#200](https://github.com/Vergo402/paratech-struts/issues/200)) — not yet built.

Constraints that bind the decision:

- **L-2** — deduct the exact value, floor the effective length once. Sourcing must not change the math: the plate is still chosen as a deduction; sourcing is an *additional* consequence, not a re-derivation.
- **L-7** — status-monotonic + group lockstep. Deploy is the pending→process boundary; the BOM change must ride that one transition, and grouped un-deploy must stay member-by-member.
- **L-8** — `available ≤ quantity`, abort on missing node, **one inventory txn at a time**. Each component is its own stock record → each is its own L-8 decrement. The "one at a time" rule is about not *batching distinct events*; the all-or-nothing BOM still needs every decrement to land or none to.
- **Phone is the floor** — the per-component "which rig?" choice cannot demand a tablet.
- **Visual-grid plate picker is preserved verbatim** (ADR-032 carved it out; `picker.md` §Explicit Preservation). Plate *selection* must keep using it untouched.

---

## Decision

**Model a deployed shore point as a sourced bill-of-materials carried on the shore point, committed and reversed atomically through one event per physical shore-member, with the store looping all component inventory transactions inside that member's single Dexie `rw` transaction (all-or-nothing). Each component records its own apparatus source and stock-record id, so different rigs can supply different pieces of one shore.**

Concretely, five sub-decisions:

### 1. Data shape — one unified `deployedComponents[]` with a `role` discriminator (Option B)

Replace the single `deployedStrut` with an ordered, role-tagged component list:

```ts
// src/core/schema/shorepoint.ts
export const DeployedComponentRole = z.enum([
  'strut',        // exactly one — the required member
  'top-plate',    // 0..1
  'bottom-plate', // 0..1
  'extension',    // 0..2 (system rules cap; engine already enforces)
]);

export const DeployedComponent = z.object({
  role: DeployedComponentRole,
  // the human-readable identifier, by role:
  //   strut/extension → strut model string is on the strut; extension uses `length`
  model: z.string().optional(),   // strut role: e.g. "LS 203"
  plateId: z.string().optional(), // plate roles: BASE_PLATES id
  length: z.number().int().optional(), // extension role: inches
  system: System.optional(),      // strut + extension
  source: z.string(),             // apparatus NAME, e.g. "Rescue 2"; or the 'untracked' sentinel
  inventoryId: z.string().optional(), // stock record decremented (L-8 ID round-trip); ABSENT ⟺ untracked
});

export const DeployedBom = z.array(DeployedComponent);
```

**Untracked components.** A component the operator chose to deploy *without* tracked stock (the confirmed not-in-stock path, §4/Decision-1) is recorded with `source: 'untracked'` and **no `inventoryId`** — it carries no decrement and no restore (the store skips components without an `inventoryId`). It still appears in the BOM (so the card and after-action show the full physical assembly), flagged "untracked".

On `ShorePoint`, `deployedStrut?: DeployedStrut` becomes `deployedBom?: DeployedComponent[]`. **`DeployedStrut` is retained in the schema file** purely as the back-compat projection target for legacy events (see §5) — it is no longer written.

Helpers (core, pure): `bomStrut(bom)` → the one `role: 'strut'` component (the card's cradle-to-grave identity — model + source line keep rendering exactly as today); `bomReturnList(bom)` → the flat list of `{ inventoryId }` to restore.

**Why B over the alternatives:** the store's restore loop, the audit log, and the "return everything this shore pulled" semantics all want **one flat iterable** of sourced pieces. Parallel arrays (Option A: `deployedStrut` + `deployedPlates[]` + `deployedExtensions[]`, the literal v3 shape) force every consumer to walk three fields and special-case which exist — and v3's own return code is three near-identical blocks because of it (`returnInventoryItems`, app.js:8192). A nested shape (Option C) buys nothing over a flat list with a discriminator and complicates Zod + projection. The unified list makes "decrement each, restore each" a single `.map`, keeps the strut addressable via `bomStrut()`, and is the natural audit-log row shape.

### 2. Event model — one `EquipmentDeployed` / `EquipmentReturned` event per physical shore-member, carrying the whole BOM; the store loops the component transactions inside one Dexie `rw` transaction (Option: extend the single deploy event to the BOM)

- Rename-and-widen `StrutDeployed` → **`EquipmentDeployed { spId, deployedBom: DeployedComponent[] }`** and `StrutReturned` → **`EquipmentReturned { spId }`**. (Old type literals are still *parsed* — see §5 migration. The new names read true now that a deploy is not just a strut.)
- **One event per physical shore-member**, exactly as today. A T-Shore (1 member) = one `EquipmentDeployed`. A 3-Post (3 members sharing `groupId`) = three independent `EquipmentDeployed` events, each with its own BOM and its own sources — deployed/stepped-back one member at a time. This preserves L-7 group lockstep and the just-shipped group-aware step-back (the board still loops one `EquipmentReturned` per In-Process member).
- **The store runs every component's inventory transaction inside the *one* `rw` Dexie transaction that also appends the event** (`operationStore.commit`):

  ```
  await db.transaction('rw', db.events, db.inventory, async () => {
    // untracked components (no inventoryId) carry no decrement — skip them
    for (const c of event.deployedBom) if (c.inventoryId) updated.push(await applyDeployTxn(db, c.inventoryId));
    await db.events.add({ ...event });
  });
  // then inventory.applyLocal(each updated) AFTER the durable write (L-4)
  ```

  `applyDeployTxn` already throws on a missing node or zero-available (L-8). Because they run in **one Dexie transaction**, a throw on *any* component rolls back **all** the decrements *and* the event append — the v3 "compensate the ones that committed" dance is unnecessary here (Dexie gives us atomicity for free; v3 had to hand-roll it over Firebase). This is the v4-correct realization of v3's all-or-nothing BOM deploy.

- **This does not violate L-8's "one inventory txn at a time."** That rule (and `commitMany`'s rejection of inventory-consequential events) exists so two *distinct events* don't get batched and lose their per-event pre-flight guard. Here it is still **one event = one pending→process transition for one shore member**; the multiple `db.inventory` writes inside it are the *components of that single logical deploy*, each individually L-8-guarded by `applyDeployTxn`. `commitMany` stays exactly as is — it still rejects `EquipmentDeployed`/`EquipmentReturned`. Grouped deploy/return remains a loop of single `commit()` calls, one per member.

- **Return / step-back** symmetrically: `EquipmentReturned { spId }` → the store reads the point's `deployedBom` from current state, loops `applyReturnTxn(db, c.inventoryId)` for every **tracked** component (those with an `inventoryId`; untracked ones have nothing to restore) inside one `rw` transaction, then clears `deployedBom`. The board's existing group-aware collection of `stepBackMembers` and the modal's per-member `EquipmentReturned` loop are unchanged — each member restores its own full BOM. End-of-operation's cascade (return every non-returned point) likewise loops `EquipmentReturned` per member; each restores its whole BOM.

### 3. Deduction-selection vs inventory-sourcing — selection stays the math input; sourcing is resolved at deploy time and is additive

The operator **still picks a plate MODEL as a deduction** through the preserved visual-grid picker — `Deductions.topPlate/bottomPlate` are unchanged, and the L-2 math is untouched (the deduction height is what gets subtracted). **Sourcing is a separate, additive step performed at deploy time:** when the officer taps Deploy on a RecommendationCard, the deploy path resolves an inventory stock record for *each* component of the BOM:

- **strut** — the `inventoryId` the engine already put on the chosen `StrutCombination.strut` (unchanged).
- **extensions** — for each `combo.extensions[]` length, resolve a stock record (see §6 — the engine result must start surfacing extension `inventoryId`s; today it pools availability but discards the ids).
- **plates** — for each non-`none` `topPlate`/`bottomPlate` selection, resolve a stock record of `type:'plate'` with that `plateId`.

**The selection and the sourcing reconcile by role:** the *deduction* says "this shore is built with an MK3 base plate"; the *sourcing* says "and that plate came from Engine 1's stock." They are the same plate, two facets — the deduction drives capacity math, the source drives inventory. When several rigs stock the same plate model, the picker chooses (§4); when exactly one stocks it, it auto-sources; when **none** stocks it, the source step offers a one-tap **quick-add** to a rig, then sources normally (resolved — Alex, 2026-06-15; see below).

### 4. Assign Equipment UX — auto-source silently; disambiguate only when needed; phone-first

The deploy surfaces (`AssignEquipmentSheet` two-step; inline deploy in `AddShorePointModal` one-step, ADR-027) gain a thin **source-resolution layer** between "tap Deploy" and "commit `EquipmentDeployed`":

- **Auto (the overwhelming common case):** for each component, if exactly one on-scene rig stocks it with `available > 0`, source it silently. A small department with one Rescue carrying everything sees **zero new friction** — tap Deploy, done, exactly as today.
- **Disambiguate (only when >1 rig stocks a component):** a compact **"Source components" confirm step** appears *inside the existing sheet* (not a new modal — ADR-016: deploy lives in the sheet) listing each component that needs a choice, with a rig segmented/select per ambiguous component (defaulting to the rig the strut came from, so the one-rig-shore answer is pre-filled). The RecommendationCard's existing "from Rescue 2" line generalizes to a per-component source summary once a BOM has >1 source. This respects the preserved visual-grid plate **picker** (plate *selection* is untouched; this is plate *sourcing*, a separate rig choice).
- **Not stocked → three deliberate paths, none silent (Alex, 2026-06-15):** if a selected plate (or extension) isn't in any on-scene rig's tracked stock, the source step offers: **(a) Quick-add** — add it to a chosen rig's count on the spot, then deploy + decrement normally (the do-it-right path; reuses the Inventory block's Add-Equipment quick-add flow, the Phase 1 tie); **(b) Deploy untracked** — gated by an explicit **confirmation popup** ("You're deploying a 6\" Swivel Base that isn't in tracked inventory — it won't be counted or returned. Deploy anyway?"), recording the component with `source:'untracked'`, no decrement, flagged "untracked" on the card + after-action; or **(c) Set to None** — deploy without the piece (a deduction change). Counts stay honest, a deploy never hard-stops over a data-entry gap, and an untracked deploy is always **confirmed and visible** — never silent.

Phone-first throughout: the source step is a vertical list of ≤4 rows (strut + ≤2 plates + ≤2 extensions), each a 56pt segmented/select; it only renders when there is an actual ambiguity, so the floor case never sees it.

### 5. Migration / back-compat — legacy strut-only events project as a one-item BOM

The event log is append-only and immutable (ADR-009), so old `StrutDeployed` events (carrying only `deployedStrut`) must keep projecting. The reducer (`shorePointReducer`) handles **both**:

- A legacy `StrutDeployed { deployedStrut }` (or `StrutReturned`) event → project `deployedBom = [{ role:'strut', model, source, inventoryId, ...}]` (a one-component BOM built from `deployedStrut`). The store, on replay, runs the single `applyDeployTxn` for that one component — identical to today.
- A new `EquipmentDeployed { deployedBom }` event → project the BOM as-is.

This is the standard v4 widening pattern (cf. `OperationCreated.inlineDeploy` "absent → default true"): the **discriminated union keeps the old `StrutDeployed`/`StrutReturned` members** for parse-compat, and adds the new `EquipmentDeployed`/`EquipmentReturned` members the app now *writes*. The S12 slice has **no production data**, so there is no live migration to run — but designing it clean means a captured-from-a-real-incident log (Phase I dogfooding) never breaks. `DeployedComponent` makes `model`/`plateId`/`length`/`system` all optional precisely so the reducer can build a strut-only BOM from a legacy event without inventing plate fields.

---

## Rationale

- **It is v3 parity, faithfully.** v3 sources plates and extensions independently of the strut and decrements/restores all three; this design does the same, with the per-component source promoted to a first-class field instead of living implicitly in three parallel descriptors. The "strut off Rescue 2, plate off Engine 1" case is the *headline*, not an edge case.
- **The event-sourced spine makes it cleaner than v3.** v3 had to hand-roll all-or-nothing over Firebase (`runDeployTransactions` fires N transactions, then compensates the committed ones if any abort — app.js:8169). Dexie's one `rw` transaction gives us that atomicity natively: loop the decrements, throw on any L-8 failure, the whole thing rolls back. Less code, stronger guarantee.
- **One event per shore-member, not per component, keeps the model honest.** A deploy is one operator action committing one physical shore-member's worth of equipment — that *is* one pending→process transition. Per-component events would fragment one human action across N log rows, break the "deploy = the atomic pending→process move" contract the workflow doc states, and force the reducer to reconstruct "is this shore fully deployed yet?" from a scatter of events. The BOM rides the one transition; L-7 and the group lockstep are untouched.
- **Unified `deployedComponents[]` is the shape every consumer wants.** Restore loop, audit log, and the card all read one iterable. The strut stays addressable via a one-line helper.
- **Selection-stays-math is non-negotiable for L-2.** Plates remain a deduction the operator picks with the preserved picker; sourcing is layered on top and never re-derives the math. This also means the *existing* Quick Find / Add Shore Point deduction flow is untouched — sourcing only engages at the moment of deploy.
- **Auto-source-silently honors "phone is the floor."** The friction (a rig-picker) appears *only* when reality is ambiguous (two rigs stock the same plate). The common single-rig shore deploys in one tap, exactly as today.

---

## Alternatives Considered

- **Option A — parallel arrays (`deployedStrut` + `deployedPlates[]` + `deployedExtensions[]`), the literal v3 shape.** Rejected: forces every consumer to walk three fields and special-case presence; reproduces v3's triplicated return code; the audit log wants one row-shape. The discriminated list is strictly better in v4 (we're not bound to v3's JS object shape, only its behavior).
- **Per-component events (`ComponentDeployed` / `ComponentReturned`, one event each).** Rejected: shatters one human deploy action into N log entries; the reducer must then answer "is this shore fully equipped?" by folding multiple events; breaks the workflow's "deploy = the atomic pending→process move"; and gains nothing — the store already gets atomicity from the single Dexie transaction, so there's no isolation benefit to separate events. It would also *re-introduce* the `commitMany` problem (a deploy would now be a batch of inventory-consequential events).
- **One global deploy event for a whole grouped shore (all 3 posts in one event).** Rejected: contradicts L-7's member-by-member group handling and the just-shipped group-aware step-back (which deliberately operates per In-Process member). Grouped members must remain independently deployable/reversible.
- **Source the plate from the same rig as the strut (simplify away the multi-rig case).** Rejected outright — this is the exact requirement Alex raised; the whole point is that components come from *different* rigs. v3 already supports independent sourcing; regressing it fails the bar.
- **Keep plates as pure deductions, never source them (extensions-and-struts only).** Rejected: breaks v3 parity (v3 decrements plates) and the inventory spec's stated contract ("the stock a deploy decrements and a return restores" explicitly includes connector plates).

---

## Consequences

- **Positive:** the field requirement is met — a shore can pull pieces from multiple rigs, and every rig's stock stays truthful through deploy / step-back / end-of-op. v4 reaches v3 inventory parity on the deploy path. Atomicity is stronger than v3 (native Dexie transaction vs hand-rolled compensation). The audit log gains a clean per-component sourced record for after-action.
- **Negative (accepted costs):**
  - The deploy event grows a literal rename (`StrutDeployed` → `EquipmentDeployed`) and the schema gains `DeployedComponent`/`DeployedBom`; the union keeps the old members for parse-compat (slight schema surface growth, permanent).
  - The engine result contract must start surfacing extension (and the deploy path, plate) `inventoryId`s — a real change to `engine.ts`'s output and its pinned tests (`engine.test.ts`), which are VERBATIM-from-v3 and guarded. This must be **additive** (append id fields to the result; don't touch the math) so the v3-parity assertions stay green.
  - A new (rare) source-disambiguation step in the deploy sheet — net-new UX, even if it only shows on multi-rig ambiguity.
- **Neutral:** the card's strut identity line is unchanged (driven by `bomStrut()`); grouped deploy/step-back loops are unchanged in shape; `commitMany` is unchanged. Plate/extension stock *display* (deployed-count badges) comes along with the Inventory block, not here.
- **Sequencing dependency:** the full feature needs plate/extension **stock to exist**, which needs the Inventory Add-Equipment grids ([#200](https://github.com/Vergo402/paratech-struts/issues/200)). The phased plan (below) builds the schema/event/store/engine core *now* (testable via seeded + Excel-imported stock), and lands the UX + the Inventory grids together.

---

## Implementation & sequencing

A dependency-aware, four-phase plan. The slice has no production data, so every phase is independently testable; the gating dependency is **plate/extension stock existing**, which Phase 1 unblocks with a seed/Excel path so Phases 2–3 don't wait on the full Inventory UI.

### Phase 0 — Engine result carries component inventory ids (unblock sourcing)

- **Files:** `src/core/load/engine.ts`, `engine.test.ts`.
- **What:** the engine already *pools* extension availability across rigs to decide a combo is offered; make it also **retain the stock-record id(s)** it would source from. Append to `StrutCombination` an optional `extensionSources?: { length: number; inventoryId: string }[]` (and leave the strut's existing `inventoryId`). **Additive only** — the selection math and every existing assertion are untouched; new assertions cover the id surfacing.
- **Verify:** `engine.test.ts` stays green on all v3-parity cases; new cases assert the extension ids appear when inventory is passed and are `null`/absent in catalog mode.
- **No dependency.** Can land immediately.

### Phase 1 — Inventory stock for plates + extensions exists and is seedable (the gating dependency)

- **Files:** the Inventory block ([#200](https://github.com/Vergo402/paratech-struts/issues/200)) Add-Equipment plate + extension grids; the Excel/CSV three-type round-trip ([#307](https://github.com/Vergo402/paratech-struts/issues/307), already specced in `40-inventory.md`); a dev **seed** path that loads plate/extension stock.
- **What:** `InventoryItem` already models `type:'plate'|'extension'` — this is the *UI + import* to populate them. The Excel `Plate ID` / `Extension Length` columns already exist in the spec. The minimum to unblock Phases 2–3 is: **stock records of all three types can be created** (grid, import, or seed).
- **Verify:** Excel round-trip test (export → import) preserves plate + extension rows with ids; a seeded fixture yields plate/extension `InventoryItem`s. This is the heaviest phase but it's mostly the already-specced Inventory work — ADR-033 only *needs the stock to exist*, it doesn't own the whole Inventory tab.
- **Depends on:** nothing in ADR-033; it's the Inventory epic. **Phases 2–3 depend on this for end-to-end test, but can be built against seeded fixtures in parallel.**

### Phase 2 — Schema + event + store + reducer (the BOM core)

- **Files:** `src/core/schema/shorepoint.ts` (add `DeployedComponent`/`DeployedBom`, `deployedBom` on `ShorePoint`, keep `DeployedStrut`); `src/core/schema/event.ts` (add `EquipmentDeployed`/`EquipmentReturned`, keep `StrutDeployed`/`StrutReturned` for parse-compat); `src/data/store/inventoryStore.ts` (`applyDeployTxn`/`applyReturnTxn` are already per-id — reused as-is); `src/data/store/operationStore.ts` (`commit`: loop the BOM's component txns inside the one `rw` transaction for the new events; keep the legacy single-strut branch); `src/core/shorepoint/reducer.ts` + `src/core/operation/reducer.ts` (project both event families to `deployedBom`; legacy → one-component BOM); core helpers `bomStrut`/`bomReturnList`.
- **What:** the entire deploy/return engine, behind the existing `commit` API. No UI yet — deploy can be exercised by committing a hand-built `EquipmentDeployed` in a test.
- **Verify (this is where the rigor lives):**
  - `operationStore` test: an `EquipmentDeployed` with a 3-component BOM (strut Rescue 2 + plate Engine 1 + extension Engine 1) decrements **all three** correct stock records, in one transaction.
  - **Atomicity:** if any one component is missing/zero-available, the **whole** commit rolls back — no event appended, **no** partial decrement (the L-8 + Dexie-transaction guarantee). A dedicated test asserts stock is untouched after a failed multi-component deploy.
  - `EquipmentReturned` restores every component to its own rig (clamped ≤ quantity).
  - **Legacy projection:** a log of old `StrutDeployed`/`StrutReturned` events boots to the identical state as before (one-component BOM); the reducer test pins it.
  - Group-aware step-back: looping `EquipmentReturned` per member restores each member's full BOM independently (extends the existing step-back test).
- **Depends on:** Phase 0 (for the eventual UI to *fill* the BOM; the core tests can hand-build BOMs without it). Testable against Phase 1 seed fixtures.

### Phase 3 — Deploy UX: source resolution + the disambiguation step

- **Files:** `src/ui/operations/AssignEquipmentSheet.tsx` (two-step deploy), `src/ui/operations/AddShorePointModal.tsx` (one-step inline deploy, ADR-027) — both build the BOM and resolve sources before `commit`; `src/ui/operations/RecommendationCard.tsx` (generalize the single "from Rescue 2" line to a per-component source summary when a BOM has >1 source); a new compact in-sheet **source step** component for the ambiguous case; `src/ui/operations/StepBackConfirmModal.tsx` (copy generalizes from "this strut" to "this shore's equipment"; mechanics unchanged — it already loops per member).
- **What:** the auto-source-silently / disambiguate-when-needed / not-stocked-policy layer from Decision 4. The plate visual-grid *selection* picker is **not touched** (it's deduction selection); this adds plate/extension *sourcing*.
- **Verify:** component tests for (a) single-rig auto-source → one tap, no extra step; (b) two-rig ambiguity → source step renders, choice flows into the BOM; (c) not-stocked → quick-add path adds stock then deploys tracked; (c′) not-stocked → **Deploy-untracked requires the confirmation popup**, and on confirm records the component `source:'untracked'` with no decrement and the "untracked" flag (and a return skips it); (d) RecommendationCard renders multi-source summary + the untracked flag. Live-drive on the slice (preview MCP) once Phase 1 stock exists.
- **Depends on:** Phase 0 (engine ids), Phase 2 (event/store), Phase 1 (real stock to source from — **and the quick-add flow**, which the resolved not-stocked policy reuses).

### Test strategy summary

- **Core/store (Phase 2)** is the load-bearing test surface — pure Vitest, no UI, hand-built BOMs and seeded inventory fixtures. Atomicity + legacy projection + group-aware restore are the must-pin cases.
- **Engine (Phase 0)** — additive assertions only; the VERBATIM v3-parity suite stays green.
- **UI (Phase 3)** — Testing Library for the auto/ambiguous/not-stocked branches; preview-MCP live drive for the real feel.
- **Excel round-trip (Phase 1)** — the three-type import/export already specced.

---

## Product decisions — resolved (Alex, 2026-06-15)

1. **(Q3) Plate model NOT in any on-scene rig's stock → three deliberate paths, no silent drift (Alex, 2026-06-15).** The source step offers:
   - **(a) Quick-add, then deploy** — add the plate to a chosen rig's count on the spot, then deploy + decrement normally. The primary, do-it-right path; counts stay honest. Reuses the Inventory block's Add-Equipment quick-add flow (Phase 3 → Phase 1 tie).
   - **(b) Deploy untracked** — deploy the shore with that component recorded **untracked** (`source:'untracked'`, no `inventoryId`, no decrement, no restore), gated by an explicit **confirmation popup**: *"You're deploying a 6\" Swivel Base that isn't in tracked inventory — it won't be counted or returned. Deploy anyway?"* The component is flagged "untracked" on the card and in after-action. This is the field-reality escape hatch (the plate physically exists even if un-entered, or came from a non-tracked mutual-aid source) — but it is **always confirmed and visible**, never silent.
   - **(c) Set to None** — deploy without the piece (a deduction change).

   Chosen over plain "block" (v3 parity) for field-reality, and over silent deploy-untracked — the **confirmation popup is the guardrail**, so an off-book deploy is always deliberate and flagged.

2. **(Q3, extensions) Same quick-add model, applied consistently.** Rather than keep v3's asymmetry (block plates / silently skip extensions), a short extension follows the **same quick-add-then-deploy** path as plates — Alex's plate call extended for consistency + honest counts. Recorded default; revisable when Phase 3 is built.

3. **Disambiguation default when multiple rigs stock a component → the rig the strut came from.** Pre-answers the common "one shore, one rig" case so the operator just confirms; predictable over load-spreading. Recorded default; revisable at Phase 3.

---

## Related

- **Principles:** 4 (one primary action — deploy stays one tap on the floor case), 9 (labeled controls — the source step), 10 (no silent data loss — atomic deploy, restore-each-on-return).
- **Lessons:** L-2 (deduct-exact/floor-once — selection math untouched), L-7 (status-monotonic + group lockstep — one event per member), L-8 (available≤quantity / abort-on-missing-node / one-txn-at-a-time — each component L-8-guarded; "one at a time" = one *event* at a time, unchanged).
- **Other ADRs:** [ADR-009](ADR-009-database-firebase-rtdb.md) (event log spine), [ADR-027](ADR-027-deploy-mode-and-v3-shore-point-entry.md) (one-step/two-step deploy surfaces), [ADR-016](ADR-016-modal-vs-sheet-rules.md) (deploy = sheet; step-back = inventory-consequential modal), [ADR-030](ADR-030-recoverable-shore-point-delete.md), [ADR-032](ADR-032-surface-adaptive-pickers.md) (plate grid preserved/deferred).
- **Realizes:** [`40-inventory.md`](../08-information-architecture/40-inventory.md) ("the stock a deploy decrements and a return restores" — now includes plates + extensions), [`13-slice/_PHASE-I-TAB-BUILD-SEQUENCE.md`](../13-slice/_PHASE-I-TAB-BUILD-SEQUENCE.md) ("extension + base-plate stock decrement deferred from Phase H").
- **Amends:** workflow [#221](../09-workflows/12-deploying-a-strut.md) (Assign Equipment now resolves a multi-component BOM; the deployed identity is a BOM, not a lone strut).
- **Resolved product calls (Alex, 2026-06-15):** plate not-stocked = quick-add-then-deploy; extensions follow the same quick-add model; disambiguation defaults to the strut's rig.

---

## Notes

Grounding reads behind this ADR (all verified, not recalled): v3 `deployShorePoint` (app.js:6430), `runDeployTransactions` (8099), `returnInventoryItems`/`returnOneInventoryItem` (8192/8223) — the parity reference; v4 `src/core/schema/{shorepoint,event,inventory}.ts`, `src/data/store/{operationStore,inventoryStore}.ts`, `src/core/{shorepoint,operation}/reducer.ts`, `src/core/load/engine.ts`, `src/ui/operations/{AssignEquipmentSheet,AddShorePointModal,StepBackConfirmModal,RecommendationCard}.tsx`, `src/ui/hooks/useRecommendations.ts`. The single biggest implementation risk is **Phase 0** — touching `engine.ts` (VERBATIM-from-v3, pinned by `engine.test.ts`) to surface component ids; it must be strictly additive so the parity suite stays green.

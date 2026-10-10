import { createStore, type StoreApi } from 'zustand/vanilla';
import { newId } from '@core/id';
import { InventoryItem, type StockRow } from '@core/schema';
import { heldOf as heldOfCounts, type HeldCounts } from '@core/operation';
import type { ParsedImportRow } from '../inventory/excel';
import { type FieldShoreDB } from './db';
import { APPARATUS_ROSTER_KEY, type ApparatusStoreApi } from './apparatusStore';
import { wrapBlob, type CloudRow } from '../sync/stateSync';

// The in-memory mirror of the Dexie `inventory` table plus the stock mutators the
// Inventory screen drives. The Dexie table is the durable truth for what each rig
// CARRIES (`quantity`); this store is the synchronous read path for the hooks (L-4 — UI
// never does a fresh Dexie read per render).
//
// ADR-041 — stock OUT ON SCENE is not stored here. operationStore folds the event log and
// pushes `held` (units per row id held by deployed equipment, every op in the bucket) via
// setHeld(); the view `items` is `rows` joined with it: `available = quantity − held`,
// SIGNED (negative = over-allocated, two crews claimed one unit — the truthful rendering,
// D2). Deploy/return never write a stock row, so the only writer of a Dexie row is a
// manual edit (here) or a peer's manual edit (applyRemoteRow). Each mutator still reads
// AND writes inside one `rw` transaction via a fresh `get(id)` — two quick taps must not
// read the same stale quantity — and reads `held` from the in-memory fold, which is the
// only place it exists.
//
// Quantity is DIRECT-DEXIE, not event-sourced — inventory is pre-incident mutable state,
// last-write-wins across devices (cloud-sync Increment 3).

export interface InventoryState {
  /** The persisted rows (Dexie mirror). No derived fields. */
  rows: InventoryItem[];
  /** Units held per row id, from the folded event log (absent id = 0). */
  held: HeldCounts;
  /** The derived view every reader uses: rows + held + signed available. */
  items: StockRow[];
}

/** A new stock record minus the app-managed fields (id minted; quantity set). */
export type AddSpec = Omit<InventoryItem, 'id' | 'quantity'>;

export interface ImportResult {
  imported: number;
  skipped: number;
}

export interface InventoryStoreApi {
  store: StoreApi<InventoryState>;
  /** Read the whole table into memory (boot / after a bulk write). */
  boot(): Promise<void>;
  /** Upsert one row into the mirror (replace if present, else append). */
  applyLocal(item: InventoryItem): void;
  /** Drop one row from the mirror. */
  removeLocal(id: string): void;
  /** Replace the held counts (operationStore, after every fold). Skips — no state change,
   *  no re-render — when the counts are equal to the current ones. */
  setHeld(held: HeldCounts): void;
  /** Units of one row held by deployed equipment (0 when none). */
  heldOf(id: string): number;
  // ---- cloud-sync Increment 3 (LWW pull-down; the listener owns the newer-wins guard) ----
  /** Apply a remote row: durable write THEN mirror. The peer's quantity is persisted
   *  VERBATIM (ADR-041: a local floor clamp made quantity diverge per device; a quantity
   *  below held reads as over-allocated instead). Does NOT re-push (no echo). */
  applyRemoteRow(row: CloudRow): Promise<void>;
  /** Apply a remote tombstone: delete the row unless units are held (never strand a
   *  deployed unit). Does NOT re-push. */
  applyRemoteDelete(id: string): Promise<void>;
  /** Push cloud tombstones for rows deleted OUTSIDE the stock mutators (the apparatus
   *  cascade bulk-deletes directly), so peers don't resurrect orphaned cloud rows. */
  tombstoneCloud(ids: string[]): void;
  // ---- stock mutators (Inventory screen) ----
  /** Quick-add: increment the matching row on the rig, or create it at quantity 1.
   *  Resolves to the affected row's id. */
  addOne(spec: AddSpec): Promise<string>;
  /** ± up: one more physical unit. */
  incrementItem(id: string): Promise<void>;
  /** ± down: one fewer unit; no-op when none is available (quantity − held ≤ 0); removes
   *  the row when its last unit is dropped and nothing is held. */
  decrementItem(id: string): Promise<void>;
  /** Set the physical count; floored at held; 0 removes the row. */
  setQuantity(id: string, quantity: number): Promise<void>;
  /** Remove the row; refuses while any unit is held. */
  removeItem(id: string): Promise<void>;
  /** Merge stock from a parsed CSV: upsert by ID, provision new apparatus for blank
   *  Apparatus-ID rows (atomic with the items, via the roster store), and skip any row
   *  whose quantity would fall below the units it holds. */
  upsertImport(rows: ParsedImportRow[], apparatus: ApparatusStoreApi): Promise<ImportResult>;
}

function sameIdentity(i: InventoryItem, s: AddSpec): boolean {
  if (i.apparatusId !== s.apparatusId || i.type !== s.type) return false;
  if (s.type === 'strut') return i.model === s.model;
  if (s.type === 'extension') return i.length === s.length && i.system === s.system;
  return i.plateId === s.plateId; // plate
}

// Like sameIdentity but rig-agnostic — the KIND of a stock record (type + descriptor).
// An import that reuses an id must not change this (it would strand a deployed ref).
function sameKind(a: InventoryItem, b: AddSpec): boolean {
  if (a.type !== b.type) return false;
  if (b.type === 'strut') return a.model === b.model;
  if (b.type === 'extension') return a.length === b.length && a.system === b.system;
  return a.plateId === b.plateId; // plate
}

// Cloud-write hooks (cloud-sync Increment 3) — fired AFTER the durable write so the
// registry can push the row/tombstone to /orgs/{deptId}/inventory. Injected (default
// no-op) so the store stays sync-ignorant + unit tests stay firebase-free. Only manual
// mutators fire these — deploy/return are events and never touch a stock row.
export interface InventoryCloudHooks {
  onRow?: (item: InventoryItem) => void;
  onDelete?: (id: string, lastWriteAt: number) => void;
}

/** The derived view: each row joined with its held count; available signed. */
function deriveItems(rows: readonly InventoryItem[], held: HeldCounts): StockRow[] {
  return rows.map((r) => {
    const h = heldOfCounts(held, r.id);
    return { ...r, held: h, available: r.quantity - h };
  });
}

/** Shallow equality of two held maps (same keys, same counts). */
function sameHeld(a: HeldCounts, b: HeldCounts): boolean {
  if (a === b) return true;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => Object.hasOwn(b, k) && a[k] === b[k]);
}

export function createInventoryStore(db: FieldShoreDB, hooks: InventoryCloudHooks = {}): InventoryStoreApi {
  const EMPTY_HELD: HeldCounts = {};
  const store = createStore<InventoryState>(() => ({ rows: [], held: EMPTY_HELD, items: [] }));

  const heldOf = (id: string): number => heldOfCounts(store.getState().held, id);

  // The single write choke point for manual stock edits: stamps the LWW clock AND parses
  // through the schema, which strips anything that isn't a persisted field — a legacy
  // `available` spread from an old Dexie row, or a view row's `held`/`available` — so a
  // derived value can never be written to Dexie or pushed to the cloud.
  const stamped = (item: InventoryItem): InventoryItem => InventoryItem.parse({ ...item, lastWriteAt: Date.now() });

  function setRows(rows: InventoryItem[]): void {
    const { held } = store.getState();
    store.setState({ rows, held, items: deriveItems(rows, held) }, true);
  }

  function applyLocal(item: InventoryItem): void {
    const { rows } = store.getState();
    const exists = rows.some((i) => i.id === item.id);
    setRows(exists ? rows.map((i) => (i.id === item.id ? item : i)) : [...rows, item]);
  }

  function removeLocal(id: string): void {
    setRows(store.getState().rows.filter((i) => i.id !== id));
  }

  function setHeld(held: HeldCounts): void {
    const s = store.getState();
    if (sameHeld(s.held, held)) return; // a fold that moved no stock → no re-render
    store.setState({ rows: s.rows, held, items: deriveItems(s.rows, held) }, true);
  }

  async function boot(): Promise<void> {
    // Read trust boundary: parse every durable row. Parsing strips a legacy row's
    // persisted `available` (pre-ADR-041) from the mirror; a corrupt row is dropped with a
    // warning rather than crashing every stock read. Durable rows are left as they are —
    // the vestigial field is harmless there and disappears on the row's next write.
    const raw = await db.inventory.toArray();
    const rows: InventoryItem[] = [];
    let dropped = 0;
    for (const r of raw) {
      const parsed = InventoryItem.safeParse(r);
      if (parsed.success) rows.push(parsed.data);
      else dropped++;
    }
    if (dropped) console.warn(`FieldShore: skipped ${dropped} unreadable inventory row(s) on load.`);
    setRows(rows);
  }

  // Each mutator RETURNS its outcome from the Dexie transaction (rather than mutating a
  // captured variable) — the value is correctly typed and the read+write stay in one txn.

  // Returns the affected row's id — the created row, or the incremented match —
  // so a caller (the deploy missing-piece quick-add, #330 Phase 3b) can re-point a
  // BOM component at the exact stock record it just added, no reactive round-trip.
  async function addOne(spec: AddSpec): Promise<string> {
    const result = await db.transaction('rw', db.inventory, async () => {
      const rigItems = await db.inventory.where('apparatusId').equals(spec.apparatusId).toArray();
      const match = rigItems.find((i) => sameIdentity(i, spec));
      if (match) {
        const updated = stamped({ ...match, quantity: match.quantity + 1 });
        await db.inventory.put(updated);
        return updated;
      }
      const created = stamped({ id: `inv-${newId()}`, quantity: 1, ...spec });
      await db.inventory.add(created);
      return created;
    });
    applyLocal(result);
    hooks.onRow?.(result);
    return result.id;
  }

  async function incrementItem(id: string): Promise<void> {
    const result = await db.transaction('rw', db.inventory, async () => {
      const item = await db.inventory.get(id);
      if (!item) throw new Error(`inventory item ${id} not found`);
      const updated = stamped({ ...item, quantity: item.quantity + 1 });
      await db.inventory.put(updated);
      return updated;
    });
    applyLocal(result);
    hooks.onRow?.(result);
  }

  // Shared removed/updated/noop dispatch tail of decrementItem + setQuantity
  // (#435 dedup): mirror the txn's outcome to the hot state + the cloud hooks.
  type MutateOutcome = { kind: 'noop' } | { kind: 'removed' } | { kind: 'updated'; item: InventoryItem };
  function dispatchOutcome(id: string, outcome: MutateOutcome): void {
    if (outcome.kind === 'removed') {
      removeLocal(id);
      hooks.onDelete?.(id, Date.now());
    } else if (outcome.kind === 'updated') {
      applyLocal(outcome.item);
      hooks.onRow?.(outcome.item);
    }
  }

  async function decrementItem(id: string): Promise<void> {
    const outcome = await db.transaction('rw', db.inventory, async (): Promise<MutateOutcome> => {
      const item = await db.inventory.get(id);
      // a concurrent removal (fast double-tap of −) is benign — no-op, don't throw
      if (!item) return { kind: 'noop' };
      const held = heldOf(id);
      if (item.quantity - held <= 0) return { kind: 'noop' }; // every unit is out on scene
      if (item.quantity === 1 && held === 0) {
        await db.inventory.delete(id); // last unit dropped, nothing held → remove the row
        return { kind: 'removed' };
      }
      const updated = stamped({ ...item, quantity: item.quantity - 1 });
      await db.inventory.put(updated);
      return { kind: 'updated', item: updated };
    });
    dispatchOutcome(id, outcome);
  }

  async function setQuantity(id: string, quantity: number): Promise<void> {
    const outcome = await db.transaction('rw', db.inventory, async (): Promise<MutateOutcome> => {
      const item = await db.inventory.get(id);
      if (!item) throw new Error(`inventory item ${id} not found`);
      if (!Number.isFinite(quantity)) return { kind: 'noop' }; // never persist NaN
      const q = Math.max(Math.trunc(quantity), heldOf(id)); // never below the units held
      if (q <= 0) {
        await db.inventory.delete(id); // held is 0 here (floored), so nothing is stranded
        return { kind: 'removed' };
      }
      const updated = stamped({ ...item, quantity: q });
      await db.inventory.put(updated);
      return { kind: 'updated', item: updated };
    });
    dispatchOutcome(id, outcome);
  }

  async function removeItem(id: string): Promise<void> {
    await db.transaction('rw', db.inventory, async () => {
      const item = await db.inventory.get(id);
      if (!item) throw new Error(`inventory item ${id} not found`);
      if (heldOf(id) > 0) throw new Error(`inventory item ${id} has deployed units (cannot remove)`);
      await db.inventory.delete(id);
    });
    removeLocal(id);
    hooks.onDelete?.(id, Date.now());
  }

  async function upsertImport(rows: ParsedImportRow[], apparatus: ApparatusStoreApi): Promise<ImportResult> {
    // Provision a new apparatus per unique blank-Apparatus-ID rig name (type unknown
    // from a 10-column file → 'Other'). Re-importing a blank-ID template mints fresh
    // rigs+rows each time; operators round-trip via export (which carries IDs).
    // Resolve a blank-Apparatus-ID row's rig by NAME against the existing roster and
    // stock first, so a row named like an existing rig reuses it instead of minting a
    // duplicate; only a genuinely new name creates a rig (type unknown from a 10-col
    // file → 'Other').
    const roster = apparatus.store.getState().roster;
    const nameToId = new Map<string, string>();
    for (const a of roster) if (!nameToId.has(a.name)) nameToId.set(a.name, a.id);
    for (const i of store.getState().rows) if (!nameToId.has(i.apparatus)) nameToId.set(i.apparatus, i.apparatusId);

    const newRigs = new Map<string, { id: string; name: string; type: 'Other' }>();
    for (const r of rows) {
      if (!r.apparatusId && !nameToId.has(r.apparatus)) {
        const rig = { id: `app-${newId()}`, name: r.apparatus, type: 'Other' as const };
        newRigs.set(r.apparatus, rig);
        nameToId.set(r.apparatus, rig.id);
      }
    }
    const apparatusIdFor = (r: ParsedImportRow) => r.apparatusId || nameToId.get(r.apparatus)!;
    const nextRoster = [...roster, ...newRigs.values()];

    let imported = 0;
    let skipped = 0;
    const now = Date.now(); // one LWW stamp for the whole import batch
    const importedIds: string[] = [];
    await db.transaction('rw', db.meta, db.inventory, async () => {
      for (const r of rows) {
        const apparatusId = apparatusIdFor(r);
        const fields: AddSpec = {
          type: r.type,
          model: r.model,
          system: r.system,
          plateId: r.plateId,
          length: r.length,
          apparatus: r.apparatus,
          apparatusId,
        };
        let id: string;
        if (r.id) {
          const existing = await db.inventory.get(r.id);
          if (existing) {
            // never re-TYPE a record by reusing its id — return resolves by id only,
            // so a transmuted row would restore the wrong item.
            if (!sameKind(existing, fields)) {
              skipped++;
              continue;
            }
          }
          // The orphan guard: a quantity below the units held would strand a deployed
          // unit. Checked for a new id too — a peer's deploy may hold an id this device
          // has no row for yet.
          if (r.quantity < heldOf(r.id)) {
            skipped++;
            continue;
          }
          id = r.id;
          await db.inventory.put({ ...fields, id, quantity: r.quantity, lastWriteAt: now });
        } else {
          id = `inv-${newId()}`;
          await db.inventory.add({ ...fields, id, quantity: r.quantity, lastWriteAt: now });
        }
        importedIds.push(id);
        imported++;
      }
      if (newRigs.size > 0) {
        await db.meta.put({ key: APPARATUS_ROSTER_KEY, value: JSON.stringify(wrapBlob(nextRoster, now)) });
      }
    });
    await boot();
    if (newRigs.size > 0) await apparatus.boot();
    // Push the imported rows + (if rigs were provisioned) the roster blob to the cloud.
    // After boot() the mirror holds the durable rows; push each by id (LWW, idempotent).
    if (hooks.onRow) {
      const byId = new Map(store.getState().rows.map((i) => [i.id, i]));
      for (const id of importedIds) {
        const it = byId.get(id);
        if (it) hooks.onRow(it);
      }
    }
    if (newRigs.size > 0) apparatus.pushRoster();
    return { imported, skipped };
  }

  // ---- cloud-sync Increment 3: LWW pull-down (listener decides newer-wins) ----
  async function applyRemoteRow(row: CloudRow): Promise<void> {
    // Validate the wire row before it touches local state (the read-side integrity
    // boundary — the cloud `.validate` is coarse, like the event envelope). A malformed
    // peer write (missing quantity, wrong type) is DROPPED, never persisted. The quantity
    // is taken VERBATIM — no floor at the units held here (ADR-041): every device must
    // persist the same quantity, and a quantity below held renders as over-allocated.
    const parsed = InventoryItem.safeParse(row);
    if (!parsed.success) return;
    await db.inventory.put(parsed.data);
    applyLocal(parsed.data); // no onRow — pulled-down, never re-pushed (no echo)
  }

  async function applyRemoteDelete(id: string): Promise<void> {
    if (heldOf(id) > 0) return; // units are out on scene — never strand them
    const removed = await db.transaction('rw', db.inventory, async () => {
      const local = await db.inventory.get(id);
      if (!local) return false; // already gone
      await db.inventory.delete(id);
      return true;
    });
    if (removed) removeLocal(id);
  }

  function tombstoneCloud(ids: string[]): void {
    const now = Date.now();
    for (const id of ids) hooks.onDelete?.(id, now);
  }

  return {
    store,
    boot,
    applyLocal,
    removeLocal,
    setHeld,
    heldOf,
    applyRemoteRow,
    applyRemoteDelete,
    tombstoneCloud,
    addOne,
    incrementItem,
    decrementItem,
    setQuantity,
    removeItem,
    upsertImport,
  };
}

/** The app's singleton inventory store, bound to the singleton DB. */
// The dept-scoped singleton lives in registry.ts (recreated per-department on a
// switch); this file exports only the factory + helpers.

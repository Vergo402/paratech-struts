import { createStore, type StoreApi } from 'zustand/vanilla';
import { newId } from '@core/id';
import { InventoryItem } from '@core/schema';
import type { ParsedImportRow } from '../inventory/excel';
import { type FieldShoreDB } from './db';
import { APPARATUS_ROSTER_KEY, type ApparatusStoreApi } from './apparatusStore';
import { wrapBlob, type CloudRow } from '../sync/stateSync';

// The in-memory mirror of the Dexie `inventory` table, plus the stock mutators the
// Inventory screen drives and the L-8 transaction helpers operationStore.commit runs
// for inventory-consequential events. The Dexie table is the durable truth for stock;
// this store is the synchronous read path for the hooks (L-4 — UI never does a fresh
// Dexie read per render).
//
// Stock-setting (quantity) is DIRECT-DEXIE, not event-sourced — inventory is pre-incident
// mutable state, not an incident audit log. Every mutator that derives a new value from an
// existing row reads AND writes inside one `rw` Dexie transaction via a fresh `get(id)`,
// never from the mirror — because operationStore's deploy/return path writes the same
// `available` field, and the mirror only updates AFTER the durable write. The transaction
// is the serialization point that keeps the two write paths from clobbering each other.

export interface InventoryState {
  items: InventoryItem[];
}

/** A new stock record minus the app-managed fields (id minted; quantity/available set). */
export type AddSpec = Omit<InventoryItem, 'id' | 'quantity' | 'available'>;

export interface ImportResult {
  imported: number;
  skipped: number;
}

export interface InventoryStoreApi {
  store: StoreApi<InventoryState>;
  /** Read the whole table into memory (boot / after a bulk write). */
  boot(): Promise<void>;
  /** Upsert one item into the mirror (replace if present, else append). */
  applyLocal(item: InventoryItem): void;
  /** Drop one item from the mirror. */
  removeLocal(id: string): void;
  // ---- cloud-sync Increment 3 (LWW pull-down; the listener owns the newer-wins guard) ----
  /** Apply a remote row: durable write THEN mirror. `available` is event-owned, so it's
   *  recomputed locally (quantity − deployed, clamped at the deployed floor), never trusted
   *  off the wire. Does NOT re-push (no echo). */
  applyRemoteRow(row: CloudRow): Promise<void>;
  /** Apply a remote tombstone: delete the row (unless units are locally deployed — never
   *  strand a deployed unit). Does NOT re-push. */
  applyRemoteDelete(id: string): Promise<void>;
  /** Push cloud tombstones for rows deleted OUTSIDE the stock mutators (the apparatus
   *  cascade bulk-deletes directly), so peers don't resurrect orphaned cloud rows. */
  tombstoneCloud(ids: string[]): void;
  // ---- stock mutators (Inventory screen) ----
  /** Quick-add: increment the matching row on the rig, or create it at quantity 1.
   *  Resolves to the affected row's id. */
  addOne(spec: AddSpec): Promise<string>;
  /** ± up: one more physical unit (q+1, a+1). */
  incrementItem(id: string): Promise<void>;
  /** ± down: one fewer unit (q−1, a−1); no-op if all are deployed; removes the row
   *  when the last undeployed unit is dropped. */
  decrementItem(id: string): Promise<void>;
  /** Set the physical count; clamped at the deployed floor; 0 removes the row. */
  setQuantity(id: string, quantity: number): Promise<void>;
  /** Remove the row; refuses if any unit is deployed. */
  removeItem(id: string): Promise<void>;
  /** Merge stock from a parsed CSV: upsert by ID, provision new apparatus for blank
   *  Apparatus-ID rows (atomic with the items, via the roster store), and skip any row
   *  that would drop a deployed item below its deployed count. */
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
// no-op) so the store stays sync-ignorant + unit tests stay firebase-free. Only MANUAL
// mutators fire these; deploy/return (applyDeploy/ReturnTxn) do not — `available` is
// event-owned and must not bump the LWW clock.
export interface InventoryCloudHooks {
  onRow?: (item: InventoryItem) => void;
  onDelete?: (id: string, lastWriteAt: number) => void;
}

export function createInventoryStore(db: FieldShoreDB, hooks: InventoryCloudHooks = {}): InventoryStoreApi {
  const store = createStore<InventoryState>(() => ({ items: [] }));

  // The single LWW stamp choke point for manual stock edits. Routed through every
  // manual put/add below; NOT through applyDeployTxn/applyReturnTxn (those touch only
  // `available`, which we don't sync).
  const stamped = (item: InventoryItem): InventoryItem => ({ ...item, lastWriteAt: Date.now() });

  function applyLocal(item: InventoryItem): void {
    store.setState((s) => {
      const exists = s.items.some((i) => i.id === item.id);
      return { items: exists ? s.items.map((i) => (i.id === item.id ? item : i)) : [...s.items, item] };
    }, true);
  }

  function removeLocal(id: string): void {
    store.setState((s) => ({ items: s.items.filter((i) => i.id !== id) }), true);
  }

  async function boot(): Promise<void> {
    const items = await db.inventory.toArray();
    store.setState({ items }, true);
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
        const updated = stamped({ ...match, quantity: match.quantity + 1, available: match.available + 1 });
        await db.inventory.put(updated);
        return updated;
      }
      const created: InventoryItem = stamped({ id: `inv-${newId()}`, quantity: 1, available: 1, ...spec });
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
      const updated = stamped({ ...item, quantity: item.quantity + 1, available: item.available + 1 });
      await db.inventory.put(updated);
      return updated;
    });
    applyLocal(result);
    hooks.onRow?.(result);
  }

  async function decrementItem(id: string): Promise<void> {
    const outcome = await db.transaction('rw', db.inventory, async () => {
      const item = await db.inventory.get(id);
      // a concurrent removal (fast double-tap of −) is benign — no-op, don't throw
      if (!item) return { kind: 'noop' as const };
      if (item.available <= 0) return { kind: 'noop' as const }; // every unit is deployed
      if (item.quantity - item.available === 0 && item.quantity === 1) {
        await db.inventory.delete(id); // last undeployed unit dropped → remove the row
        return { kind: 'removed' as const };
      }
      const updated = stamped({ ...item, quantity: item.quantity - 1, available: item.available - 1 });
      await db.inventory.put(updated);
      return { kind: 'updated' as const, item: updated };
    });
    if (outcome.kind === 'removed') {
      removeLocal(id);
      hooks.onDelete?.(id, Date.now());
    } else if (outcome.kind === 'updated') {
      applyLocal(outcome.item);
      hooks.onRow?.(outcome.item);
    }
  }

  async function setQuantity(id: string, quantity: number): Promise<void> {
    const outcome = await db.transaction('rw', db.inventory, async () => {
      const item = await db.inventory.get(id);
      if (!item) throw new Error(`inventory item ${id} not found`);
      if (!Number.isFinite(quantity)) return { kind: 'noop' as const }; // never persist NaN
      const deployed = item.quantity - item.available;
      const q = Math.max(Math.trunc(quantity), deployed); // never below the deployed floor
      if (q <= 0) {
        await db.inventory.delete(id); // deployed is 0 here (clamped), so safe to remove
        return { kind: 'removed' as const };
      }
      const updated = stamped({ ...item, quantity: q, available: q - deployed });
      await db.inventory.put(updated);
      return { kind: 'updated' as const, item: updated };
    });
    if (outcome.kind === 'removed') {
      removeLocal(id);
      hooks.onDelete?.(id, Date.now());
    } else if (outcome.kind === 'updated') {
      applyLocal(outcome.item);
      hooks.onRow?.(outcome.item);
    }
  }

  async function removeItem(id: string): Promise<void> {
    await db.transaction('rw', db.inventory, async () => {
      const item = await db.inventory.get(id);
      if (!item) throw new Error(`inventory item ${id} not found`);
      if (item.quantity - item.available > 0) {
        throw new Error(`inventory item ${id} has deployed units (cannot remove)`);
      }
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
    for (const i of store.getState().items) if (!nameToId.has(i.apparatus)) nameToId.set(i.apparatus, i.apparatusId);

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
            const deployed = existing.quantity - existing.available;
            if (r.quantity < deployed) {
              skipped++; // would strand a deployed unit (the orphan guard)
              continue;
            }
            id = r.id;
            await db.inventory.put({ ...fields, id, quantity: r.quantity, available: r.quantity - deployed, lastWriteAt: now });
          } else {
            id = r.id;
            await db.inventory.add({ ...fields, id, quantity: r.quantity, available: r.quantity, lastWriteAt: now });
          }
        } else {
          id = `inv-${newId()}`;
          await db.inventory.add({ ...fields, id, quantity: r.quantity, available: r.quantity, lastWriteAt: now });
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
      const byId = new Map(store.getState().items.map((i) => [i.id, i]));
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
    // `available` is event-owned — recompute it, never trust the wire. Preserve the
    // local deployed count and clamp quantity UP to the deployed floor (mirrors
    // setQuantity / the import orphan guard), so a peer's lower quantity can never
    // strand a unit this device has deployed.
    const result = await db.transaction('rw', db.inventory, async () => {
      const local = await db.inventory.get(row.id);
      const deployed = local ? local.quantity - local.available : 0;
      const quantity = Math.max(row.quantity, deployed);
      // Validate the wire row before it touches local state (the read-side integrity
      // boundary — the cloud `.validate` is coarse, like the event envelope). A malformed
      // peer write (missing quantity → NaN, wrong type) is DROPPED, never persisted.
      const parsed = InventoryItem.safeParse({ ...row, quantity, available: quantity - deployed });
      if (!parsed.success) return null;
      await db.inventory.put(parsed.data);
      return parsed.data;
    });
    if (result) applyLocal(result); // no onRow — pulled-down, never re-pushed (no echo)
  }

  async function applyRemoteDelete(id: string): Promise<void> {
    const removed = await db.transaction('rw', db.inventory, async () => {
      const local = await db.inventory.get(id);
      if (!local) return false; // already gone
      if (local.quantity - local.available > 0) return false; // deployed — never strand
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

// ---- L-8 transaction helpers ----------------------------------------------
// Both run INSIDE a caller-opened 'rw' Dexie transaction that also covers the
// event append, so an abort (throw) rolls back the whole commit — stock and
// log can never diverge. Both throw on a missing node (no phantom items,
// v3.5.2 NEW-7) and the return clamps available ≤ quantity (no over-increment).

/** Decrement one available unit for a deploy. Throws to abort the txn. */
export async function applyDeployTxn(db: FieldShoreDB, inventoryId: string): Promise<InventoryItem> {
  const item = await db.inventory.get(inventoryId);
  if (!item) throw new Error(`inventory item ${inventoryId} not found (L-8 abort)`);
  if (item.available <= 0) throw new Error(`inventory item ${inventoryId} has none available (L-8 abort)`);
  const updated: InventoryItem = { ...item, available: item.available - 1 };
  await db.inventory.put(updated);
  return updated;
}

/** Return one unit, clamped to quantity. Throws to abort the txn. */
export async function applyReturnTxn(db: FieldShoreDB, inventoryId: string): Promise<InventoryItem> {
  const item = await db.inventory.get(inventoryId);
  if (!item) throw new Error(`inventory item ${inventoryId} not found (L-8 abort)`);
  const updated: InventoryItem = { ...item, available: Math.min(item.available + 1, item.quantity) };
  await db.inventory.put(updated);
  return updated;
}

/** The app's singleton inventory store, bound to the singleton DB. */
// The dept-scoped singleton lives in registry.ts (recreated per-department on a
// switch); this file exports only the factory + helpers.

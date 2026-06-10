import { createStore, type StoreApi } from 'zustand/vanilla';
import type { InventoryItem } from '@core/schema';
import { db as defaultDb, type FieldShoreDB } from './db';

// The in-memory mirror of the Dexie `inventory` table, plus the L-8 transaction
// helpers operationStore.commit runs for inventory-consequential events. The
// Dexie table is the durable truth for stock; this store is the synchronous
// read path for the hooks (L-4 — UI never does a fresh Dexie read per render).

export interface InventoryState {
  items: InventoryItem[];
}

export interface InventoryStoreApi {
  store: StoreApi<InventoryState>;
  /** Read the whole table into memory (boot / after seed). */
  boot(): Promise<void>;
  /** Replace one item in the in-memory mirror (after a durable txn write). */
  applyLocal(item: InventoryItem): void;
}

export function createInventoryStore(db: FieldShoreDB = defaultDb): InventoryStoreApi {
  const store = createStore<InventoryState>(() => ({ items: [] }));

  return {
    store,
    async boot() {
      const items = await db.inventory.toArray();
      store.setState({ items }, true);
    },
    applyLocal(item) {
      store.setState(
        (s) => ({ items: s.items.map((i) => (i.id === item.id ? item : i)) }),
        true,
      );
    },
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
export const inventoryStore = createInventoryStore();

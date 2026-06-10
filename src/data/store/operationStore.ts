import { createStore, type StoreApi } from 'zustand/vanilla';
import { FieldShoreEvent, type InventoryItem } from '@core/schema';
import {
  operationReducer,
  projectOperation,
  EMPTY_OPERATION_STATE,
  type OperationState,
} from '@core/operation';
import { db as defaultDb, type FieldShoreDB } from './db';
import { inventoryStore as defaultInventory, type InventoryStoreApi, applyDeployTxn, applyReturnTxn } from './inventoryStore';
import { syncService } from '../sync/syncService';

// The only legal mutation entry (module-boundaries.md, data/store). One commit =
// validate → durable Dexie append (+ the inventory transaction when the event is
// inventory-consequential) → THEN the in-memory state update → THEN the sync
// enqueue. Subscribers re-render only after the durable write lands, so a
// dropped phone loses nothing (L-4). State is held in a zustand vanilla store —
// the hooks' synchronous hot path; the event log stays the source of truth.
//
// NOTE — data/store ↔ data/sync is a function-level-only import cycle (store
// calls syncService.enqueue; sync calls operationStore.commit/getState). Safe
// in ESM: neither touches the other's binding during module init.

export type CommitResult = { ok: true } | { ok: false; reason: string };

export interface CommitOptions {
  /** Set by syncService.reconcile — a merged peer event must not re-enqueue. */
  fromRemote?: boolean;
}

export interface OperationStoreApi {
  store: StoreApi<OperationState>;
  commit(event: FieldShoreEvent, opts?: CommitOptions): Promise<CommitResult>;
  /** Rebuild in-memory state from the event log (boot path). */
  boot(): Promise<void>;
}

export function createOperationStore(opts?: {
  db?: FieldShoreDB;
  inventory?: InventoryStoreApi;
  enqueue?: (event: FieldShoreEvent) => void;
}): OperationStoreApi {
  const db = opts?.db ?? defaultDb;
  const inventory = opts?.inventory ?? defaultInventory;
  // Default dereferences the syncService binding at CALL time (cycle-safe).
  const enqueue = opts?.enqueue ?? ((event: FieldShoreEvent) => syncService.enqueue(event));

  const store = createStore<OperationState>(() => EMPTY_OPERATION_STATE);

  async function commit(raw: FieldShoreEvent, options?: CommitOptions): Promise<CommitResult> {
    // Garbage never enters the log — the schema is the gate (L-5 discipline).
    const parsed = FieldShoreEvent.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, reason: `invalid event: ${parsed.error.issues[0]?.message ?? 'schema mismatch'}` };
    }
    const event = parsed.data;

    // Inventory-consequential events get pre-flight guards the reducer alone
    // can't provide: if the reducer would skip the event but stock still moved,
    // log and stock would diverge. Reject up front instead.
    const state = store.getState();
    try {
      if (event.type === 'StrutDeployed') {
        const sp = state.shorePoints.find((s) => s.id === event.spId);
        if (!sp) return { ok: false, reason: `unknown shore point ${event.spId}` };
        if (sp.status !== 'pending') return { ok: false, reason: 'deploy requires a Pending shore point' };
        let updated: InventoryItem | undefined;
        await db.transaction('rw', db.events, db.inventory, async () => {
          updated = await applyDeployTxn(db, event.deployedStrut.inventoryId);
          await db.events.add({ ...event }); // clone — Dexie writes the seq key onto the object
        });
        inventory.applyLocal(updated!);
      } else if (event.type === 'StrutReturned') {
        const sp = state.shorePoints.find((s) => s.id === event.spId);
        if (!sp) return { ok: false, reason: `unknown shore point ${event.spId}` };
        if (sp.status !== 'process' || !sp.deployedStrut) {
          return { ok: false, reason: 'return requires an In-Process shore point with a deployed strut' };
        }
        const inventoryId = sp.deployedStrut.inventoryId; // L-8 ID round-trip
        let updated: InventoryItem | undefined;
        await db.transaction('rw', db.events, db.inventory, async () => {
          updated = await applyReturnTxn(db, inventoryId);
          await db.events.add({ ...event });
        });
        inventory.applyLocal(updated!);
      } else {
        // Plain append — the reducers already no-op illegal/stale events
        // deterministically, so projection can never crash on a logged event.
        await db.events.add({ ...event });
      }
    } catch (err) {
      // Includes the L-8 aborts (missing node, none available) and a duplicate
      // event id (&id unique index) — e.g. a peer event merged twice.
      return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }

    // Durable write landed — now (and only now) the UI may see it (L-4).
    store.setState(operationReducer(store.getState(), event), true);

    if (!options?.fromRemote) enqueue(event);
    return { ok: true };
  }

  return {
    store,
    commit,
    async boot() {
      // toArray() returns primary-key (seq) order — true local append order.
      const rows = await db.events.toArray();
      store.setState(projectOperation(rows), true);
    },
  };
}

/** The app's singleton operation store, bound to the singleton DB. */
export const operationStore = createOperationStore();

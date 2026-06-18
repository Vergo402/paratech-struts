import { createStore, type StoreApi } from 'zustand/vanilla';
import { FieldShoreEvent, type DeployedComponentRole, type InventoryItem } from '@core/schema';
import {
  operationReducer,
  projectOperation,
  projectOperationById,
  projectArchive,
  EMPTY_OPERATION_STATE,
  type OperationState,
  type ArchivedOperationSummary,
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
  /**
   * Atomic multi-event commit — a grouped Add Shore Point (#220) lands all N
   * member events as ONE durable batch (all-or-nothing) and one re-render.
   * Plain-append events only; inventory-consequential events (Equipment*
   * deploy/return/reclaim + ComponentResourced) need per-event pre-flight guards
   * and commit one at a time.
   */
  commitMany(events: FieldShoreEvent[], opts?: CommitOptions): Promise<CommitResult>;
  /** Rebuild in-memory state from the event log (boot path). */
  boot(): Promise<void>;
  /** Finished-incident summaries, newest-ended first (#238 Past-operations list).
   *  A cold-path read over the retained log — never the hot in-memory state. */
  readArchive(): Promise<ArchivedOperationSummary[]>;
  /** Re-project one operation by id (#238 read-only archive drill-in). */
  readOperation(opId: string): Promise<OperationState>;
}

// Collapse per-decrement snapshots to ONE mirror update per inventory id (last
// write wins = the final post-txn value), so a BOM that sources the same row more
// than once never replays an intermediate snapshot into the in-memory mirror.
function applyUpdates(inventory: InventoryStoreApi, updates: InventoryItem[]): void {
  const byId = new Map<string, InventoryItem>();
  for (const u of updates) byId.set(u.id, u);
  for (const u of byId.values()) inventory.applyLocal(u);
}

// The inventory record `type` a deployed component must source from — so a
// re-source can't point a strut slot at a plate row (ADR-033 decision 7 guard).
function roleToType(role: DeployedComponentRole): InventoryItem['type'] {
  return role === 'strut' ? 'strut' : role === 'extension' ? 'extension' : 'plate';
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

  // Serialize every mutation through one promise chain so each commit's synchronous
  // pre-flight snapshot (store.getState below) reflects the PRIOR commit's durable
  // result — two near-simultaneous deploys for one shore point can't both clear the
  // Pending guard and double-decrement stock (the log/stock divergence the guards
  // exist to prevent). Single-threaded callers pay nothing.
  let queue: Promise<unknown> = Promise.resolve();
  function serialize<T>(run: () => Promise<T>): Promise<T> {
    const next = queue.then(run);
    queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  async function doCommit(raw: FieldShoreEvent, options?: CommitOptions): Promise<CommitResult> {
    // Garbage never enters the log — the schema is the gate (L-5 discipline).
    const parsed = FieldShoreEvent.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, reason: `invalid event: ${parsed.error.issues[0]?.message ?? 'schema mismatch'}` };
    }
    const event = parsed.data;

    // Legacy single-strut events are REPLAY-ONLY: the reducer projects them into a
    // one-element BOM on boot/projection, but committing one HERE would skip the
    // inventory transaction (stock/log divergence, ADR-033). The app emits Equipment*
    // now; reject the legacy literals defensively (mirrors the commitMany guard).
    if (event.type === 'StrutDeployed' || event.type === 'StrutReturned') {
      return { ok: false, reason: 'legacy strut event is replay-only and cannot be committed' };
    }

    // Inventory-consequential events get pre-flight guards the reducer alone
    // can't provide: if the reducer would skip the event but stock still moved,
    // log and stock would diverge. Reject up front instead.
    const state = store.getState();
    try {
      if (event.type === 'EquipmentDeployed') {
        // ADR-033 — atomic BOM deploy: decrement EVERY tracked component from its
        // own rig inside the one transaction that appends the event. Any component
        // failing (missing node / none available) aborts the whole deploy — no
        // event, no partial stock move. Untracked components (no inventoryId) carry
        // no stock consequence and are skipped.
        const sp = state.shorePoints.find((s) => s.id === event.spId);
        if (!sp) return { ok: false, reason: `unknown shore point ${event.spId}` };
        if (sp.status !== 'pending') return { ok: false, reason: 'deploy requires a Pending shore point' };
        const updates: InventoryItem[] = [];
        await db.transaction('rw', db.events, db.inventory, async () => {
          for (const c of event.deployedBom) {
            if (c.inventoryId === undefined) continue; // untracked
            updates.push(await applyDeployTxn(db, c.inventoryId));
          }
          await db.events.add({ ...event }); // clone — Dexie writes the seq key onto the object
        });
        applyUpdates(inventory, updates);
      } else if (event.type === 'EquipmentReturned' || event.type === 'EquipmentReclaimed') {
        // Both restore the full BOM through the same L-8 transaction; they differ
        // only in the required current status and the status the reducer lands on
        // (return → pending, clears the BOM; reclaim → returned, keeps it as
        // history, #224). Each tracked component is restored to its own rig.
        const sp = state.shorePoints.find((s) => s.id === event.spId);
        if (!sp) return { ok: false, reason: `unknown shore point ${event.spId}` };
        const need = event.type === 'EquipmentReturned' ? 'process' : 'secured';
        if (sp.status !== need || !sp.deployedBom) {
          const label = need === 'process' ? 'In-Process' : 'Shore Secured';
          return { ok: false, reason: `return requires a ${label} shore point with deployed equipment` };
        }
        const bom = sp.deployedBom;
        const updates: InventoryItem[] = [];
        await db.transaction('rw', db.events, db.inventory, async () => {
          for (const c of bom) {
            if (c.inventoryId === undefined) continue; // untracked — nothing to restore
            updates.push(await applyReturnTxn(db, c.inventoryId));
          }
          await db.events.add({ ...event });
        });
        applyUpdates(inventory, updates);
      } else if (event.type === 'ComponentResourced') {
        // ADR-033 (decision 7) — re-point one deployed component: restore the old
        // rig's unit (if tracked) and consume the new rig's (if tracked) atomically.
        // Net-zero when the source row is unchanged — skip both ops, just log.
        const sp = state.shorePoints.find((s) => s.id === event.spId);
        if (!sp) return { ok: false, reason: `unknown shore point ${event.spId}` };
        if (!sp.deployedBom) return { ok: false, reason: 're-source requires a deployed shore point' };
        // Returned points keep their BOM as history (#224) but are no longer held —
        // re-sourcing one would move stock against an already-reclaimed assembly.
        if (sp.status === 'returned') return { ok: false, reason: 'cannot re-source returned equipment' };
        const old = sp.deployedBom[event.componentIndex];
        if (!old) return { ok: false, reason: `no component at index ${event.componentIndex}` };
        const updates: InventoryItem[] = [];
        await db.transaction('rw', db.events, db.inventory, async () => {
          if (old.inventoryId !== event.inventoryId) {
            // Kind guard: the new row must match the component's role (no strut slot
            // re-pointed at a plate row). Throw to abort — no stock move, no event.
            if (event.inventoryId !== undefined) {
              const newRow = await db.inventory.get(event.inventoryId);
              if (!newRow) throw new Error(`inventory item ${event.inventoryId} not found (L-8 abort)`);
              if (newRow.type !== roleToType(old.role)) {
                throw new Error(`re-source kind mismatch: ${old.role} cannot source from a ${newRow.type} row`);
              }
            }
            if (old.inventoryId !== undefined) updates.push(await applyReturnTxn(db, old.inventoryId));
            if (event.inventoryId !== undefined) updates.push(await applyDeployTxn(db, event.inventoryId));
          }
          await db.events.add({ ...event });
        });
        applyUpdates(inventory, updates);
      } else if (event.type === 'OperationReopened') {
        // ADR-036 — un-archive a finished incident. Pre-flight: one active op at a
        // time, so reject if the board already holds one (the UI only offers this
        // from the empty state; this is defense-in-depth). Plain append otherwise.
        if (state.operation) return { ok: false, reason: 'an operation is already active' };
        await db.events.add({ ...event });
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

    // Durable write landed — now (and only now) the UI may see it (L-4). The three
    // lifecycle-boundary events re-derive from the full log (re-scopes the active op
    // to one incident; lets re-open rebuild a prior op's points the incremental
    // reducer can't); every other event keeps the incremental hot path.
    const lifecycle =
      event.type === 'OperationCreated' ||
      event.type === 'OperationEnded' ||
      event.type === 'OperationReopened';
    store.setState(
      lifecycle ? projectOperation(await db.events.toArray()) : operationReducer(store.getState(), event),
      true,
    );

    if (!options?.fromRemote) enqueue(event);
    return { ok: true };
  }

  async function doCommitMany(raws: FieldShoreEvent[], options?: CommitOptions): Promise<CommitResult> {
    if (raws.length === 0) return { ok: false, reason: 'empty batch' };

    // Validate the WHOLE batch before any write — garbage never enters the log.
    const events: FieldShoreEvent[] = [];
    for (const raw of raws) {
      const parsed = FieldShoreEvent.safeParse(raw);
      if (!parsed.success) {
        return { ok: false, reason: `invalid event: ${parsed.error.issues[0]?.message ?? 'schema mismatch'}` };
      }
      if (
        parsed.data.type === 'StrutDeployed' ||
        parsed.data.type === 'StrutReturned' ||
        parsed.data.type === 'EquipmentDeployed' ||
        parsed.data.type === 'EquipmentReturned' ||
        parsed.data.type === 'EquipmentReclaimed' ||
        parsed.data.type === 'ComponentResourced'
      ) {
        return { ok: false, reason: 'inventory-consequential events commit one at a time' };
      }
      events.push(parsed.data);
    }

    try {
      // All-or-nothing: an uncaught failure (e.g. a duplicate &id BulkError)
      // inside the transaction callback aborts the whole transaction. Do NOT
      // catch inside the callback — the abort must propagate.
      await db.transaction('rw', db.events, async () => {
        await db.events.bulkAdd(events.map((e) => ({ ...e }))); // clone — Dexie writes seq onto the object
      });
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }

    // Durable batch landed — fold all events, then ONE setState / re-render (L-4).
    store.setState(events.reduce(operationReducer, store.getState()), true);

    if (!options?.fromRemote) for (const e of events) enqueue(e);
    return { ok: true };
  }

  return {
    store,
    commit: (raw: FieldShoreEvent, options?: CommitOptions) => serialize(() => doCommit(raw, options)),
    commitMany: (raws: FieldShoreEvent[], options?: CommitOptions) => serialize(() => doCommitMany(raws, options)),
    async boot() {
      // toArray() returns primary-key (seq) order — true local append order.
      const rows = await db.events.toArray();
      store.setState(projectOperation(rows), true);
    },
    async readArchive() {
      return projectArchive(await db.events.toArray());
    },
    async readOperation(opId: string) {
      return projectOperationById(await db.events.toArray(), opId);
    },
  };
}

/** The app's singleton operation store, bound to the singleton DB. */
export const operationStore = createOperationStore();

import { createStore, type StoreApi } from 'zustand/vanilla';
import { z } from 'zod';
import { Apparatus } from '@core/schema';
import { type FieldShoreDB } from './db';
import type { InventoryStoreApi } from './inventoryStore';
import { wrapBlob, readBlobRow, type BlobEnvelope } from '../sync/stateSync';

// The department apparatus roster — which rigs exist, independent of the stock they
// carry. Durable copy is ONE json row in `meta` (APPARATUS_ROSTER_KEY), mirroring
// onboardingStore/sessionStore: validate on boot (trust boundary), durable write THEN
// setState (L-4). Kept here, not a Dexie table, on purpose — the roster is small and
// list-all-only, so a meta row needs no schema migration.
//
// Apparatus identity is `id`; InventoryItem.apparatus (name) is a denormalized display
// copy keyed back here by apparatusId. The Inventory scope tabs are the UNION of this
// roster and the distinct apparatusIds on stock, so a rig predating the roster
// (seeded/legacy) still shows a tab (labeled from item.apparatus). The deploy path is
// still name-keyed (deployedStrut.source = item.apparatus) — rename is out of scope this
// slice precisely because it would have to rewrite the immutable event log.

export const APPARATUS_ROSTER_KEY = 'fieldshore_apparatus_roster';

export interface ApparatusState {
  roster: Apparatus[];
}

export interface ApparatusStoreApi {
  store: StoreApi<ApparatusState>;
  /** Hydrate from the persisted meta row. */
  boot(): Promise<void>;
  /** Add or replace one rig (durable write THEN mirror). */
  addApparatus(a: Apparatus): Promise<void>;
  /** Guarded remove: refuses if any item on the rig is deployed (q−a > 0); otherwise
   *  cascade-deletes its available-only stock rows in the SAME transaction. Takes the
   *  inventory store to resync its mirror after the bulk delete (cross-store, injected
   *  to avoid a module cycle). */
  removeApparatus(id: string, inventory: InventoryStoreApi): Promise<void>;
  /** Replace one rig in the mirror after a durable write elsewhere (e.g. import). */
  applyLocal(a: Apparatus): void;
  // ---- cloud-sync Increment 3 (whole-blob LWW) ----
  /** The local blob's last-write stamp (epoch ms; 0 if never stamped). */
  localStamp(): number;
  /** Apply a remote roster blob: durable write (preserving the remote stamp) THEN mirror.
   *  No re-push (no echo). */
  applyRemote(value: unknown, stamp: number): Promise<void>;
  /** Push the current roster blob to the cloud (used after an inline import write). */
  pushRoster(): void;
}

// A wrong-shape row degrades to an empty roster rather than dead-ending boot — the
// scope-tab union still surfaces rigs that carry stock, so no rig silently vanishes.
const Roster = z.array(Apparatus).catch([]);

/** Cloud-write hook (cloud-sync Increment 3) — fired after the durable write so the
 *  registry can push the whole-roster blob to /orgs/{deptId}/apparatus. */
export interface ApparatusCloudHooks {
  onBlob?: (env: BlobEnvelope<Apparatus[]>) => void;
}

export function createApparatusStore(db: FieldShoreDB, hooks: ApparatusCloudHooks = {}): ApparatusStoreApi {
  const store = createStore<ApparatusState>(() => ({ roster: [] }));
  let stampVal = 0; // localStamp — the persisted blob's lastWriteAt

  function persist(roster: Apparatus[], stamp: number): Promise<unknown> {
    stampVal = stamp;
    return db.meta.put({ key: APPARATUS_ROSTER_KEY, value: JSON.stringify(wrapBlob(roster, stamp)) });
  }

  return {
    store,

    async boot() {
      let roster: Apparatus[] = [];
      stampVal = 0;
      const blob = await readBlobRow(db, APPARATUS_ROSTER_KEY);
      if (blob) {
        roster = Roster.parse(blob.value);
        stampVal = blob.lastWriteAt;
      }
      store.setState({ roster }, true);
    },

    async addApparatus(a) {
      const next = [...store.getState().roster.filter((r) => r.id !== a.id), a];
      const stamp = Date.now();
      await persist(next, stamp);
      store.setState({ roster: next }, true);
      hooks.onBlob?.(wrapBlob(next, stamp));
    },

    async removeApparatus(id, inventory) {
      const next = store.getState().roster.filter((r) => r.id !== id);
      const stamp = Date.now();
      let removedIds: string[] = [];
      // Read AND write inside one rw txn: the guard sees committed stock, and a throw
      // rolls back both the roster row and any cascade delete (L-8 discipline).
      await db.transaction('rw', db.meta, db.inventory, async () => {
        const items = await db.inventory.where('apparatusId').equals(id).toArray();
        if (items.some((i) => i.quantity - i.available > 0)) {
          throw new Error(`apparatus ${id} has deployed equipment (L-8 abort)`);
        }
        removedIds = items.map((i) => i.id);
        if (removedIds.length > 0) await db.inventory.bulkDelete(removedIds);
        await persist(next, stamp);
      });
      await inventory.boot(); // resync the inventory mirror after the cascade delete
      store.setState({ roster: next }, true);
      hooks.onBlob?.(wrapBlob(next, stamp));
      // The cascade bulk-deleted the rows directly (not via the stock mutators), so push
      // cloud tombstones for them — otherwise peers resurrect the orphaned cloud rows.
      inventory.tombstoneCloud(removedIds);
    },

    applyLocal(a) {
      store.setState((s) => ({ roster: [...s.roster.filter((r) => r.id !== a.id), a] }), true);
    },

    localStamp: () => stampVal,

    async applyRemote(value, stamp) {
      const roster = Roster.parse(value);
      await persist(roster, stamp); // preserve the REMOTE stamp (not Date.now)
      store.setState({ roster }, true);
    },

    pushRoster() {
      hooks.onBlob?.(wrapBlob(store.getState().roster, stampVal));
    },
  };
}

/** The app's singleton apparatus store, bound to the singleton DB. */
// The dept-scoped singleton lives in registry.ts (recreated per-department on a
// switch); this file exports only the factory + helpers.

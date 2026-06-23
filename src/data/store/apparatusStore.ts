import { createStore, type StoreApi } from 'zustand/vanilla';
import { z } from 'zod';
import { Apparatus } from '@core/schema';
import { type FieldShoreDB } from './db';
import type { InventoryStoreApi } from './inventoryStore';

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
}

// A wrong-shape row degrades to an empty roster rather than dead-ending boot — the
// scope-tab union still surfaces rigs that carry stock, so no rig silently vanishes.
const Roster = z.array(Apparatus).catch([]);

export function createApparatusStore(db: FieldShoreDB): ApparatusStoreApi {
  const store = createStore<ApparatusState>(() => ({ roster: [] }));

  function persist(roster: Apparatus[]): Promise<unknown> {
    return db.meta.put({ key: APPARATUS_ROSTER_KEY, value: JSON.stringify(roster) });
  }

  return {
    store,

    async boot() {
      let roster: Apparatus[] = [];
      const row = await db.meta.get(APPARATUS_ROSTER_KEY);
      if (row) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(row.value);
        } catch {
          parsed = undefined;
        }
        roster = Roster.parse(parsed);
      }
      store.setState({ roster }, true);
    },

    async addApparatus(a) {
      const next = [...store.getState().roster.filter((r) => r.id !== a.id), a];
      await persist(next);
      store.setState({ roster: next }, true);
    },

    async removeApparatus(id, inventory) {
      const next = store.getState().roster.filter((r) => r.id !== id);
      // Read AND write inside one rw txn: the guard sees committed stock, and a throw
      // rolls back both the roster row and any cascade delete (L-8 discipline).
      await db.transaction('rw', db.meta, db.inventory, async () => {
        const items = await db.inventory.where('apparatusId').equals(id).toArray();
        if (items.some((i) => i.quantity - i.available > 0)) {
          throw new Error(`apparatus ${id} has deployed equipment (L-8 abort)`);
        }
        if (items.length > 0) await db.inventory.bulkDelete(items.map((i) => i.id));
        await persist(next);
      });
      await inventory.boot(); // resync the inventory mirror after the cascade delete
      store.setState({ roster: next }, true);
    },

    applyLocal(a) {
      store.setState((s) => ({ roster: [...s.roster.filter((r) => r.id !== a.id), a] }), true);
    },
  };
}

/** The app's singleton apparatus store, bound to the singleton DB. */
// The dept-scoped singleton lives in registry.ts (recreated per-department on a
// switch); this file exports only the factory + helpers.

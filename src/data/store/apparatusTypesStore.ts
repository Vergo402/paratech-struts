import { createStore, type StoreApi } from 'zustand/vanilla';
import { z } from 'zod';
import { ApparatusTypeCustom } from '@core/schema';
import { type FieldShoreDB } from './db';
import { wrapBlob, unwrapBlob, type BlobEnvelope } from '../sync/stateSync';

// The department's custom apparatus-type vocabulary (#321 P5 inc4b) — types the
// department adds on top of the built-in APPARATUS_TYPES catalog (load/apparatus.ts).
// Durable copy is ONE json row in `meta` (APPARATUS_TYPES_KEY), mirroring
// customTitlesStore: validate on boot (trust boundary), durable write THEN setState
// (L-4), cloud-synced as a whole-blob LWW. A meta row (not a Dexie table) on purpose —
// small and list-all-only, no schema migration.
//
// No cascade guard on remove here (unlike apparatusStore): the editor's UI blocks a
// remove while any rig still uses the type, and a rig's type is plain text either way,
// so dropping a vocabulary entry never corrupts an existing rig.

export const APPARATUS_TYPES_KEY = 'fieldshore_apparatus_types';

export interface ApparatusTypesState {
  types: ApparatusTypeCustom[];
}

export interface ApparatusTypesStoreApi {
  store: StoreApi<ApparatusTypesState>;
  /** Hydrate from the persisted meta row. */
  boot(): Promise<void>;
  /** Add or replace one type (durable write THEN mirror). */
  addType(t: ApparatusTypeCustom): Promise<void>;
  /** Remove one type. */
  removeType(id: string): Promise<void>;
  // ---- cloud-sync (whole-blob LWW) ----
  /** The local blob's last-write stamp (epoch ms; 0 if never stamped). */
  localStamp(): number;
  /** Apply a remote types blob: durable write (preserving the remote stamp) THEN mirror. */
  applyRemote(value: unknown, stamp: number): Promise<void>;
}

// A wrong-shape row degrades to an empty vocabulary rather than dead-ending boot.
const Types = z.array(ApparatusTypeCustom).catch([]);

/** Cloud-write hook — push the whole-types blob to /orgs/{deptId}/apparatusTypes
 *  after the durable write. */
export interface ApparatusTypesCloudHooks {
  onBlob?: (env: BlobEnvelope<ApparatusTypeCustom[]>) => void;
}

export function createApparatusTypesStore(
  db: FieldShoreDB,
  hooks: ApparatusTypesCloudHooks = {},
): ApparatusTypesStoreApi {
  const store = createStore<ApparatusTypesState>(() => ({ types: [] }));
  let stampVal = 0;

  function persist(types: ApparatusTypeCustom[], stamp: number): Promise<unknown> {
    stampVal = stamp;
    return db.meta.put({ key: APPARATUS_TYPES_KEY, value: JSON.stringify(wrapBlob(types, stamp)) });
  }

  return {
    store,

    async boot() {
      let types: ApparatusTypeCustom[] = [];
      stampVal = 0;
      const row = await db.meta.get(APPARATUS_TYPES_KEY);
      if (row) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(row.value);
        } catch {
          parsed = undefined;
        }
        const { value, lastWriteAt } = unwrapBlob(parsed);
        types = Types.parse(value);
        stampVal = lastWriteAt;
      }
      store.setState({ types }, true);
    },

    async addType(t) {
      const next = [...store.getState().types.filter((x) => x.id !== t.id), t];
      const stamp = Date.now();
      await persist(next, stamp);
      store.setState({ types: next }, true);
      hooks.onBlob?.(wrapBlob(next, stamp));
    },

    async removeType(id) {
      const next = store.getState().types.filter((x) => x.id !== id);
      const stamp = Date.now();
      await persist(next, stamp);
      store.setState({ types: next }, true);
      hooks.onBlob?.(wrapBlob(next, stamp));
    },

    localStamp: () => stampVal,

    async applyRemote(value, stamp) {
      const types = Types.parse(value);
      await persist(types, stamp);
      store.setState({ types }, true);
    },
  };
}

// The dept-scoped singleton lives in registry.ts (recreated per-department on a
// switch); this file exports only the factory + helpers.

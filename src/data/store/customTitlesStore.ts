import { createStore, type StoreApi } from 'zustand/vanilla';
import { z } from 'zod';
import { CustomTitle } from '@core/schema';
import { type FieldShoreDB } from './db';
import { wrapBlob, readBlobRow, type BlobEnvelope } from '../sync/stateSync';

// The department's custom ICS-title library (#323) — titles the department adds on top
// of the built-in POSITION_LIBRARY catalog. Durable copy is ONE json row in `meta`
// (CUSTOM_TITLES_KEY), mirroring apparatusStore/onboardingStore: validate on boot (trust
// boundary), durable write THEN setState (L-4). A meta row (not a Dexie table) on
// purpose — small and list-all-only, no schema migration.
//
// No cascade guard on remove (unlike apparatusStore): a placed position copied its
// title+kind into the immutable event log at add time, so removing the library entry
// never touches an already-placed team or role.

export const CUSTOM_TITLES_KEY = 'fieldshore_custom_titles';

export interface CustomTitlesState {
  titles: CustomTitle[];
}

export interface CustomTitlesStoreApi {
  store: StoreApi<CustomTitlesState>;
  /** Hydrate from the persisted meta row. */
  boot(): Promise<void>;
  /** Add or replace one title (durable write THEN mirror). */
  addTitle(t: CustomTitle): Promise<void>;
  /** Remove one title (does NOT affect already-placed positions). */
  removeTitle(id: string): Promise<void>;
  // ---- cloud-sync Increment 3 (whole-blob LWW) ----
  /** The local blob's last-write stamp (epoch ms; 0 if never stamped). */
  localStamp(): number;
  /** Apply a remote titles blob: durable write (preserving the remote stamp) THEN mirror. */
  applyRemote(value: unknown, stamp: number): Promise<void>;
}

// A wrong-shape row degrades to an empty library rather than dead-ending boot.
const Titles = z.array(CustomTitle).catch([]);

/** Cloud-write hook (cloud-sync Increment 3) — push the whole-titles blob to
 *  /orgs/{deptId}/titles after the durable write. */
export interface CustomTitlesCloudHooks {
  onBlob?: (env: BlobEnvelope<CustomTitle[]>) => void;
}

export function createCustomTitlesStore(db: FieldShoreDB, hooks: CustomTitlesCloudHooks = {}): CustomTitlesStoreApi {
  const store = createStore<CustomTitlesState>(() => ({ titles: [] }));
  let stampVal = 0;

  function persist(titles: CustomTitle[], stamp: number): Promise<unknown> {
    stampVal = stamp;
    return db.meta.put({ key: CUSTOM_TITLES_KEY, value: JSON.stringify(wrapBlob(titles, stamp)) });
  }

  return {
    store,

    async boot() {
      let titles: CustomTitle[] = [];
      stampVal = 0;
      const blob = await readBlobRow(db, CUSTOM_TITLES_KEY);
      if (blob) {
        titles = Titles.parse(blob.value);
        stampVal = blob.lastWriteAt;
      }
      store.setState({ titles }, true);
    },

    async addTitle(t) {
      const next = [...store.getState().titles.filter((x) => x.id !== t.id), t];
      const stamp = Date.now();
      await persist(next, stamp);
      store.setState({ titles: next }, true);
      hooks.onBlob?.(wrapBlob(next, stamp));
    },

    async removeTitle(id) {
      const next = store.getState().titles.filter((x) => x.id !== id);
      const stamp = Date.now();
      await persist(next, stamp);
      store.setState({ titles: next }, true);
      hooks.onBlob?.(wrapBlob(next, stamp));
    },

    localStamp: () => stampVal,

    async applyRemote(value, stamp) {
      const titles = Titles.parse(value);
      await persist(titles, stamp);
      store.setState({ titles }, true);
    },
  };
}

/** The app's singleton custom-titles store, bound to the singleton DB. */
// The dept-scoped singleton lives in registry.ts (recreated per-department on a
// switch); this file exports only the factory + helpers.

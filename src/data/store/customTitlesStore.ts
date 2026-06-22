import { createStore, type StoreApi } from 'zustand/vanilla';
import { z } from 'zod';
import { CustomTitle } from '@core/schema';
import { db as defaultDb, type FieldShoreDB } from './db';

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
}

// A wrong-shape row degrades to an empty library rather than dead-ending boot.
const Titles = z.array(CustomTitle).catch([]);

export function createCustomTitlesStore(db: FieldShoreDB = defaultDb): CustomTitlesStoreApi {
  const store = createStore<CustomTitlesState>(() => ({ titles: [] }));

  function persist(titles: CustomTitle[]): Promise<unknown> {
    return db.meta.put({ key: CUSTOM_TITLES_KEY, value: JSON.stringify(titles) });
  }

  return {
    store,

    async boot() {
      let titles: CustomTitle[] = [];
      const row = await db.meta.get(CUSTOM_TITLES_KEY);
      if (row) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(row.value);
        } catch {
          parsed = undefined;
        }
        titles = Titles.parse(parsed);
      }
      store.setState({ titles }, true);
    },

    async addTitle(t) {
      const next = [...store.getState().titles.filter((x) => x.id !== t.id), t];
      await persist(next);
      store.setState({ titles: next }, true);
    },

    async removeTitle(id) {
      const next = store.getState().titles.filter((x) => x.id !== id);
      await persist(next);
      store.setState({ titles: next }, true);
    },
  };
}

/** The app's singleton custom-titles store, bound to the singleton DB. */
export const customTitlesStore = createCustomTitlesStore();

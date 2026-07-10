import { createStore, type StoreApi } from 'zustand/vanilla';
import { z } from 'zod';
import { type FieldShoreDB } from './db';
import { wrapBlob, readBlobRow, type BlobEnvelope } from '../sync/stateSync';

// Department-wide behavioural policies (#305, ADR-018) — how the app acts for the WHOLE
// department, not one device. Durable copy is ONE json row in `meta` (DEPT_POLICIES_KEY),
// cloud-synced as a whole-object LWW blob (mirrors customTitles/apparatusTypes, but an
// object not an array). manageSettings-gated by the rules.
//
// `afterActionEmail` is ON BY DEFAULT (ADR-018 §Opt-out): an ABSENT setting reads as true,
// so a fresh department gets the safe default and only a deliberate switch-off (stored
// false) disables it. The email TRANSPORT is Phase H — this store only persists + syncs
// the preference.

export const DEPT_POLICIES_KEY = 'fieldshore_dept_policies';

export interface DeptPoliciesState {
  afterActionEmail: boolean;
}

export interface DeptPoliciesStoreApi {
  store: StoreApi<DeptPoliciesState>;
  /** Hydrate from the persisted meta row (absent → defaults). */
  boot(): Promise<void>;
  /** Set the after-action-email policy (durable write THEN mirror). */
  setAfterActionEmail(on: boolean): Promise<void>;
  // ---- cloud-sync (whole-blob LWW) ----
  /** The local blob's last-write stamp (epoch ms; 0 if never stamped). */
  localStamp(): number;
  /** Apply a remote policies blob: durable write (preserving the remote stamp) THEN mirror. */
  applyRemote(value: unknown, stamp: number): Promise<void>;
}

// A wrong-shape row degrades to {} (→ all defaults) rather than dead-ending boot.
const Policies = z.object({ afterActionEmail: z.boolean() }).partial().catch({});

/** Resolve the stored (partial) blob into the full state, applying the on-by-default. */
function resolve(value: unknown): DeptPoliciesState {
  const parsed = Policies.parse(value);
  return { afterActionEmail: parsed.afterActionEmail ?? true };
}

export interface DeptPoliciesCloudHooks {
  onBlob?: (env: BlobEnvelope<DeptPoliciesState>) => void;
}

export function createDeptPoliciesStore(
  db: FieldShoreDB,
  hooks: DeptPoliciesCloudHooks = {},
): DeptPoliciesStoreApi {
  const store = createStore<DeptPoliciesState>(() => ({ afterActionEmail: true }));
  let stampVal = 0;

  function persist(state: DeptPoliciesState, stamp: number): Promise<unknown> {
    stampVal = stamp;
    return db.meta.put({ key: DEPT_POLICIES_KEY, value: JSON.stringify(wrapBlob(state, stamp)) });
  }

  return {
    store,

    async boot() {
      let state: DeptPoliciesState = { afterActionEmail: true };
      stampVal = 0;
      const blob = await readBlobRow(db, DEPT_POLICIES_KEY);
      if (blob) {
        state = resolve(blob.value);
        stampVal = blob.lastWriteAt;
      }
      store.setState(state, true);
    },

    async setAfterActionEmail(on) {
      const next: DeptPoliciesState = { afterActionEmail: on };
      const stamp = Date.now();
      await persist(next, stamp);
      store.setState(next, true);
      hooks.onBlob?.(wrapBlob(next, stamp));
    },

    localStamp: () => stampVal,

    async applyRemote(value, stamp) {
      const state = resolve(value);
      await persist(state, stamp);
      store.setState(state, true);
    },
  };
}

// The dept-scoped singleton lives in registry.ts (recreated per-department on a switch);
// this file exports only the factory + helpers.

import type { InventoryItem } from '@core/schema';
import {
  inventoryStore,
  apparatusStore,
  customTitlesStore,
  apparatusTypesStore,
  deptPoliciesStore,
  checklistTemplateStore,
} from '../store/registry';
import { sessionStore } from '../store/session';
import { syncService } from './syncService';
import { eventListenerSync } from './eventListener';
import { firebaseSubscribe } from './subscribe';
import {
  type BlobEnvelope,
  type BlobPath,
  type CloudRow,
  inventoryPath,
  isTombstone,
  stampOf,
  toCloudRow,
  wrapBlob,
} from './stateSync';

// data/sync — the cloud→local listener for NON-event STATE (cloud-sync Increment 3).
// A sibling of eventListener.ts, NOT an extension of it: state is last-write-wins
// (overwrite, newest stamp wins), not the append-only event stream, and it applies
// through the stores' applyRemote* paths, not ops.commit. Started from main.tsx after
// the event listener; a department switch is a FULL PAGE RELOAD, which tears these
// subscriptions down structurally (stop() exists for tests/symmetry).
//
// FOUR separate subscriptions (inventory + the three meta blobs) rather than one over
// orgs/{deptId} — so a stock edit never re-delivers the whole event log.
//
// FIRST SNAPSHOT = TWO-WAY MERGE (like the event listener): pull cloud records that are
// newer than local DOWN, and push local records newer-than-or-absent-in-cloud UP (a
// member who edited offline then reloaded, or a department's first device). An empty
// cloud is never a delete — it just means "push local up".
//
// KNOWN LIMITATIONS (v4.0) — all inherent to wall-clock last-write-wins + the two
// independent (event vs state) subscriptions; all bounded or self-healing, acceptable
// for the low-concurrency pre-incident stock edits this path covers:
//   · Delete resurrection: a delete loses to a CONCURRENT edit carrying a newer stamp
//     (online edit-vs-delete race), and an offline delete reloaded before reconnect
//     leaves no tombstone to push, so the cloud row is pulled back down. Online deletes
//     with no concurrent edit propagate cleanly.
//   · Clock skew: stamps are device wall-clock (Date.now). A badly-skewed phone can let a
//     stale edit win or make a tombstone hard to overwrite until real time catches up.
//     A logical/Lamport clock is deferred (over-built for v4.0's edit volume).
// Deploy-replay coordination (NOT a limitation — handled): the event log replays deploys
// (which decrement inventory via applyDeployTxn) and inventory pulls down here as two
// uncoordinated subscriptions. A deploy that replays BEFORE its stock row arrives aborts
// applyDeployTxn and is dropped (NOT appended, &id free). To close the window in BOTH
// orderings: once the inventory FIRST snapshot durably lands, onInventoryReady fires
// eventListenerSync.resync(), which re-reconciles the latest event snapshot so the dropped
// deploy re-applies immediately (idempotent — already-applied events fail the &id dedup).
//
// FIREBASE SEAM — firebase-free at module load: the default `subscribe` lazily imports
// ./firebase only once start() runs; unit tests inject a fake subscribe.

export interface StateListenerSync {
  start(): void;
  stop(): void;
}

export interface BlobConfig {
  path: BlobPath;
  localStamp: () => number;
  localValue: () => unknown;
  applyRemote: (value: unknown, stamp: number) => Promise<void>;
}

export function createStateListenerSync(deps: {
  deptId: () => string | null;
  /** Best-effort cloud push for the first-merge push-up direction (= syncService.setState). */
  setState: (relPath: string, value: unknown) => void;
  inventory: {
    rows: () => InventoryItem[];
    applyRemoteRow: (row: CloudRow) => Promise<void>;
    applyRemoteDelete: (id: string) => Promise<void>;
  };
  blobs: BlobConfig[];
  /** Fired once the inventory FIRST snapshot has durably landed — the event listener
   *  re-reconciles so a deploy/return dropped before its stock row arrived re-applies. */
  onInventoryReady?: () => void;
  subscribe?: (path: string, cb: (snap: unknown) => void) => () => void;
}): StateListenerSync {
  const subscribe = deps.subscribe ?? firebaseSubscribe;
  let unsubs: (() => void)[] = [];
  let started = false;

  // The cloud inventory snapshot is a map {itemId: row | tombstone}. Apply each cloud
  // record that is strictly newer than the local row; on the first snapshot also push
  // local rows newer-than-or-absent-in-cloud up. Local rows are captured ONCE so the
  // async applyRemote* mutations don't shift the push-up decision mid-pass.
  async function handleInventory(snap: unknown, first: boolean): Promise<void> {
    const cloud = (snap && typeof snap === 'object' ? snap : {}) as Record<string, CloudRow | { lastWriteAt?: number }>;
    const localById = new Map(deps.inventory.rows().map((r) => [r.id, r]));

    const applies: Promise<void>[] = [];
    for (const [id, rec] of Object.entries(cloud)) {
      if (stampOf(rec) <= stampOf(localById.get(id))) continue; // not newer → skip
      applies.push(isTombstone(rec) ? deps.inventory.applyRemoteDelete(id) : deps.inventory.applyRemoteRow(rec as CloudRow));
    }

    if (first) {
      for (const row of localById.values()) {
        const rec = cloud[row.id];
        if (!rec || stampOf(row) > stampOf(rec)) deps.setState(inventoryPath(row.id), toCloudRow(row));
      }
    }

    // Wait for the pulled rows to DURABLY land, THEN tell the event listener to re-reconcile
    // (so a deploy/return dropped before its stock row arrived re-applies). First snapshot
    // only — steady-state events already see the inventory that's now present.
    await Promise.all(applies);
    if (first) deps.onInventoryReady?.();
  }

  // A meta blob is a single { value, lastWriteAt } envelope. Pull when the cloud stamp is
  // strictly newer; on the first snapshot push up when local is strictly newer (covers an
  // empty cloud: remote stamp 0). An un-edited blob (local stamp 0) carries no department
  // data, so it's never pushed.
  function handleBlob(cfg: BlobConfig, snap: unknown, first: boolean): void {
    const env = snap && typeof snap === 'object' ? (snap as BlobEnvelope) : null;
    const remoteStamp = stampOf(env);
    const localStamp = cfg.localStamp();
    if (env && remoteStamp > localStamp) {
      void cfg.applyRemote(env.value, remoteStamp);
    } else if (first && localStamp > remoteStamp) {
      deps.setState(cfg.path, wrapBlob(cfg.localValue(), localStamp));
    }
  }

  return {
    start() {
      if (started) return; // idempotent (StrictMode double-start)
      const dept = deps.deptId();
      if (!dept) return; // guest → no cloud listener
      started = true;

      let invFirst = true;
      unsubs.push(
        subscribe(`orgs/${dept}/inventory`, (snap) => {
          void handleInventory(snap, invFirst);
          invFirst = false;
        }),
      );
      for (const cfg of deps.blobs) {
        let first = true;
        unsubs.push(
          subscribe(`orgs/${dept}/${cfg.path}`, (snap) => {
            handleBlob(cfg, snap, first);
            first = false;
          }),
        );
      }
    },
    stop() {
      for (const u of unsubs) u();
      unsubs = [];
      started = false;
    },
  };
}

/** The app's singleton, wired to the active bucket's stores + the sync service. */
export const stateListenerSync = createStateListenerSync({
  deptId: () => sessionStore.store.getState().departmentId,
  setState: (relPath, value) => void syncService.setState(relPath, value),
  onInventoryReady: () => eventListenerSync.resync(),
  inventory: {
    rows: () => inventoryStore.store.getState().items,
    applyRemoteRow: (row) => inventoryStore.applyRemoteRow(row),
    applyRemoteDelete: (id) => inventoryStore.applyRemoteDelete(id),
  },
  blobs: [
    {
      path: 'apparatus',
      localStamp: () => apparatusStore.localStamp(),
      localValue: () => apparatusStore.store.getState().roster,
      applyRemote: (v, s) => apparatusStore.applyRemote(v, s),
    },
    {
      path: 'titles',
      localStamp: () => customTitlesStore.localStamp(),
      localValue: () => customTitlesStore.store.getState().titles,
      applyRemote: (v, s) => customTitlesStore.applyRemote(v, s),
    },
    {
      path: 'checklists',
      localStamp: () => checklistTemplateStore.localStamp(),
      localValue: () => checklistTemplateStore.store.getState().overrides,
      applyRemote: (v, s) => checklistTemplateStore.applyRemote(v, s),
    },
    {
      path: 'apparatusTypes',
      localStamp: () => apparatusTypesStore.localStamp(),
      localValue: () => apparatusTypesStore.store.getState().types,
      applyRemote: (v, s) => apparatusTypesStore.applyRemote(v, s),
    },
    {
      path: 'deptPolicies',
      localStamp: () => deptPoliciesStore.localStamp(),
      localValue: () => deptPoliciesStore.store.getState(),
      applyRemote: (v, s) => deptPoliciesStore.applyRemote(v, s),
    },
  ],
});

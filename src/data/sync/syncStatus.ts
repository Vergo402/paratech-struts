import { createStore, type StoreApi } from 'zustand/vanilla';

// data/sync — the reactive sync-status store (cloud-sync Increment 4). A tiny zustand
// store the UI subscribes to for the trust signal (ADR-024): am I online, how many
// changes are still queued, is a join waiting to complete? Increments 2/3 track this
// internally (the event queue, connectivity) but only expose PULL accessors; the banner
// needs a reactive feed, so the syncService + connectivity push into this store.
//
// Firebase-free, no store deps — safe to import anywhere (data AND ui/hooks).
//
// pendingCount = the EVENT queue length (the app-tracked, retried work). Non-event state
// writes are best-effort (RTDB's own in-session offline queue + the stateListener
// first-merge on reload), so they're not counted here — the banner stays honest about
// what it actually tracks.

export interface PendingJoin {
  code: string;
  deptName: string | null; // unknown when the resolve itself failed offline (code-only)
}

export interface PendingDeptPush {
  deptId: string;
  deptName: string;
}

export interface SyncStatusState {
  online: boolean;
  pendingCount: number;
  pendingJoin: PendingJoin | null;
  // A department created while the cloud was unreachable, whose orgs node + invite
  // code are still owed to RTDB (#419). The outbox in departmentService retries on
  // boot/reconnect; this drives the banner's honest "will sync" line — without it a
  // stranded dept showed a working-looking invite code that resolved to nothing.
  pendingDeptPush: PendingDeptPush | null;
  // True when a flush left changes queued after a failure — i.e. uploads are STUCK, not
  // progressing. Lets the banner say "couldn't sync, retrying" instead of lying "Syncing…"
  // forever when writes fail for a non-network reason (a rule rejection, a wedge). Cleared
  // the moment the queue drains. A life-safety trust signal must not show false progress.
  syncError: boolean;
  // The Command-chrome PAR/pending-sync indicator (#352): how many DISTINCT
  // apparatus/individual resources have a ResourceAssigned/ResourceCleared event
  // still queued (not yet synced). A subset of pendingCount's raw event count —
  // one resource can own several queued events but only counts once here.
  pendingResourceCount: number;
}

export interface SyncStatusStoreApi {
  store: StoreApi<SyncStatusState>;
  setOnline(online: boolean): void;
  setPending(count: number): void;
  setPendingJoin(pendingJoin: PendingJoin | null): void;
  setPendingDeptPush(pendingDeptPush: PendingDeptPush | null): void;
  setSyncError(syncError: boolean): void;
  setPendingResourceCount(count: number): void;
}

export function createSyncStatusStore(): SyncStatusStoreApi {
  const store = createStore<SyncStatusState>(() => ({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: 0,
    pendingJoin: null,
    pendingDeptPush: null,
    syncError: false,
    pendingResourceCount: 0,
  }));
  return {
    store,
    setOnline: (online) => store.setState({ online }),
    setPending: (pendingCount) => store.setState({ pendingCount }),
    setPendingJoin: (pendingJoin) => store.setState({ pendingJoin }),
    setPendingDeptPush: (pendingDeptPush) => store.setState({ pendingDeptPush }),
    setSyncError: (syncError) => store.setState({ syncError }),
    setPendingResourceCount: (pendingResourceCount) => store.setState({ pendingResourceCount }),
  };
}

/** The app's singleton sync-status store. */
export const syncStatusStore = createSyncStatusStore();

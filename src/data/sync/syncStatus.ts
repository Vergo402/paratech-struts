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

export interface SyncStatusState {
  online: boolean;
  pendingCount: number;
  pendingJoin: PendingJoin | null;
  // True when a flush left changes queued after a failure — i.e. uploads are STUCK, not
  // progressing. Lets the banner say "couldn't sync, retrying" instead of lying "Syncing…"
  // forever when writes fail for a non-network reason (a rule rejection, a wedge). Cleared
  // the moment the queue drains. A life-safety trust signal must not show false progress.
  syncError: boolean;
}

export interface SyncStatusStoreApi {
  store: StoreApi<SyncStatusState>;
  setOnline(online: boolean): void;
  setPending(count: number): void;
  setPendingJoin(pendingJoin: PendingJoin | null): void;
  setSyncError(syncError: boolean): void;
}

export function createSyncStatusStore(): SyncStatusStoreApi {
  const store = createStore<SyncStatusState>(() => ({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: 0,
    pendingJoin: null,
    syncError: false,
  }));
  return {
    store,
    setOnline: (online) => store.setState({ online }),
    setPending: (pendingCount) => store.setState({ pendingCount }),
    setPendingJoin: (pendingJoin) => store.setState({ pendingJoin }),
    setSyncError: (syncError) => store.setState({ syncError }),
  };
}

/** The app's singleton sync-status store. */
export const syncStatusStore = createSyncStatusStore();

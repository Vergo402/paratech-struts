import { useStore } from 'zustand';
import { syncStatusStore, type SyncStatusState } from '@data/sync';

/**
 * The sync trust signal for the UI (cloud-sync Increment 4): online state, the
 * count of changes still queued for upload, and any department join waiting on a
 * reconnect. A live subscription — the SyncBanner re-renders on connect/disconnect,
 * as the queue drains, and when a join is queued/cleared (ADR-024). Read-only;
 * the data layer owns every mutation (syncService / connectivity / departmentService).
 */
export function useSyncStatus(): SyncStatusState {
  return useStore(syncStatusStore.store, (s) => s);
}

// data/sync — the one backend path (cloud-sync Increment 2: real event upload).
export {
  syncService,
  createSyncService,
  type SyncServiceApi,
  type RowSyncState,
  type ReconcileResult,
} from './syncService';
export { eventListenerSync, createEventListenerSync, type EventListenerSync } from './eventListener';
export { connectivity, createConnectivity, type Connectivity } from './connectivity';

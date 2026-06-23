// data/sync — the one backend path (cloud-sync Increment 2: real event upload).
export {
  syncService,
  createSyncService,
  type SyncServiceApi,
  type RowSyncState,
  type ReconcileResult,
} from './syncService';
export { eventListenerSync, createEventListenerSync, type EventListenerSync } from './eventListener';
export { stateListenerSync, createStateListenerSync, type StateListenerSync } from './stateListener';
export { rolesListenerSync, createRolesListenerSync, type RolesListenerSync } from './rolesListener';
export { connectivity, createConnectivity, type Connectivity } from './connectivity';
export {
  syncStatusStore,
  createSyncStatusStore,
  type SyncStatusStoreApi,
  type SyncStatusState,
  type PendingJoin,
} from './syncStatus';

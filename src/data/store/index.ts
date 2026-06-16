// data/store — the local-first persistence seam (IndexedDB via Dexie, the
// append-only event log, the commit-on-mutation). The only legal mutation
// entry; ui/* reaches it exclusively through ui/hooks (invariant 3).
export { db, createDB, FieldShoreDB, type EventRow, type MetaRow } from './db';
export { getDeviceUid, AUTH_UID_KEY } from './auth';
export {
  operationStore,
  createOperationStore,
  type OperationStoreApi,
  type CommitResult,
  type CommitOptions,
} from './operationStore';
export {
  inventoryStore,
  createInventoryStore,
  type InventoryStoreApi,
  type InventoryState,
} from './inventoryStore';
export {
  sessionStore,
  createSessionStore,
  SESSION_KEY,
  type SessionStoreApi,
  type SessionState,
  type Identity,
} from './session';
export { buildSeedInventory, seedIfEmpty } from './seed';
export { bootData, type BootResult } from './boot';

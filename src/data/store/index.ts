// data/store — the local-first persistence seam (IndexedDB via Dexie, the
// append-only event log, the commit-on-mutation). The only legal mutation
// entry; ui/* reaches it exclusively through ui/hooks (invariant 3).
//
// The 5 dept-scoped store singletons are re-exported from ./registry (they're
// recreated per-department on a switch — live bindings). The global singletons
// (session/onboarding) come straight from their files. The store FILES export
// only their factory + types; the registry owns the singletons.
export {
  createDB,
  FieldShoreDB,
  globalDb,
  legacyDb,
  deptDbName,
  GLOBAL_DB_NAME,
  GUEST_BUCKET,
  type EventRow,
  type MetaRow,
} from './db';
export { getDeviceUid, AUTH_UID_KEY } from './auth';
export {
  operationStore,
  inventoryStore,
  apparatusStore,
  customTitlesStore,
  checklistTemplateStore,
  activateBucket,
  currentDeptDb,
  currentBucket,
} from './registry';
export { createOperationStore, type OperationStoreApi, type CommitResult, type CommitOptions } from './operationStore';
export {
  createInventoryStore,
  type InventoryStoreApi,
  type InventoryState,
  type AddSpec,
  type ImportResult,
} from './inventoryStore';
export {
  createApparatusStore,
  APPARATUS_ROSTER_KEY,
  type ApparatusStoreApi,
  type ApparatusState,
} from './apparatusStore';
export {
  createCustomTitlesStore,
  CUSTOM_TITLES_KEY,
  type CustomTitlesStoreApi,
  type CustomTitlesState,
} from './customTitlesStore';
export {
  createChecklistTemplateStore,
  CHECKLIST_TEMPLATES_KEY,
  type ChecklistTemplateStoreApi,
  type ChecklistTemplateState,
  type ChecklistOverrides,
} from './checklistTemplateStore';
export {
  sessionStore,
  createSessionStore,
  SESSION_KEY,
  MEMBERSHIPS_KEY,
  type SessionStoreApi,
  type SessionState,
  type Identity,
} from './session';
export {
  onboardingStore,
  createOnboardingStore,
  ONBOARDING_KEY,
  type OnboardingStoreApi,
  type OnboardingState,
  type OnboardingStatus,
} from './onboardingStore';
export { buildSeedInventory, seedIfEmpty, seedApparatusRoster } from './seed';
export { migrateLegacyDb } from './migrate';
export { deleteLocalAccountData } from './accountDeletion';
export { bootData, type BootResult } from './boot';

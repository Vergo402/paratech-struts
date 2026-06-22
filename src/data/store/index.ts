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
  type AddSpec,
  type ImportResult,
} from './inventoryStore';
export {
  apparatusStore,
  createApparatusStore,
  APPARATUS_ROSTER_KEY,
  type ApparatusStoreApi,
  type ApparatusState,
} from './apparatusStore';
export {
  customTitlesStore,
  createCustomTitlesStore,
  CUSTOM_TITLES_KEY,
  type CustomTitlesStoreApi,
  type CustomTitlesState,
} from './customTitlesStore';
export {
  checklistTemplateStore,
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
export { bootData, type BootResult } from './boot';

// ui/hooks — the repository-hook barrel: the ONLY ui/* location permitted to
// import @data/* (invariant 3, lint-enforced — see eslint.config.js). Screens
// import from '@ui/hooks', never '@data/...'. Swap the backend, ui never knows.
export { useOperation } from './useOperation';
export { useShorePoints } from './useShorePoints';
export { useInventory } from './useInventory';
export { useApparatus, type ApparatusApi } from './useApparatus';
export { useCustomTitles, type CustomTitlesApi } from './useCustomTitles';
export { useInventoryActions, type InventoryActionsApi, type ImportOutcome } from './useInventoryActions';
// Pure CSV parse/validate helpers for the 4-step import flow — re-exported through
// the hooks seam so ui/* never imports @data directly (invariant 3).
export {
  parseRecords,
  autoMap,
  validateRows,
  validateRow,
  CSV_HEADERS,
  type ColumnMapping,
  type FieldKey,
  type RowOutcome,
  type ParsedImportRow,
} from '@data/inventory/excel';
export { useRecommendations } from './useRecommendations';
export { useCommit, useCommitMany } from './useCommit';
export { useDeviceUid } from './useDeviceUid';
export { useDeviceUidValue } from './useDeviceUidValue';
export { useSession, type SessionApi } from './useSession';
export { useSyncStatus } from './useSyncStatus';
export { useDepartment, type DepartmentApi } from './useDepartment';
export { usePermissions } from './usePermissions';
export { useRoles } from './useRoles';
export { useUserManager, type UserManagerApi } from './useUserManager';
export { useMyMember, type MyMemberApi } from './useMyMember';
export { useApparatusTypes, type ApparatusTypesApi } from './useApparatusTypes';
export { useDeptPolicies, type DeptPoliciesApi } from './useDeptPolicies';
export { useFeedback, type FeedbackApi, type FeedbackCategory } from './useFeedback';
export type { AdminMutationResult } from '@data/dept';
export { useOnboarding, type OnboardingApi } from './useOnboarding';
export { usePastOperations, useArchivedOperation } from './usePastOperations';
export { useShorePointHistory, type ShorePointHistory } from './useShorePointHistory';
export { useEventLog, type EventLog } from './useEventLog';
export { useAuditTrail, type AuditTrailApi } from './useAuditTrail';
export { useAuditAccess, type AuditAccess } from './useAuditAccess';
export { useOrg } from './useOrg';
export { useMyRole, useMyRoles } from './useMyRoles';
export { useCommandTransfer } from './useCommandTransfer';
export { useHazards } from './useHazards';
export { useRoleHistory, type RoleHistory } from './useRoleHistory';
export { useChecklists, type ChecklistApi } from './useChecklists';
export { useBriefing, type BriefingApi } from './useBriefing';
export { useChecklistTemplate, useChecklistTemplates, type ChecklistTemplatesApi } from './useChecklistTemplates';

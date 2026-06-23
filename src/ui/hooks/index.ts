// ui/hooks — the repository-hook barrel: the ONLY ui/* location permitted to
// import @data/* (invariant 3, lint-enforced — see eslint.config.js). Screens
// import from '@ui/hooks', never '@data/...'. Swap the backend, ui never knows.
export { useOperation } from './useOperation';
export { useShorePoints } from './useShorePoints';
export { useInventory } from './useInventory';
export { useApparatus, type ApparatusApi } from './useApparatus';
export { useCustomTitles, type CustomTitlesApi } from './useCustomTitles';
export { useInventoryActions, type InventoryActionsApi, type ImportOutcome } from './useInventoryActions';
export { useRecommendations } from './useRecommendations';
export { useCommit, useCommitMany } from './useCommit';
export { useDeviceUid } from './useDeviceUid';
export { useDeviceUidValue } from './useDeviceUidValue';
export { useSession, type SessionApi } from './useSession';
export { useSyncStatus } from './useSyncStatus';
export { useDepartment, type DepartmentApi } from './useDepartment';
export { usePermissions } from './usePermissions';
export { useOnboarding, type OnboardingApi } from './useOnboarding';
export { usePastOperations, useArchivedOperation } from './usePastOperations';
export { useShorePointHistory, type ShorePointHistory } from './useShorePointHistory';
export { useOrg } from './useOrg';
export { useMyRole, useMyRoles } from './useMyRoles';
export { useCommandTransfer } from './useCommandTransfer';
export { useHazards } from './useHazards';
export { useRoleHistory, type RoleHistory } from './useRoleHistory';
export { useChecklists, type ChecklistApi } from './useChecklists';
export { useBriefing, type BriefingApi } from './useBriefing';
export { useChecklistTemplate, useChecklistTemplates, type ChecklistTemplatesApi } from './useChecklistTemplates';

import { useStore } from 'zustand';
import { rolesStore } from '@data/store';
import type { Role } from '@core/schema';

/**
 * The department's live role definitions (#381), keyed by roleId — the synced
 * `/orgs/{deptId}/roles` map. Feeds usePermissions (an edited Default / custom role
 * re-gates the whole app) and the User Manager's Roles list. Empty until the
 * rolesListener's first pull (offline or pre-load); permissionsForRole falls back to
 * the built-in constants there. Behind the @ui/hooks seam (ui never imports @data).
 */
export function useRoles(): Record<string, Role> {
  return useStore(rolesStore.store, (s) => s.roles);
}

import { permissionsForRole, type Permissions } from '@core/schema';
import { useDepartment } from './useDepartment';
import { useRoles } from './useRoles';

/**
 * The member's effective back-office permissions in the CURRENT department (ADR-017).
 * Keyed off PERMISSION, never role name — components check `perms.manageInventory`,
 * not `role === 'admin'`. Re-renders when the role changes (useDepartment is a live sub
 * on sessionStore.role) OR when the role's permissions are edited (#381 — useRoles is a
 * live sub on the synced roles map, so editing Default / a custom role re-gates instantly).
 * Orthogonal to ICS-position gating (useMyRole): a department role never gates a fireground
 * action (ADR-008 / ADR-017) — the two axes don't mix.
 */
export function usePermissions(): Permissions {
  return permissionsForRole(useDepartment().role, useRoles());
}

import { PERMISSION_KEYS, type Permissions } from '@core/schema';

// The 8 back-office permission labels (#381 — the role editor's toggle labels; ADR-017
// taxonomy, worded to match the accepted User Manager mockup) and a short word for each
// (the one-line permission summary under a role name in the Roles list).

export const PERMISSION_LABELS: Record<keyof Permissions, string> = {
  read: 'Read department data',
  runFieldWork: 'Run field work',
  manageOperations: 'Create & end operations',
  manageInventory: 'Manage inventory & apparatus',
  manageRoster: 'Manage roster',
  manageSettings: 'Manage department settings',
  manageUsers: 'Manage users & roles',
  manageData: 'Export / delete data',
};

const SHORT: Record<keyof Permissions, string> = {
  read: 'Read',
  runFieldWork: 'field work',
  manageOperations: 'operations',
  manageInventory: 'inventory',
  manageRoster: 'roster',
  manageSettings: 'settings',
  manageUsers: 'users',
  manageData: 'data',
};

/** A one-line summary of what a role allows: "Full access", "Read · field work", "No access". */
export function permissionSummary(perms: Permissions): string {
  if (PERMISSION_KEYS.every((k) => perms[k])) return 'Full access';
  const on = PERMISSION_KEYS.filter((k) => perms[k]).map((k) => SHORT[k]);
  return on.length ? on.join(' · ') : 'No access';
}

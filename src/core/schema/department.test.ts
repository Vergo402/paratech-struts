import { describe, it, expect } from 'vitest';
import {
  permissionsForRole,
  ADMIN_PERMISSIONS,
  DEFAULT_PERMISSIONS,
  NO_PERMISSIONS,
  PERMISSION_KEYS,
} from './department';

// The permission resolver (ADR-017) — keyed off PERMISSION, never role name. The
// security-relevant assertion is the LAST one: an unknown id floors to Default, NOT
// Admin, so a typo / stale role id can never silently grant back-office power.
describe('permissionsForRole', () => {
  it('admin → full permissions', () => {
    expect(permissionsForRole('admin')).toEqual(ADMIN_PERMISSIONS);
    expect(permissionsForRole('admin').manageUsers).toBe(true);
    expect(permissionsForRole('admin').manageData).toBe(true);
  });

  it('default → read + run-field-work only (six back-office keys false)', () => {
    expect(permissionsForRole('default')).toEqual(DEFAULT_PERMISSIONS);
    const p = permissionsForRole('default');
    expect(p.read && p.runFieldWork).toBe(true);
    for (const k of ['manageOperations', 'manageInventory', 'manageRoster', 'manageSettings', 'manageUsers', 'manageData'] as const) {
      expect(p[k]).toBe(false);
    }
  });

  it('null / empty string → the all-false guest floor (read false too)', () => {
    expect(permissionsForRole(null)).toEqual(NO_PERMISSIONS);
    expect(permissionsForRole('')).toEqual(NO_PERMISSIONS);
    expect(permissionsForRole(null).read).toBe(false);
  });

  it('an unknown / custom role id floors to Default, never Admin (the security floor)', () => {
    expect(permissionsForRole('chief-custom-xyz')).toEqual(DEFAULT_PERMISSIONS);
    expect(permissionsForRole('chief-custom-xyz').manageInventory).toBe(false);
    expect(permissionsForRole('chief-custom-xyz').manageUsers).toBe(false);
  });

  it('the all-false floor covers exactly the schema permission keys (catches a forgotten key)', () => {
    expect(Object.keys(NO_PERMISSIONS).sort()).toEqual([...PERMISSION_KEYS].sort());
  });

  // #381 — the live `/orgs/{dept}/roles` map (from useRoles) resolves edited-Default + custom roles.
  it('resolves a synced custom role to its live permissions', () => {
    const roles = {
      logistics: { id: 'logistics', name: 'Logistics', permissions: { ...DEFAULT_PERMISSIONS, manageInventory: true } },
    };
    expect(permissionsForRole('logistics', roles).manageInventory).toBe(true);
    expect(permissionsForRole('logistics', roles).manageUsers).toBe(false);
  });

  it('resolves an edited Default from the synced table', () => {
    const roles = {
      default: { id: 'default', name: 'Default', builtIn: true, permissions: { ...DEFAULT_PERMISSIONS, manageInventory: true } },
    };
    expect(permissionsForRole('default', roles).manageInventory).toBe(true);
  });

  it('Admin always resolves to full permissions, ignoring the synced table (built-in, locked)', () => {
    const roles = { admin: { id: 'admin', name: 'Admin', permissions: NO_PERMISSIONS } }; // tampered table
    expect(permissionsForRole('admin', roles)).toEqual(ADMIN_PERMISSIONS);
  });

  it('an unsynced / unknown custom role floors to Default — under-privilege, never over', () => {
    expect(permissionsForRole('logistics', {})).toEqual(DEFAULT_PERMISSIONS);
    expect(permissionsForRole('logistics', undefined)).toEqual(DEFAULT_PERMISSIONS);
  });
});

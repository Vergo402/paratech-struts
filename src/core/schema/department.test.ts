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
});

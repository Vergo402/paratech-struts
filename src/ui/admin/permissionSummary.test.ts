import { describe, it, expect } from 'vitest';
import { permissionSummary } from './permissionSummary';
import { ADMIN_PERMISSIONS, DEFAULT_PERMISSIONS, NO_PERMISSIONS } from '@core/schema';

describe('permissionSummary', () => {
  it('all permissions → "Full access"', () => {
    expect(permissionSummary(ADMIN_PERMISSIONS)).toBe('Full access');
  });

  it('Default → "Read · field work"', () => {
    expect(permissionSummary(DEFAULT_PERMISSIONS)).toBe('Read · field work');
  });

  it('no permissions → "No access"', () => {
    expect(permissionSummary(NO_PERMISSIONS)).toBe('No access');
  });

  it('lists the enabled capabilities in canonical order', () => {
    expect(permissionSummary({ ...DEFAULT_PERMISSIONS, manageInventory: true })).toBe(
      'Read · field work · inventory',
    );
  });
});

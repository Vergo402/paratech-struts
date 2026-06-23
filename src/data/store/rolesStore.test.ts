import { describe, it, expect } from 'vitest';
import { createRolesStore } from './rolesStore';
import { ADMIN_PERMISSIONS, DEFAULT_PERMISSIONS } from '@core/schema';

describe('rolesStore', () => {
  it('parses a cloud snapshot (sans id) into the keyed Role map', () => {
    const s = createRolesStore();
    s.applyRemote({
      admin: { name: 'Admin', builtIn: true, permissions: ADMIN_PERMISSIONS },
      logistics: { name: 'Logistics', permissions: DEFAULT_PERMISSIONS },
    });
    const roles = s.store.getState().roles;
    expect(roles.admin?.id).toBe('admin'); // id re-attached from the key
    expect(roles.logistics?.name).toBe('Logistics');
    expect(roles.logistics?.permissions.manageUsers).toBe(false);
  });

  it('keeps local roles on a null/empty snapshot (offline — never wipes to {})', () => {
    const s = createRolesStore();
    s.applyRemote({ admin: { name: 'Admin', builtIn: true, permissions: ADMIN_PERMISSIONS } });
    s.applyRemote(null);
    expect(Object.keys(s.store.getState().roles)).toEqual(['admin']);
  });

  it('skips a wrong-shape entry without dropping the rest', () => {
    const s = createRolesStore();
    s.applyRemote({
      good: { name: 'Good', permissions: DEFAULT_PERMISSIONS },
      bad: { name: 'Bad' }, // missing permissions
    });
    expect(Object.keys(s.store.getState().roles)).toEqual(['good']);
  });

  it('applyLocal upserts and removeLocal drops one role (the acting admin\'s instant feedback)', () => {
    const s = createRolesStore();
    s.applyLocal({ id: 'r1', name: 'R1', permissions: DEFAULT_PERMISSIONS });
    expect(s.store.getState().roles.r1?.name).toBe('R1');
    s.removeLocal('r1');
    expect(s.store.getState().roles.r1).toBeUndefined();
  });
});

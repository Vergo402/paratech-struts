import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mocks before any module that reaches the Firebase seam runs.
const { setMock, logMock } = vi.hoisted(() => ({ setMock: vi.fn(), logMock: vi.fn() }));
vi.mock('../sync/firebase', () => ({
  rtdb: {},
  ref: (_db: unknown, path: string) => ({ path }),
  set: setMock,
}));
vi.mock('../sync/diagnostics', () => ({ logSyncEvent: logMock }));

import { createDB, type FieldShoreDB } from '../store/db';
import { createSessionStore, type SessionStoreApi } from '../store/session';
import { createDepartmentService, type DepartmentServiceApi } from './departmentService';
import { newId } from '@core/id';

const UID = 'device-uid';
const FB_UID = 'fb-uid-1';
const memberName = 'Capt. Marchetti';

describe('departmentService.createDepartment', () => {
  let db: FieldShoreDB;
  let session: SessionStoreApi;
  let svc: DepartmentServiceApi;

  beforeEach(async () => {
    setMock.mockReset().mockResolvedValue(undefined);
    logMock.mockReset().mockResolvedValue(undefined);
    db = createDB(`test-dept-${newId()}`);
    session = createSessionStore(db);
    await session.boot(UID);
    svc = createDepartmentService({ session: () => session });
  });

  afterEach(async () => {
    await db.delete();
  });

  it('rejects a guest (must be signed in)', async () => {
    const r = await svc.createDepartment('Hamden Fire Rescue');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/sign in/i);
    expect(setMock).not.toHaveBeenCalled();
  });

  it('rejects an empty / whitespace name', async () => {
    await session.setMember({ accountId: FB_UID, displayName: memberName });
    expect((await svc.createDepartment('   ')).ok).toBe(false);
    expect(setMock).not.toHaveBeenCalled();
  });

  it('rejects a name over 100 chars', async () => {
    await session.setMember({ accountId: FB_UID, displayName: memberName });
    expect((await svc.createDepartment('x'.repeat(101))).ok).toBe(false);
  });

  it('creates a department, claims founding Admin, and mints an unambiguous invite code', async () => {
    await session.setMember({ accountId: FB_UID, displayName: memberName });
    const r = await svc.createDepartment('Hamden Fire Rescue');
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');

    expect(r.department.name).toBe('Hamden Fire Rescue');
    expect(r.department.role).toBe('admin');
    expect(r.department.inviteCode).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);

    // local-first: the dept projection is set on the session immediately.
    const s = session.store.getState();
    expect(s.departmentId).toBe(r.department.id);
    expect(s.departmentName).toBe('Hamden Fire Rescue');
    expect(s.role).toBe('admin');
  });

  it('writes one atomic set at /orgs/{id} with the founder as Admin + both built-in roles', async () => {
    await session.setMember({ accountId: FB_UID, displayName: memberName });
    const r = await svc.createDepartment('Hamden Fire Rescue');
    if (!r.ok) throw new Error('expected ok');

    expect(setMock).toHaveBeenCalledTimes(1);
    const [refArg, payload] = setMock.mock.calls[0]!;
    expect(refArg).toEqual({ path: `orgs/${r.department.id}` });
    expect(payload.createdBy).toBe(FB_UID);
    expect(payload.members[FB_UID].role).toBe('admin');
    expect(payload.members[FB_UID].displayName).toBe(memberName);
    expect(payload.roles.admin.permissions.manageUsers).toBe(true);
    expect(payload.roles.default.permissions.manageUsers).toBe(false);
    expect(payload.roles.default.permissions.read).toBe(true);
  });

  it('survives a cloud-write failure (local dept stands; failure logged)', async () => {
    await session.setMember({ accountId: FB_UID, displayName: memberName });
    setMock.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));

    const r = await svc.createDepartment('Hamden Fire Rescue');
    expect(r.ok).toBe(true); // local-first — the dept is real locally regardless
    expect(session.store.getState().departmentId).toBeTruthy();
    expect(logMock).toHaveBeenCalledWith(
      'dept_create_failed',
      expect.objectContaining({ deptId: expect.any(String) }),
    );
  });
});

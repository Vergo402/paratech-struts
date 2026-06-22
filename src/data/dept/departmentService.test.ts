import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mocks before any module that reaches the Firebase seam runs.
const { setMock, getMock, logMock } = vi.hoisted(() => ({
  setMock: vi.fn(),
  getMock: vi.fn(),
  logMock: vi.fn(),
}));
vi.mock('../sync/firebase', () => ({
  rtdb: {},
  ref: (_db: unknown, path: string) => ({ path }),
  get: getMock,
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

    // Two writes: the dept subtree, then the invite-code resolver.
    expect(setMock).toHaveBeenCalledTimes(2);
    const [refArg, payload] = setMock.mock.calls[0]!;
    expect(refArg).toEqual({ path: `orgs/${r.department.id}` });
    expect(payload.createdBy).toBe(FB_UID);
    expect(payload.members[FB_UID].role).toBe('admin');
    expect(payload.members[FB_UID].displayName).toBe(memberName);
    expect(payload.roles.admin.permissions.manageUsers).toBe(true);
    expect(payload.roles.default.permissions.manageUsers).toBe(false);
    expect(payload.roles.default.permissions.read).toBe(true);
  });

  it('publishes the invite-code resolver (deptId + name + active) after the dept write', async () => {
    await session.setMember({ accountId: FB_UID, displayName: memberName });
    const r = await svc.createDepartment('Hamden Fire Rescue');
    if (!r.ok) throw new Error('expected ok');

    const [refArg, payload] = setMock.mock.calls[1]!;
    expect(refArg).toEqual({ path: `orgs/inviteCodes/${r.department.inviteCode}` });
    expect(payload).toEqual({
      deptId: r.department.id,
      deptName: 'Hamden Fire Rescue',
      createdBy: FB_UID,
      createdAt: expect.any(Number),
      active: true,
    });
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

  it('logs invite_code_publish_failed (not dept_create_failed) when only the code write fails', async () => {
    await session.setMember({ accountId: FB_UID, displayName: memberName });
    // dept write succeeds, invite-code write fails — distinct ledger label.
    setMock.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('PERMISSION_DENIED'));

    const r = await svc.createDepartment('Hamden Fire Rescue');
    expect(r.ok).toBe(true); // the dept stands locally
    expect(logMock).toHaveBeenCalledWith(
      'invite_code_publish_failed',
      expect.objectContaining({ deptId: expect.any(String) }),
    );
    expect(logMock).not.toHaveBeenCalledWith('dept_create_failed', expect.anything());
  });
});

describe('departmentService.joinByCode', () => {
  let db: FieldShoreDB;
  let session: SessionStoreApi;
  let svc: DepartmentServiceApi;

  const CODE = 'HAMD-4F2K';
  const okSnap = (val: unknown) => ({ exists: () => val != null, val: () => val });
  const liveCode = {
    deptId: 'dept-1',
    deptName: 'Hamden Fire Rescue',
    createdBy: 'founder-uid',
    createdAt: 1,
    active: true,
  };

  beforeEach(async () => {
    setMock.mockReset().mockResolvedValue(undefined);
    getMock.mockReset();
    logMock.mockReset().mockResolvedValue(undefined);
    db = createDB(`test-join-${newId()}`);
    session = createSessionStore(db);
    await session.boot(UID);
    svc = createDepartmentService({ session: () => session });
    await session.setMember({ accountId: FB_UID, displayName: memberName });
  });

  afterEach(async () => {
    await db.delete();
  });

  it('rejects a malformed code before any network call', async () => {
    const r = await svc.joinByCode('nope');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/isn't valid/i);
    expect(getMock).not.toHaveBeenCalled();
    expect(setMock).not.toHaveBeenCalled();
  });

  it('normalizes case + a missing hyphen, then resolves', async () => {
    getMock.mockResolvedValue(okSnap(liveCode));
    const r = await svc.joinByCode('hamd4f2k');
    expect(r.ok).toBe(true);
    expect(getMock).toHaveBeenCalledWith({ path: `orgs/inviteCodes/${CODE}` });
  });

  it('rejects a guest (join needs a signed-in account)', async () => {
    await session.setGuest();
    const r = await svc.joinByCode(CODE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/sign in/i);
    expect(getMock).not.toHaveBeenCalled();
  });

  it('maps an unknown code to a calm invalid message', async () => {
    getMock.mockResolvedValue(okSnap(null));
    const r = await svc.joinByCode(CODE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/isn't valid/i);
    expect(setMock).not.toHaveBeenCalled();
  });

  it('maps an inactive code to the expired message', async () => {
    getMock.mockResolvedValue(okSnap({ ...liveCode, active: false }));
    const r = await svc.joinByCode(CODE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/expired/i);
    expect(setMock).not.toHaveBeenCalled();
  });

  it('treats a failed resolve as offline', async () => {
    getMock.mockRejectedValue(new Error('network'));
    const r = await svc.joinByCode(CODE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/offline/i);
  });

  it('joins: writes own member row (Default + viaCode) and projects the dept locally', async () => {
    getMock.mockResolvedValue(okSnap(liveCode));
    const r = await svc.joinByCode(CODE);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    expect(r.department).toEqual({ id: 'dept-1', name: 'Hamden Fire Rescue', role: 'default' });

    const [refArg, payload] = setMock.mock.calls[0]!;
    expect(refArg).toEqual({ path: `orgs/dept-1/members/${FB_UID}` });
    expect(payload).toEqual({
      role: 'default',
      displayName: memberName,
      joinedAt: expect.any(Number),
      viaCode: CODE,
    });

    const s = session.store.getState();
    expect(s.departmentId).toBe('dept-1');
    expect(s.role).toBe('default');
    expect(s.inviteCode).toBe(CODE);
  });

  it('short-circuits a re-join of the dept you are already in (no write, keeps current role)', async () => {
    getMock.mockResolvedValue(okSnap(liveCode)); // resolves to dept-1
    // Already an Admin member of dept-1 (e.g. the founder re-scanning their own code).
    await session.setDepartment({ id: 'dept-1', name: 'Hamden Fire Rescue', role: 'admin', inviteCode: 'OLD1-CODE' });
    setMock.mockClear();

    const r = await svc.joinByCode(CODE);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    // current role preserved (a re-join must not appear to downgrade Admin → Default)
    expect(r.department).toEqual({ id: 'dept-1', name: 'Hamden Fire Rescue', role: 'admin' });
    expect(setMock).not.toHaveBeenCalled(); // no member write attempted
  });

  it('surfaces a member-write failure as offline and logs it', async () => {
    getMock.mockResolvedValue(okSnap(liveCode));
    setMock.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));
    const r = await svc.joinByCode(CODE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/offline/i);
    expect(logMock).toHaveBeenCalledWith('dept_join_failed', expect.objectContaining({ deptId: 'dept-1' }));
  });
});

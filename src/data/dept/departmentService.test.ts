import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mocks before any module that reaches the Firebase seam runs.
const { setMock, getMock, updateMock, logMock } = vi.hoisted(() => ({
  setMock: vi.fn(),
  getMock: vi.fn(),
  updateMock: vi.fn(),
  logMock: vi.fn(),
}));
vi.mock('../sync/firebase', () => ({
  rtdb: {},
  ref: (_db: unknown, path: string) => ({ path }),
  get: getMock,
  set: setMock,
  update: updateMock,
  remove: vi.fn(),
}));
vi.mock('../sync/diagnostics', () => ({ logSyncEvent: logMock }));

import { createDB, type FieldShoreDB } from '../store/db';
import { createSessionStore, type SessionStoreApi } from '../store/session';
import { createDepartmentService, type DepartmentServiceApi } from './departmentService';
import { syncStatusStore } from '../sync/syncStatus';
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
    getMock.mockReset().mockResolvedValue({ exists: () => false });
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

    // Three writes: backfill /userDepts (from setDepartment), the dept subtree, the invite-code resolver.
    expect(setMock).toHaveBeenCalledTimes(3);
    const [refArg, payload] = setMock.mock.calls[1]!;
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

    const [refArg, payload] = setMock.mock.calls[2]!;
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
    // call[0] = backfill /userDepts (fire-and-forget from setDepartment); call[1] = org write fails.
    setMock.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('PERMISSION_DENIED'));

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
    // call[0] = backfill /userDepts; call[1] = dept write succeeds; call[2] = invite-code write fails.
    setMock.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('PERMISSION_DENIED'));

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
    getMock.mockReset().mockResolvedValue({ exists: () => false });
    logMock.mockReset().mockResolvedValue(undefined);
    db = createDB(`test-join-${newId()}`);
    session = createSessionStore(db);
    await session.boot(UID);
    svc = createDepartmentService({ session: () => session });
    await session.setMember({ accountId: FB_UID, displayName: memberName });
    // recoverDeptFromCloud fires during setMember above — clear so per-test assertions start clean.
    getMock.mockClear();
    setMock.mockClear();
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

describe('departmentService — offline join queue (Increment 4)', () => {
  let db: FieldShoreDB;
  let session: SessionStoreApi;
  let svc: DepartmentServiceApi;

  const CODE = 'HAMD-4F2K';
  const PENDING_KEY = 'fieldshore_pending_join';
  const okSnap = (val: unknown) => ({ exists: () => val != null, val: () => val });
  const liveCode = { deptId: 'dept-1', deptName: 'Hamden Fire Rescue', createdBy: 'f', createdAt: 1, active: true };
  const intent = () => db.meta.get(PENDING_KEY);

  beforeEach(async () => {
    setMock.mockReset().mockResolvedValue(undefined);
    getMock.mockReset().mockResolvedValue({ exists: () => false });
    logMock.mockReset().mockResolvedValue(undefined);
    syncStatusStore.setPendingJoin(null);
    db = createDB(`test-join-q-${newId()}`);
    session = createSessionStore(db);
    await session.boot(UID);
    svc = createDepartmentService({ session: () => session, db });
    await session.setMember({ accountId: FB_UID, displayName: memberName });
    // recoverDeptFromCloud fires during setMember above — clear so per-test assertions start clean.
    getMock.mockClear();
  });
  afterEach(async () => {
    await db.delete();
  });

  it('offline at resolve → queues the intent (code-only) and returns queued', async () => {
    getMock.mockRejectedValue(new Error('network'));
    const r = await svc.joinByCode(CODE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.queued).toBe(true);
    expect(JSON.parse((await intent())!.value)).toEqual({ code: CODE, deptName: null });
    expect(syncStatusStore.store.getState().pendingJoin).toEqual({ code: CODE, deptName: null });
  });

  it('offline at member-write → queues the intent WITH the resolved deptName', async () => {
    getMock.mockResolvedValue(okSnap(liveCode));
    setMock.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));
    const r = await svc.joinByCode(CODE);
    if (!r.ok) expect(r.queued).toBe(true);
    expect(JSON.parse((await intent())!.value)).toEqual({ code: CODE, deptName: 'Hamden Fire Rescue' });
  });

  it('retryPendingJoin completes the join on reconnect → true, intent cleared', async () => {
    await db.meta.put({ key: PENDING_KEY, value: JSON.stringify({ code: CODE, deptName: 'Hamden Fire Rescue' }) });
    getMock.mockResolvedValue(okSnap(liveCode));
    setMock.mockResolvedValue(undefined);
    const completed = await svc.retryPendingJoin();
    expect(completed).toBe(true);
    expect(await intent()).toBeUndefined(); // cleared
    expect(session.store.getState().departmentId).toBe('dept-1');
    expect(syncStatusStore.store.getState().pendingJoin).toBeNull();
  });

  it('retryPendingJoin still offline → false, intent kept', async () => {
    await db.meta.put({ key: PENDING_KEY, value: JSON.stringify({ code: CODE, deptName: null }) });
    getMock.mockRejectedValue(new Error('network'));
    const completed = await svc.retryPendingJoin();
    expect(completed).toBe(false);
    expect(await intent()).toBeDefined(); // re-queued, still pending
  });

  it('retryPendingJoin drops the intent on a definitive failure (invalid code)', async () => {
    await db.meta.put({ key: PENDING_KEY, value: JSON.stringify({ code: CODE, deptName: null }) });
    getMock.mockResolvedValue(okSnap(null)); // code no longer resolves
    const completed = await svc.retryPendingJoin();
    expect(completed).toBe(false);
    expect(await intent()).toBeUndefined(); // stop retrying a dead code
  });

  it('retryPendingJoin with no intent is a no-op', async () => {
    expect(await svc.retryPendingJoin()).toBe(false);
    expect(getMock).not.toHaveBeenCalled();
  });

  it('restorePendingJoin surfaces a persisted intent into the sync-status store', async () => {
    await db.meta.put({ key: PENDING_KEY, value: JSON.stringify({ code: CODE, deptName: 'Hamden Fire Rescue' }) });
    await svc.restorePendingJoin();
    expect(syncStatusStore.store.getState().pendingJoin).toEqual({ code: CODE, deptName: 'Hamden Fire Rescue' });
  });
});

describe('departmentService — invite-code lifecycle (#423)', () => {
  let db: FieldShoreDB;
  let session: SessionStoreApi;
  let svc: DepartmentServiceApi;
  let oldCode: string;

  // set() calls that hit the invite-code resolver (regenerate also fires
  // userDepts + audit writes — filter by path, never by call index).
  const codePublishes = () =>
    setMock.mock.calls.filter(([r]) => (r as { path: string }).path.startsWith('orgs/inviteCodes/'));

  beforeEach(async () => {
    setMock.mockReset().mockResolvedValue(undefined);
    getMock.mockReset().mockResolvedValue({ exists: () => false });
    updateMock.mockReset().mockResolvedValue(undefined);
    logMock.mockReset().mockResolvedValue(undefined);
    db = createDB(`test-dept-${newId()}`);
    session = createSessionStore(db);
    await session.boot(UID);
    await session.setMember({ accountId: FB_UID, displayName: memberName });
    svc = createDepartmentService({ session: () => session });
    const r = await svc.createDepartment('Hamden Fire Rescue');
    if (!r.ok) throw new Error('setup: create failed');
    oldCode = r.department.inviteCode;
    setMock.mockClear();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('regenerate publishes the NEW code first, kills the old, and moves the session onto it', async () => {
    const r = await svc.regenerateInviteCode();
    expect(r.ok).toBe(true);
    expect(r.code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(r.code).not.toBe(oldCode);

    const publishes = codePublishes();
    expect(publishes).toHaveLength(1);
    expect(publishes[0]![0]).toEqual({ path: `orgs/inviteCodes/${r.code}` });
    expect(publishes[0]![1]).toMatchObject({ deptName: 'Hamden Fire Rescue', createdBy: FB_UID, active: true });

    expect(updateMock).toHaveBeenCalledWith({ path: `orgs/inviteCodes/${oldCode}` }, { active: false });
    expect(session.store.getState().inviteCode).toBe(r.code);
  });

  it('a failed NEW-code publish leaves the old code fully working (nothing revoked, session unchanged)', async () => {
    setMock.mockRejectedValueOnce(new Error('network down'));
    const r = await svc.regenerateInviteCode();
    expect(r.ok).toBe(false);
    expect(updateMock).not.toHaveBeenCalled(); // old code NOT revoked
    expect(session.store.getState().inviteCode).toBe(oldCode);
  });

  it('a failed OLD-code revoke does not abort the rotation (two live codes is benign, logged)', async () => {
    updateMock.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));
    const r = await svc.regenerateInviteCode();
    expect(r.ok).toBe(true);
    expect(session.store.getState().inviteCode).toBe(r.code);
    expect(logMock).toHaveBeenCalledWith('invite_code_revoke_failed', expect.anything());
  });

  it('revoke flips the current code inactive', async () => {
    const r = await svc.revokeInviteCode();
    expect(r.ok).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({ path: `orgs/inviteCodes/${oldCode}` }, { active: false });
  });

  it('a denied revoke surfaces the permission reason, not a generic failure', async () => {
    updateMock.mockRejectedValueOnce(new Error('PERMISSION_DENIED: rules'));
    const r = await svc.revokeInviteCode();
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/permission/i);
  });

  it('both actions require a connected department', async () => {
    const bare = createSessionStore(createDB(`test-dept-${newId()}`));
    await bare.boot(UID);
    const bareSvc = createDepartmentService({ session: () => bare });
    expect((await bareSvc.revokeInviteCode()).ok).toBe(false);
    expect((await bareSvc.regenerateInviteCode()).ok).toBe(false);
  });
});

import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mocks before any module that reaches the Firebase seam runs.
const { setMock, getMock, updateMock, logMock, callMock } = vi.hoisted(() => ({
  setMock: vi.fn(),
  getMock: vi.fn(),
  updateMock: vi.fn(),
  logMock: vi.fn(),
  callMock: vi.fn(),
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
vi.mock('../functions/firebase', () => ({ callFunction: callMock }));

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
    syncStatusStore.setPendingDeptPush(null);
    db = createDB(`test-dept-${newId()}`);
    session = createSessionStore(db);
    await session.boot(UID);
    svc = createDepartmentService({ session: () => session, db });
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

  it('survives a cloud-write failure — dept stands locally, outbox row kept for retry (#419)', async () => {
    await session.setMember({ accountId: FB_UID, displayName: memberName });
    // call[0] = backfill /userDepts (fire-and-forget from setDepartment); call[1] = org write fails.
    setMock.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('network unreachable'));

    const r = await svc.createDepartment('Hamden Fire Rescue');
    expect(r.ok).toBe(true); // local-first — the dept is real locally regardless
    expect(session.store.getState().departmentId).toBeTruthy();
    expect(logMock).toHaveBeenCalledWith(
      'dept_create_failed',
      expect.objectContaining({ deptId: expect.any(String) }),
    );
    // the outbox row survives (retried on boot/reconnect) and the banner knows
    const row = await db.meta.get('fieldshore_pending_dept_push');
    expect(row).toBeDefined();
    expect(syncStatusStore.store.getState().pendingDeptPush).toEqual({
      deptId: session.store.getState().departmentId,
      deptName: 'Hamden Fire Rescue',
    });
  });

  it('logs invite_code_publish_failed (not dept_create_failed) when only the code write fails; outbox kept', async () => {
    await session.setMember({ accountId: FB_UID, displayName: memberName });
    // call[0] = backfill /userDepts; call[1] = dept write succeeds; call[2] = invite-code write fails.
    setMock.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('network unreachable'));

    const r = await svc.createDepartment('Hamden Fire Rescue');
    expect(r.ok).toBe(true); // the dept stands locally
    expect(logMock).toHaveBeenCalledWith(
      'invite_code_publish_failed',
      expect.objectContaining({ deptId: expect.any(String) }),
    );
    expect(logMock).not.toHaveBeenCalledWith('dept_create_failed', expect.anything());
    expect(await db.meta.get('fieldshore_pending_dept_push')).toBeDefined(); // still owed
  });

  it('a fully-successful create clears the outbox — no pending row, no banner', async () => {
    await session.setMember({ accountId: FB_UID, displayName: memberName });
    const r = await svc.createDepartment('Hamden Fire Rescue');
    expect(r.ok).toBe(true);
    expect(await db.meta.get('fieldshore_pending_dept_push')).toBeUndefined();
    expect(syncStatusStore.store.getState().pendingDeptPush).toBeNull();
  });

  it('PERMISSION_DENIED on the dept push means "already created" — outbox completes, distinct ledger label', async () => {
    await session.setMember({ accountId: FB_UID, displayName: memberName });
    // CREATE_ONLY: a denied dept set = the node already exists (a prior buffered
    // write landed). The push continues to the code write and clears the row.
    setMock.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('PERMISSION_DENIED'));
    const r = await svc.createDepartment('Hamden Fire Rescue');
    expect(r.ok).toBe(true);
    expect(logMock).toHaveBeenCalledWith('dept_push_denied', expect.objectContaining({ deptId: expect.any(String) }));
    expect(logMock).not.toHaveBeenCalledWith('dept_create_failed', expect.anything());
    expect(await db.meta.get('fieldshore_pending_dept_push')).toBeUndefined(); // done
  });

  it('a hung (offline-buffered) cloud set cannot wedge the create — returns promptly, outbox kept', async () => {
    await session.setMember({ accountId: FB_UID, displayName: memberName });
    const fast = createDepartmentService({
      session: () => session,
      db,
      timeouts: { outboxSet: 50, createWait: 25 },
    });
    // an offline RTDB set() never settles — simulate with a forever-pending promise
    setMock.mockResolvedValueOnce(undefined).mockImplementation(() => new Promise(() => {}));
    const r = await fast.createDepartment('Hamden Fire Rescue');
    expect(r.ok).toBe(true); // returned despite the hang
    expect(await db.meta.get('fieldshore_pending_dept_push')).toBeDefined();
    expect(syncStatusStore.store.getState().pendingDeptPush).toMatchObject({ deptName: 'Hamden Fire Rescue' });
  });

  it('retryPendingDeptPush re-pushes BOTH payloads verbatim and clears the row', async () => {
    await session.setMember({ accountId: FB_UID, displayName: memberName });
    setMock.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('network unreachable'));
    const r = await svc.createDepartment('Hamden Fire Rescue');
    if (!r.ok) throw new Error('expected ok');
    setMock.mockClear();
    setMock.mockResolvedValue(undefined);

    expect(await svc.retryPendingDeptPush()).toBe(true);
    const paths = setMock.mock.calls.map(([ref]) => (ref as { path: string }).path);
    expect(paths).toEqual([`orgs/${r.department.id}`, `orgs/inviteCodes/${r.department.inviteCode}`]);
    const [, deptPayload] = setMock.mock.calls[0]!;
    expect(deptPayload.createdBy).toBe(FB_UID); // verbatim — createdBy/joinedAt preserved
    expect(deptPayload.members[FB_UID].joinedAt).toEqual(expect.any(Number));
    expect(await db.meta.get('fieldshore_pending_dept_push')).toBeUndefined();
    expect(syncStatusStore.store.getState().pendingDeptPush).toBeNull();
  });

  it('retryPendingDeptPush with no pending row is a no-op', async () => {
    expect(await svc.retryPendingDeptPush()).toBe(false);
    expect(setMock).not.toHaveBeenCalled();
  });

  it('restorePendingDeptPush re-seeds the banner state across a reload', async () => {
    await session.setMember({ accountId: FB_UID, displayName: memberName });
    setMock.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('network unreachable'));
    await svc.createDepartment('Hamden Fire Rescue');
    syncStatusStore.setPendingDeptPush(null); // simulate the reload wiping in-memory state
    await svc.restorePendingDeptPush();
    expect(syncStatusStore.store.getState().pendingDeptPush).toMatchObject({ deptName: 'Hamden Fire Rescue' });
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

  it('surfaces a NETWORK member-write failure as offline and logs it', async () => {
    getMock.mockResolvedValue(okSnap(liveCode));
    setMock.mockRejectedValueOnce(new Error('network unreachable'));
    const r = await svc.joinByCode(CODE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/offline/i);
    expect(logMock).toHaveBeenCalledWith('dept_join_failed', expect.objectContaining({ deptId: 'dept-1' }));
  });

  it('PERMISSION_DENIED at the member write is NOT "offline" — definitive, honest, never queued (#420)', async () => {
    // The JOIN_SELF_WRITE rule denies any EXISTING member row: a revoked member
    // re-joining, or a member joining from a new device. Pre-#420 this queued
    // forever behind "You're offline" while fully online.
    getMock.mockResolvedValue(okSnap(liveCode));
    setMock.mockRejectedValueOnce(new Error('PERMISSION_DENIED: rules'));
    const r = await svc.joinByCode(CODE);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.queued).toBeUndefined(); // never queued
      expect(r.reason).toMatch(/access|revoked/i);
      expect(r.reason).not.toMatch(/offline/i);
    }
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
    setMock.mockRejectedValueOnce(new Error('network unreachable'));
    const r = await svc.joinByCode(CODE);
    if (!r.ok) expect(r.queued).toBe(true);
    expect(JSON.parse((await intent())!.value)).toEqual({ code: CODE, deptName: 'Hamden Fire Rescue' });
  });

  it('PERMISSION_DENIED at member-write clears any pending intent — the retry loop cannot wedge (#420)', async () => {
    // The infinite-loop shape: an intent is queued, reconnect retries, the write is
    // DENIED (revoked member / existing row). Pre-#420 the deny re-queued forever.
    await db.meta.put({ key: PENDING_KEY, value: JSON.stringify({ code: CODE, deptName: 'Hamden Fire Rescue' }) });
    syncStatusStore.setPendingJoin({ code: CODE, deptName: 'Hamden Fire Rescue' });
    getMock.mockResolvedValue(okSnap(liveCode));
    setMock.mockRejectedValue(new Error('PERMISSION_DENIED: rules'));
    const completed = await svc.retryPendingJoin();
    expect(completed).toBe(false);
    expect(await intent()).toBeUndefined(); // intent DROPPED — no infinite retry
    expect(syncStatusStore.store.getState().pendingJoin).toBeNull(); // banner cleared
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
    svc = createDepartmentService({ session: () => session, db });
    const r = await svc.createDepartment('Hamden Fire Rescue');
    if (!r.ok) throw new Error('setup: create failed');
    oldCode = r.department.inviteCode;
    setMock.mockClear();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('regenerate kills the OLD code first, then publishes the new one and moves the session onto it', async () => {
    const r = await svc.regenerateInviteCode();
    expect(r.ok).toBe(true);
    expect(r.code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(r.code).not.toBe(oldCode);

    expect(updateMock).toHaveBeenCalledWith({ path: `orgs/inviteCodes/${oldCode}` }, { active: false });
    const publishes = codePublishes();
    expect(publishes).toHaveLength(1);
    expect(publishes[0]![0]).toEqual({ path: `orgs/inviteCodes/${r.code}` });
    expect(publishes[0]![1]).toMatchObject({ deptName: 'Hamden Fire Rescue', createdBy: FB_UID, active: true });
    expect(session.store.getState().inviteCode).toBe(r.code);
  });

  it('a failed OLD-code revoke ABORTS the rotation with an honest error — never a false "it stops working"', async () => {
    // Re-verify MED-1: regenerate is the only user-facing kill path; a leaked code
    // must never be reported dead while still active.
    updateMock.mockRejectedValueOnce(new Error('network down'));
    const r = await svc.regenerateInviteCode();
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/still active/i);
    expect(codePublishes()).toHaveLength(0); // no new code published
    expect(session.store.getState().inviteCode).toBe(oldCode); // nothing moved
    expect(logMock).toHaveBeenCalledWith('invite_code_revoke_failed', expect.anything());
  });

  it('a failed NEW-code publish after a successful revoke reports the code-less state honestly and self-heals on retry', async () => {
    setMock.mockRejectedValueOnce(new Error('network down'));
    const r = await svc.regenerateInviteCode();
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/retired.*new code/i);
    expect(session.store.getState().inviteCode).toBe(oldCode); // dead code still displayed

    // Retry: the re-revoke of the already-dead code is idempotent; the mint succeeds.
    setMock.mockResolvedValue(undefined);
    const r2 = await svc.regenerateInviteCode();
    expect(r2.ok).toBe(true);
    expect(session.store.getState().inviteCode).toBe(r2.code);
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

  it('deleteRole aborts when the members read fails — never strands holders on a missing role', async () => {
    // Re-verify MED-2: pre-#418 the remove() was denied anyway; now it succeeds, so a
    // null members read (offline) must abort instead of skipping the reassignment.
    getMock.mockRejectedValueOnce(new Error('network'));
    const r = await svc.deleteRole('custom-role-1');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/verify who holds/i);
  });

  it('disconnected admin mutations report the connection problem, never a validation reason', async () => {
    const bare = createSessionStore(createDB(`test-dept-${newId()}`));
    await bare.boot(UID);
    const bareSvc = createDepartmentService({ session: () => bare });
    const notConnected = { ok: false, reason: 'Not connected to a department.' };
    expect(await bareSvc.revokeInviteCode()).toEqual(notConnected);
    expect(await bareSvc.regenerateInviteCode()).toEqual(notConnected);
    // assignRole has no inline guard — this pins adminWrite's shared ctx guard itself.
    expect(await bareSvc.assignRole('uid-x', 'role-x')).toEqual(notConnected);
    // Validation-failing input while disconnected: the ctx guard must answer first.
    expect(await bareSvc.setMemberRank('uid-x', 'r'.repeat(100))).toEqual(notConnected);
  });
});

describe('departmentService — admin-provisioned personnel (#439)', () => {
  let db: FieldShoreDB;
  let session: SessionStoreApi;
  let svc: DepartmentServiceApi;

  const auditWrites = () =>
    setMock.mock.calls.filter(([r]) => (r as { path: string }).path.includes('/audit/'));

  beforeEach(async () => {
    setMock.mockReset().mockResolvedValue(undefined);
    getMock.mockReset().mockResolvedValue({ exists: () => false });
    updateMock.mockReset().mockResolvedValue(undefined);
    logMock.mockReset().mockResolvedValue(undefined);
    callMock.mockReset().mockResolvedValue({ uid: 'new-member-uid' });
    db = createDB(`test-dept-${newId()}`);
    session = createSessionStore(db);
    await session.boot(UID);
    await session.setMember({ accountId: FB_UID, displayName: memberName });
    svc = createDepartmentService({ session: () => session, db });
    const r = await svc.createDepartment('Hamden Fire Rescue');
    if (!r.ok) throw new Error('setup: create failed');
    setMock.mockClear();
  });

  afterEach(async () => {
    await db.delete();
  });

  const dana = {
    email: 'dkim@hamdenfd.example', displayName: 'Dana Kim', starterPassword: 'kim123!',
    role: 'default', apparatusId: 'rig-e2',
  };

  it('provisionMember calls the callable with the dept id and audits memberProvisioned', async () => {
    const r = await svc.provisionMember(dana);
    expect(r.ok).toBe(true);
    expect(r.uid).toBe('new-member-uid');
    expect(callMock).toHaveBeenCalledWith('provisionAccount', expect.objectContaining({
      ...dana, deptId: expect.any(String),
    }));
    expect(auditWrites()).toHaveLength(1);
    expect(auditWrites()[0]![1]).toMatchObject({ type: 'memberProvisioned', targetUid: 'new-member-uid', roleId: 'default' });
  });

  it('provisionMember maps already-exists to the invite-code copy and writes NO audit', async () => {
    callMock.mockRejectedValue({ code: 'functions/already-exists', message: 'exists' });
    const r = await svc.provisionMember(dana);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/invite code/i);
    expect(auditWrites()).toHaveLength(0);
  });

  it('provisionMember maps unreachable-server codes to the offline copy', async () => {
    callMock.mockRejectedValue({ code: 'functions/unavailable', message: 'unavailable' });
    const r = await svc.provisionMember(dana);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/reach the server/i);
  });

  it('provisionMember passes the server message through for application errors', async () => {
    callMock.mockRejectedValue({ code: 'functions/permission-denied', message: 'Only an Admin can add another Admin.' });
    const r = await svc.provisionMember({ ...dana, role: 'admin' });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/Only an Admin/);
  });

  it('setMemberProfile trims, maps "" to null (clear), and audits memberProfileEdited', async () => {
    const r = await svc.setMemberProfile('uid-x', { rank: ' Lieutenant ', badge: '', apparatusId: 'rig-r1' });
    expect(r.ok).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining('/members/uid-x') }),
      { rank: 'Lieutenant', badge: null, apparatusId: 'rig-r1' },
    );
    expect(auditWrites()[0]![1]).toMatchObject({ type: 'memberProfileEdited', targetUid: 'uid-x' });
    expect(callMock).not.toHaveBeenCalled(); // no displayName → no Auth-profile sync
  });

  it('setMemberProfile with a displayName also syncs the Auth profile (best-effort callable)', async () => {
    const r = await svc.setMemberProfile('uid-x', { displayName: 'Dana Kim-Reyes' });
    expect(r.ok).toBe(true);
    expect(callMock).toHaveBeenCalledWith('adminUpdateAccount', expect.objectContaining({
      targetUid: 'uid-x', displayName: 'Dana Kim-Reyes',
    }));
  });

  it('setMemberProfile rejects an empty displayName (schema requires non-empty)', async () => {
    const r = await svc.setMemberProfile('uid-x', { displayName: '  ' });
    expect(r.ok).toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('changeMemberEmail + resetMemberPassword ride the callable and audit uid-only entries', async () => {
    callMock.mockResolvedValue({ ok: true });
    expect((await svc.changeMemberEmail('uid-x', 'new@fd.example')).ok).toBe(true);
    expect((await svc.resetMemberPassword('uid-x', 'kim123!')).ok).toBe(true);
    const types = auditWrites().map(([, body]) => (body as { type: string }).type);
    expect(types).toEqual(['accountEmailChanged', 'passwordResetToStarter']);
    for (const [, body] of auditWrites()) {
      expect(JSON.stringify(body)).not.toMatch(/kim123|new@fd/); // never values, uids only
    }
  });

  it('clearMustChangePassword self-writes the one-way flag clear on the OWN row', async () => {
    const r = await svc.clearMustChangePassword();
    expect(r.ok).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining(`/members/${FB_UID}`) }),
      { mustChangePassword: false },
    );
    expect(auditWrites()).toHaveLength(0); // hygiene, not governance
  });

  it('every #439 method degrades honestly with no department', async () => {
    const bareDb = createDB(`test-dept-${newId()}`);
    const bare = createSessionStore(bareDb);
    await bare.boot(UID);
    const bareSvc = createDepartmentService({ session: () => bare, db: bareDb });
    expect((await bareSvc.provisionMember(dana)).ok).toBe(false);
    expect((await bareSvc.changeMemberEmail('u', 'e@x.y')).ok).toBe(false);
    expect((await bareSvc.resetMemberPassword('u', 'kim123!')).ok).toBe(false);
    expect((await bareSvc.clearMustChangePassword()).ok).toBe(false);
    expect(callMock).not.toHaveBeenCalled();
    await bareDb.delete();
  });
});

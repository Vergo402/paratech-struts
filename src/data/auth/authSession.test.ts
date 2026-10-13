import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mocks before any module that imports firebase runs. The unsub spy is
// hoisted so the onAuthStateChanged factory can return a stable reference.
const { unsubSpy } = vi.hoisted(() => ({ unsubSpy: vi.fn() }));
vi.mock('../sync/firebase', () => ({
  rtdb: {},
  ref: (_: unknown, path: string) => ({ path }),
  get: vi.fn().mockResolvedValue({ exists: () => false }),
  set: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./firebase', () => ({ firebaseAuth: {} }));
// authSession lazily imports departmentService (the #419 outbox retry), which now
// pulls the functions seam (#439) — mock it so the graph never reaches firebase/functions.
vi.mock('../functions/firebase', () => ({ callFunction: vi.fn() }));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(() => unsubSpy),
}));

import { onAuthStateChanged } from 'firebase/auth';
import { get, set } from '../sync/firebase';
import { createDepartmentService } from '../dept/departmentService';
import { syncStatusStore } from '../sync/syncStatus';
import { createDB, type FieldShoreDB } from '../store/db';
import { createSessionStore, type SessionStoreApi } from '../store/session';
import { createAuthSessionSync, type AuthSessionSync } from './authSession';
import { newId } from '@core/id';

const UID = 'device-uid-1';
const reloadSpy = vi.fn();

/** The callback passed to the most recent onAuthStateChanged registration. */
function fireAuthState(user: unknown): void {
  const calls = vi.mocked(onAuthStateChanged).mock.calls;
  const cb = calls[calls.length - 1]![1] as (user: unknown) => void;
  cb(user);
}

describe('authSessionSync — reconcile the session with Firebase Auth', () => {
  let db: FieldShoreDB;
  let session: SessionStoreApi;
  let sync: AuthSessionSync;

  beforeEach(async () => {
    vi.mocked(onAuthStateChanged).mockClear();
    unsubSpy.mockClear();
    reloadSpy.mockClear();
    vi.mocked(get).mockReset().mockResolvedValue({ exists: () => false } as never);
    vi.mocked(set).mockClear();
    syncStatusStore.setPendingJoin(null);
    db = createDB(`test-authsession-${newId()}`);
    session = createSessionStore(db);
    await session.boot(UID);
    // Non-join tests get a no-op join retry so they never reach the singleton
    // departmentService / shared globalDb; the #466 tests inject their own.
    sync = createAuthSessionSync({
      session: () => session,
      reload: reloadSpy,
      isOnline: () => true,
      retryPendingJoin: () => Promise.resolve(false),
    });
  });

  afterEach(async () => {
    sync.stop();
    await db.delete();
  });

  it('restores a member when Firebase reports a signed-in user (guest → member)', async () => {
    expect(session.store.getState().identity).toEqual({ kind: 'guest' });
    sync.start();
    fireAuthState({ uid: 'fb-1', displayName: 'Capt. Marchetti', email: 'm@dept14.gov' });
    await vi.waitFor(() => {
      expect(session.store.getState().identity).toMatchObject({
        kind: 'member',
        accountId: 'fb-1',
        displayName: 'Capt. Marchetti',
      });
    });
  });

  it('falls back to the email local-part when the Firebase user has no displayName', async () => {
    sync.start();
    fireAuthState({ uid: 'fb-2', displayName: null, email: 'marchetti@dept14.gov' });
    await vi.waitFor(() => {
      expect(session.store.getState().identity).toMatchObject({
        kind: 'member',
        displayName: 'marchetti',
      });
    });
  });

  it('drops to guest when Firebase reports no user (member → guest)', async () => {
    await session.setMember({ accountId: 'fb-1', displayName: 'Capt. Marchetti' });
    sync.start();
    fireAuthState(null);
    await vi.waitFor(() => {
      expect(session.store.getState().identity).toEqual({ kind: 'guest' });
    });
  });

  it('is a no-op when the Firebase user matches the current member', async () => {
    await session.setMember({ accountId: 'fb-1', displayName: 'Capt. Marchetti' });
    sync.start();
    const before = session.store.getState().identity;
    // Same uid → must NOT overwrite, even if the Firebase displayName differs.
    fireAuthState({ uid: 'fb-1', displayName: 'Different Name', email: 'x@y.z' });
    await Promise.resolve();
    await Promise.resolve();
    expect(session.store.getState().identity).toBe(before);
    expect(reloadSpy).not.toHaveBeenCalled(); // no setMember → no bucket reboot
  });

  it('reboots onto the active bucket after restoring a member (replaces the removed reactive subscribe)', async () => {
    sync.start();
    fireAuthState({ uid: 'fb-9', displayName: 'Cap', email: 'c@d.gov' });
    // setMember restores → departmentId differs from the (unactivated) bucket → reload.
    await vi.waitFor(() => expect(reloadSpy).toHaveBeenCalled());
  });

  it('start() is idempotent — registers the listener once', () => {
    sync.start();
    sync.start();
    expect(onAuthStateChanged).toHaveBeenCalledTimes(1);
  });

  it('stop() detaches the listener', () => {
    sync.start();
    sync.stop();
    expect(unsubSpy).toHaveBeenCalledTimes(1);
  });

  describe('queued-join retry on authenticated boot (#466)', () => {
    const CODE = 'HAMD-4F2K';
    const PENDING_KEY = 'fieldshore_pending_join';
    const queued = { code: CODE, deptName: 'Hamden Fire Rescue' };
    const row = (extra: object) => ({ key: PENDING_KEY, value: JSON.stringify({ ...queued, ...extra }) });
    const memberWrite = () =>
      vi.mocked(set).mock.calls.filter(([r]) => (r as unknown as { path: string }).path === 'orgs/dept-1/members/fb-1');

    async function arrange(online: boolean, opts: { signedIn?: string; stored?: object } = {}) {
      // A member who queued a join offline, then killed the app; it reopens with auth restored.
      await session.setMember({ accountId: opts.signedIn ?? 'fb-1', displayName: 'Capt. Marchetti' });
      await db.meta.put(row(opts.stored ?? { uid: 'fb-1' }));
      syncStatusStore.setPendingJoin(queued);
      vi.mocked(get).mockImplementation((async (r: { path: string }) =>
        r.path === `orgs/inviteCodes/${CODE}`
          ? {
              exists: () => true,
              val: () => ({ deptId: 'dept-1', deptName: 'Hamden Fire Rescue', createdBy: 'f', createdAt: 1, active: true }),
            }
          : { exists: () => false }) as never);
      const svc = createDepartmentService({ session: () => session, db });
      const retrySpy = vi.fn(() => svc.retryPendingJoin());
      sync.stop();
      sync = createAuthSessionSync({
        session: () => session,
        reload: reloadSpy,
        isOnline: () => online,
        retryPendingJoin: retrySpy,
      });
      sync.start();
      return retrySpy;
    }

    it('reopened already online → completes the queued join and reboots onto the new department', async () => {
      await arrange(true);
      fireAuthState({ uid: 'fb-1', displayName: 'Capt. Marchetti', email: 'm@dept14.gov' });
      await vi.waitFor(() => expect(reloadSpy).toHaveBeenCalledTimes(1));
      expect(memberWrite()).toHaveLength(1);
      expect(session.store.getState().departmentId).toBe('dept-1');
      expect(await db.meta.get(PENDING_KEY)).toBeUndefined();
      expect(syncStatusStore.store.getState().pendingJoin).toBeNull();
    });

    it('reopened offline → does not attempt the join; the intent and banner stay', async () => {
      const retrySpy = await arrange(false);
      fireAuthState({ uid: 'fb-1', displayName: 'Capt. Marchetti', email: 'm@dept14.gov' });
      await Promise.resolve();
      await Promise.resolve();
      expect(retrySpy).not.toHaveBeenCalled();
      expect(memberWrite()).toHaveLength(0);
      expect(reloadSpy).not.toHaveBeenCalled();
      expect(JSON.parse((await db.meta.get(PENDING_KEY))!.value)).toEqual({ ...queued, uid: 'fb-1' });
      expect(syncStatusStore.store.getState().pendingJoin).toEqual(queued);
    });

    it('shared device: account B boots online over account A\'s queued join → no join, intent + banner cleared', async () => {
      await arrange(true, { signedIn: 'fb-B' });
      fireAuthState({ uid: 'fb-B', displayName: 'FF Okafor', email: 'o@dept14.gov' });
      await vi.waitFor(async () => expect(await db.meta.get(PENDING_KEY)).toBeUndefined());
      expect(vi.mocked(set).mock.calls.filter(([r]) => (r as unknown as { path: string }).path.startsWith('orgs/dept-1/members/'))).toHaveLength(0);
      expect(reloadSpy).not.toHaveBeenCalled();
      expect(syncStatusStore.store.getState().pendingJoin).toBeNull();
      expect(session.store.getState().departmentId).toBeNull();
    });

    it('a legacy intent row without a uid is cleared on boot without a join', async () => {
      await arrange(true, { stored: {} });
      fireAuthState({ uid: 'fb-1', displayName: 'Capt. Marchetti', email: 'm@dept14.gov' });
      await vi.waitFor(async () => expect(await db.meta.get(PENDING_KEY)).toBeUndefined());
      expect(memberWrite()).toHaveLength(0);
      expect(reloadSpy).not.toHaveBeenCalled();
      expect(syncStatusStore.store.getState().pendingJoin).toBeNull();
    });

    it('a rejecting join retry is swallowed: no unhandled rejection, no reload', async () => {
      await session.setMember({ accountId: 'fb-1', displayName: 'Capt. Marchetti' });
      const unhandled = vi.fn();
      process.on('unhandledRejection', unhandled);
      try {
        sync.stop();
        sync = createAuthSessionSync({
          session: () => session,
          reload: reloadSpy,
          isOnline: () => true,
          retryPendingJoin: () => Promise.reject(new Error('IndexedDB blew up')),
        });
        sync.start();
        fireAuthState({ uid: 'fb-1', displayName: 'Capt. Marchetti', email: 'm@dept14.gov' });
        await new Promise((r) => setTimeout(r, 20));
        expect(unhandled).not.toHaveBeenCalled();
        expect(reloadSpy).not.toHaveBeenCalled();
      } finally {
        process.off('unhandledRejection', unhandled);
      }
    });

    it('defers the join to the next boot when this boot is already rebooting onto another bucket', async () => {
      const retrySpy = await arrange(true);
      // A DIFFERENT uid → setMember → bucket mismatch → reload. Joining now could tear
      // (member row lands, page unloads before the local projection + intent clear).
      fireAuthState({ uid: 'fb-9', displayName: 'Cap', email: 'c@d.gov' });
      await vi.waitFor(() => expect(reloadSpy).toHaveBeenCalledTimes(1));
      expect(retrySpy).not.toHaveBeenCalled();
      expect(await db.meta.get(PENDING_KEY)).toBeDefined();
    });
  });
});

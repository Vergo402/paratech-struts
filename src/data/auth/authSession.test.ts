import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mocks before any module that imports firebase runs. The unsub spy is
// hoisted so the onAuthStateChanged factory can return a stable reference.
const { unsubSpy } = vi.hoisted(() => ({ unsubSpy: vi.fn() }));
vi.mock('./firebase', () => ({ firebaseAuth: {} }));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(() => unsubSpy),
}));

import { onAuthStateChanged } from 'firebase/auth';
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
    db = createDB(`test-authsession-${newId()}`);
    session = createSessionStore(db);
    await session.boot(UID);
    sync = createAuthSessionSync({ session: () => session, reload: reloadSpy });
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
});

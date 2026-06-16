import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mocks before any module that imports firebase runs.
vi.mock('./firebase', () => ({ firebaseAuth: {} }));
vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  signOut: vi.fn(),
}));

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut,
} from 'firebase/auth';
import { createDB, type FieldShoreDB } from '../store/db';
import { createSessionStore, SESSION_KEY, type SessionStoreApi } from '../store/session';
import { createAccountService, type AccountServiceApi } from './accountService';
import { newId } from '@core/id';
import type { InventoryItem } from '@core/schema';

const UID = 'device-test-uid';
const FB_UID = 'firebase-uid-abc123';

const sentinel: InventoryItem = {
  id: 'inv-sentinel', type: 'strut', model: 'LS 203', system: 'LongShore',
  apparatus: 'Rescue 2', apparatusId: 'app-r2', quantity: 1, available: 1,
};

describe('accountService (account seam — create / sign in / sign out)', () => {
  let db: FieldShoreDB;
  let session: SessionStoreApi;
  let account: AccountServiceApi;

  beforeEach(async () => {
    vi.mocked(createUserWithEmailAndPassword).mockResolvedValue(
      { user: { uid: FB_UID, displayName: null } } as never,
    );
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue(
      { user: { uid: FB_UID, displayName: 'Capt. Reyes' } } as never,
    );
    vi.mocked(updateProfile).mockResolvedValue(undefined);
    vi.mocked(fbSignOut).mockResolvedValue(undefined);

    db = createDB(`test-account-${newId()}`);
    session = createSessionStore(db);
    account = createAccountService({ session: () => session });
    await session.boot(UID);
  });

  afterEach(async () => {
    await db.delete();
  });

  it('rejects create-account with an empty display name and writes nothing', async () => {
    const res = await account.createAccount({ email: 'r@d.gov', password: 'pw', displayName: '' });
    expect(res.ok).toBe(false);
    // Guard fires BEFORE Firebase — no call, no session write (ADR-025).
    expect(vi.mocked(createUserWithEmailAndPassword)).not.toHaveBeenCalled();
    expect(session.store.getState().identity).toEqual({ kind: 'guest' });
    expect(await db.meta.get(SESSION_KEY)).toBeUndefined();
  });

  it('rejects a whitespace-only display name', async () => {
    const res = await account.createAccount({ email: 'r@d.gov', password: 'pw', displayName: '   ' });
    expect(res.ok).toBe(false);
    expect(vi.mocked(createUserWithEmailAndPassword)).not.toHaveBeenCalled();
    expect(session.store.getState().identity.kind).toBe('guest');
  });

  it('creates a member session with the Firebase uid and trims the display name', async () => {
    const res = await account.createAccount({ email: 'r@d.gov', password: 'pw', displayName: '  Capt. Reyes  ' });
    expect(res.ok).toBe(true);
    const identity = session.store.getState().identity;
    expect(identity.kind).toBe('member');
    if (identity.kind === 'member') {
      expect(identity.displayName).toBe('Capt. Reyes');
      expect(identity.accountId).toBe(FB_UID);
    }
  });

  it('returns ok:false when Firebase rejects the create (e.g. email already in use)', async () => {
    vi.mocked(createUserWithEmailAndPassword).mockRejectedValue({ code: 'auth/email-already-in-use' });
    const res = await account.createAccount({ email: 'taken@dept14.gov', password: 'pw', displayName: 'Reyes' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain('already exists');
    expect(session.store.getState().identity.kind).toBe('guest');
  });

  it('signs a member in and stores their Firebase uid', async () => {
    const res = await account.signIn({ email: 'reyes@dept14.gov', password: 'pw' });
    expect(res.ok).toBe(true);
    const identity = session.store.getState().identity;
    expect(identity.kind).toBe('member');
    if (identity.kind === 'member') expect(identity.accountId).toBe(FB_UID);
  });

  it('falls back to email local-part when the Firebase profile has no displayName', async () => {
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue(
      { user: { uid: FB_UID, displayName: null } } as never,
    );
    const res = await account.signIn({ email: 'marchetti@dept14.gov', password: 'pw' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.member.displayName).toBe('marchetti');
  });

  it('returns ok:false when Firebase rejects the sign-in', async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValue({ code: 'auth/invalid-credential' });
    const res = await account.signIn({ email: 'reyes@dept14.gov', password: 'wrong' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain("don't match");
    expect(session.store.getState().identity.kind).toBe('guest');
  });

  it('signs out back to guest', async () => {
    await account.signIn({ email: 'reyes@dept14.gov', password: 'pw' });
    await account.signOut();
    expect(session.store.getState().identity).toEqual({ kind: 'guest' });
  });

  it('sign-out preserves local work (inventory intact)', async () => {
    await db.inventory.add(sentinel);
    const before = await db.inventory.count();
    await account.signIn({ email: 'reyes@dept14.gov', password: 'pw' });
    await account.signOut();
    expect(await db.inventory.count()).toBe(before);
  });
});

// @vitest-environment jsdom
// jsdom: accountService's magic-link flow reads window.location.origin +
// window.localStorage (the email stash). The setup file provides a spec-faithful
// localStorage shim for jsdom; node-env data tests are unaffected.
import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mocks before any module that imports firebase runs.
vi.mock('../sync/firebase', () => ({
  rtdb: {},
  ref: (_: unknown, path: string) => ({ path }),
  get: vi.fn().mockResolvedValue({ exists: () => false }),
  set: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./firebase', () => ({ firebaseAuth: {} }));
vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  updatePassword: vi.fn(),
  signOut: vi.fn(),
  sendSignInLinkToEmail: vi.fn(),
  isSignInWithEmailLink: vi.fn(),
  signInWithEmailLink: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  deleteUser: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  EmailAuthProvider: { credential: vi.fn(() => ({ _: 'cred' })) },
}));

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  updatePassword,
  signOut as fbSignOut,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendPasswordResetEmail,
  deleteUser,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { firebaseAuth } from './firebase';
import { remove } from '../sync/firebase';
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
    // Clear call history each test (keep implementations, re-set below) so the
    // `not.toHaveBeenCalled()` assertions are order-independent.
    vi.clearAllMocks();
    vi.mocked(createUserWithEmailAndPassword).mockResolvedValue(
      { user: { uid: FB_UID, displayName: null } } as never,
    );
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue(
      { user: { uid: FB_UID, displayName: 'Capt. Reyes' } } as never,
    );
    vi.mocked(updateProfile).mockResolvedValue(undefined);
    vi.mocked(updatePassword).mockResolvedValue(undefined);
    vi.mocked(fbSignOut).mockResolvedValue(undefined);
    vi.mocked(sendSignInLinkToEmail).mockResolvedValue(undefined);
    vi.mocked(isSignInWithEmailLink).mockReturnValue(false);
    vi.mocked(signInWithEmailLink).mockResolvedValue(
      { user: { uid: FB_UID, displayName: 'Capt. Reyes' } } as never,
    );
    vi.mocked(sendPasswordResetEmail).mockResolvedValue(undefined);
    vi.mocked(deleteUser).mockResolvedValue(undefined);
    vi.mocked(reauthenticateWithCredential).mockResolvedValue({} as never);
    (firebaseAuth as { currentUser: unknown }).currentUser = null;
    window.localStorage.clear();

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

  it('sendMagicLink: sends a same-device link and stashes the trimmed email', async () => {
    const res = await account.sendMagicLink('  reyes@dept14.gov  ');
    expect(res.ok).toBe(true);
    expect(vi.mocked(sendSignInLinkToEmail)).toHaveBeenCalledWith(
      expect.anything(),
      'reyes@dept14.gov',
      expect.objectContaining({ handleCodeInApp: true }),
    );
    expect(window.localStorage.getItem('fieldshore_magic_email')).toBe('reyes@dept14.gov');
  });

  it('sendMagicLink: rejects an empty email before any network call', async () => {
    const res = await account.sendMagicLink('   ');
    expect(res.ok).toBe(false);
    expect(vi.mocked(sendSignInLinkToEmail)).not.toHaveBeenCalled();
  });

  it('isMagicLink: delegates to Firebase (and is safe on a thrown check)', () => {
    vi.mocked(isSignInWithEmailLink).mockReturnValueOnce(true);
    expect(account.isMagicLink('https://app/auth?mode=signIn')).toBe(true);
    vi.mocked(isSignInWithEmailLink).mockImplementationOnce(() => {
      throw new Error('bad url');
    });
    expect(account.isMagicLink('garbage')).toBe(false);
  });

  it('completeMagicLink: signs in with the stashed email → member, then clears the stash', async () => {
    window.localStorage.setItem('fieldshore_magic_email', 'reyes@dept14.gov');
    const res = await account.completeMagicLink('https://app/auth?oobCode=x');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.member.accountId).toBe(FB_UID);
    expect(session.store.getState().identity.kind).toBe('member');
    expect(window.localStorage.getItem('fieldshore_magic_email')).toBeNull();
  });

  it('completeMagicLink: no stashed email (cross-device) → calm reason, no sign-in', async () => {
    const res = await account.completeMagicLink('https://app/auth?oobCode=x');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/same device/i);
    expect(vi.mocked(signInWithEmailLink)).not.toHaveBeenCalled();
    expect(session.store.getState().identity.kind).toBe('guest');
  });

  it('completeMagicLink: an expired / already-used link maps to "request a new one"', async () => {
    window.localStorage.setItem('fieldshore_magic_email', 'reyes@dept14.gov');
    vi.mocked(signInWithEmailLink).mockRejectedValueOnce({ code: 'auth/expired-action-code' });
    const res = await account.completeMagicLink('https://app/auth?oobCode=stale');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/expired or was already used/i);
    expect(session.store.getState().identity.kind).toBe('guest');
  });

  it('completeMagicLink: a never-registered email auto-creates → guard deletes it and rejects (ADR-025)', async () => {
    window.localStorage.setItem('fieldshore_magic_email', 'newbie@dept14.gov');
    const del = vi.fn().mockResolvedValue(undefined);
    // Brand-new account: created === last-signed-in, no display name.
    vi.mocked(signInWithEmailLink).mockResolvedValueOnce({
      user: {
        uid: FB_UID,
        displayName: null,
        metadata: { creationTime: 'Mon, 22 Jun 2026 10:00:00 GMT', lastSignInTime: 'Mon, 22 Jun 2026 10:00:00 GMT' },
        delete: del,
      },
    } as never);
    const res = await account.completeMagicLink('https://app/auth?oobCode=x');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/no account found/i);
    expect(del).toHaveBeenCalledOnce();
    expect(session.store.getState().identity.kind).toBe('guest');
  });

  it('completeMagicLink: an EXISTING nameless account signs in and falls back to email local-part', async () => {
    window.localStorage.setItem('fieldshore_magic_email', 'marchetti@dept14.gov');
    // Existing account: created !== last-signed-in → not freshly minted, passes the guard.
    vi.mocked(signInWithEmailLink).mockResolvedValueOnce({
      user: {
        uid: FB_UID,
        displayName: null,
        metadata: { creationTime: 'Mon, 01 Jun 2026 09:00:00 GMT', lastSignInTime: 'Mon, 22 Jun 2026 10:00:00 GMT' },
      },
    } as never);
    const res = await account.completeMagicLink('https://app/auth?oobCode=x');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.member.displayName).toBe('marchetti');
    expect(session.store.getState().identity.kind).toBe('member');
  });

  it('sendPasswordReset: emails a reset link for a non-empty address', async () => {
    const res = await account.sendPasswordReset('reyes@dept14.gov');
    expect(res.ok).toBe(true);
    expect(vi.mocked(sendPasswordResetEmail)).toHaveBeenCalledWith(
      expect.anything(),
      'reyes@dept14.gov',
    );
    expect((await account.sendPasswordReset('   ')).ok).toBe(false);
  });

  it('deleteAccount: re-auths with the password, then deletes the Firebase user (ok)', async () => {
    (firebaseAuth as { currentUser: unknown }).currentUser = { uid: FB_UID, email: 'reyes@dept14.gov' };
    const res = await account.deleteAccount('pw');
    expect(res.ok).toBe(true);
    expect(vi.mocked(reauthenticateWithCredential)).toHaveBeenCalledOnce();
    expect(vi.mocked(deleteUser)).toHaveBeenCalledOnce();
  });

  it('deleteAccount: drops the /userDepts reverse-index entry before deleting the user', async () => {
    (firebaseAuth as { currentUser: unknown }).currentUser = { uid: FB_UID, email: 'reyes@dept14.gov' };
    const order: string[] = [];
    vi.mocked(remove).mockImplementationOnce(async () => { order.push('remove'); });
    vi.mocked(deleteUser).mockImplementationOnce(async () => { order.push('delete'); });
    const res = await account.deleteAccount('pw');
    expect(res.ok).toBe(true);
    expect(vi.mocked(remove)).toHaveBeenCalledWith({ path: `userDepts/${FB_UID}` });
    expect(order).toEqual(['remove', 'delete']); // index cleared while still authenticated
  });

  it('deleteAccount: a failed reverse-index cleanup is swallowed (account still deletes)', async () => {
    (firebaseAuth as { currentUser: unknown }).currentUser = { uid: FB_UID, email: 'reyes@dept14.gov' };
    vi.mocked(remove).mockRejectedValueOnce(new Error('permission denied'));
    const res = await account.deleteAccount('pw');
    expect(res.ok).toBe(true);
    expect(vi.mocked(deleteUser)).toHaveBeenCalledOnce();
  });

  it('deleteAccount: a wrong password fails with a password reason and never deletes', async () => {
    (firebaseAuth as { currentUser: unknown }).currentUser = { uid: FB_UID, email: 'reyes@dept14.gov' };
    vi.mocked(reauthenticateWithCredential).mockRejectedValueOnce({ code: 'auth/invalid-credential' });
    const res = await account.deleteAccount('wrong');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/password doesn't match/i);
    expect(vi.mocked(deleteUser)).not.toHaveBeenCalled();
  });

  it('deleteAccount: no signed-in user → ok:false and never re-auths', async () => {
    (firebaseAuth as { currentUser: unknown }).currentUser = null;
    const res = await account.deleteAccount('pw');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/not signed in/i);
    expect(vi.mocked(reauthenticateWithCredential)).not.toHaveBeenCalled();
  });

  // ---- changePassword (#439 forced first-sign-in change) ----

  it('changePassword: reauths FIRST, then updates (deterministic — never trips requires-recent-login)', async () => {
    (firebaseAuth as { currentUser: unknown }).currentUser = { email: 'r@d.gov' };
    const res = await account.changePassword('kim123!', 'my-real-password');
    expect(res.ok).toBe(true);
    const reauthOrder = vi.mocked(reauthenticateWithCredential).mock.invocationCallOrder[0];
    const updateOrder = vi.mocked(updatePassword).mock.invocationCallOrder[0];
    expect(reauthOrder).toBeLessThan(updateOrder!);
    expect(vi.mocked(updatePassword)).toHaveBeenCalledWith({ email: 'r@d.gov' }, 'my-real-password');
  });

  it('changePassword: wrong current password → inline reason, no update attempted', async () => {
    (firebaseAuth as { currentUser: unknown }).currentUser = { email: 'r@d.gov' };
    vi.mocked(reauthenticateWithCredential).mockRejectedValue({ code: 'auth/invalid-credential' });
    const res = await account.changePassword('wrong', 'my-real-password');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/current password/i);
    expect(vi.mocked(updatePassword)).not.toHaveBeenCalled();
  });

  it('changePassword: short new password fails locally — nothing reaches Firebase', async () => {
    (firebaseAuth as { currentUser: unknown }).currentUser = { email: 'r@d.gov' };
    const res = await account.changePassword('kim123!', 'tiny');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/6 characters/);
    expect(vi.mocked(reauthenticateWithCredential)).not.toHaveBeenCalled();
    expect(vi.mocked(updatePassword)).not.toHaveBeenCalled();
  });

  it('changePassword: signed out → ok:false', async () => {
    (firebaseAuth as { currentUser: unknown }).currentUser = null;
    const res = await account.changePassword('a', 'my-real-password');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/not signed in/i);
  });
});

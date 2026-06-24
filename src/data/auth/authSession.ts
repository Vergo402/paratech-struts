import { onAuthStateChanged } from 'firebase/auth';
import { sessionStore, type SessionStoreApi } from '../store/session';
import { currentBucket } from '../store/registry';
import { GUEST_BUCKET } from '../store/db';
import { resolveDisplayName } from './accountService';
import { firebaseAuth } from './firebase';

// data/auth — reconcile the local session with Firebase Auth's restored user on
// app start. Firebase persists the signed-in user to IndexedDB and re-hydrates
// it (even offline) via onAuthStateChanged. WITHOUT this, a returning member's
// RTDB writes would be unauthenticated and the app would silently treat them as
// a guest. The persisted meta-row session (session.ts) covers the FIRST paint;
// this listener keeps the session aligned with Firebase thereafter:
//   Firebase user present → member (uid + displayName, mirroring accountService)
//   Firebase user null    → guest
// signIn / createAccount / signOut already set the session directly; the guards
// below make the listener a no-op in those cases (no redundant-write storm).
//
// Factory + singleton mirror accountService: createAuthSessionSync() for tests
// (inject a session store, drive the mocked onAuthStateChanged); authSessionSync
// is the app singleton, started once from main.tsx after bootData().

export interface AuthSessionSync {
  /** Register the listener (idempotent — StrictMode double-start is a no-op). */
  start(): void;
  /** Detach the listener. */
  stop(): void;
}

export function createAuthSessionSync(deps: {
  session: () => SessionStoreApi;
  /** Reboot onto the active department's bucket. Injected so tests don't navigate;
   *  defaults to a full reload (mirrors ui/dept/switchBucket — @data can't import @ui). */
  reload?: () => void;
}): AuthSessionSync {
  let unsub: (() => void) | null = null;
  const reload = deps.reload ?? (() => window.location.assign('/operations'));
  return {
    start() {
      if (unsub) return;
      unsub = onAuthStateChanged(firebaseAuth, async (user) => {
        const session = deps.session();
        const identity = session.store.getState().identity;
        if (user) {
          // Align local → Firebase only when they differ (skip redundant writes
          // right after signIn/createAccount, which already set the member).
          if (identity.kind !== 'member' || identity.accountId !== user.uid) {
            const displayName = resolveDisplayName(user.displayName, user.email);
            await session.setMember({ accountId: user.uid, displayName });
            // setMember restored this account's department from local memory. If its
            // bucket isn't the ACTIVE one, the app booted on the wrong bucket (a
            // degraded session row, or a member restored mid guest-session) and would
            // read/write the guest cache under their department — reboot onto the
            // right bucket. (The reactive subscribe that used to catch every
            // departmentId change was removed; this is the async writer that needs it.
            // Gated to the setMember branch so sign-out / account-delete — the setGuest
            // path, which drives its own navigation — is never hijacked here.)
            const departmentId = session.store.getState().departmentId;
            if ((departmentId || GUEST_BUCKET) !== currentBucket()) reload();
          }
          // Seed the cloud reverse index (/userDepts/{uid}) on every authenticated
          // boot — not just a fresh sign-in — so an account created BEFORE the index
          // existed self-heals on its next ordinary app open (no sign-out ritual).
          // Idempotent fire-and-forget; no-ops when the member has no department.
          session.seedUserDeptIndex();
        } else if (identity.kind === 'member') {
          // No authenticated Firebase user → can't act as a member for cloud
          // work. Drop to guest; setGuest never touches local events/inventory.
          void session.setGuest();
        }
      });
    },
    stop() {
      unsub?.();
      unsub = null;
    },
  };
}

/** The app's singleton, bound to the singleton session store. Started in main.tsx. */
export const authSessionSync = createAuthSessionSync({ session: () => sessionStore });

import { onAuthStateChanged } from 'firebase/auth';
import { sessionStore, type SessionStoreApi } from '../store/session';
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

export function createAuthSessionSync(deps: { session: () => SessionStoreApi }): AuthSessionSync {
  let unsub: (() => void) | null = null;
  return {
    start() {
      if (unsub) return;
      unsub = onAuthStateChanged(firebaseAuth, (user) => {
        const session = deps.session();
        const identity = session.store.getState().identity;
        if (user) {
          // Align local → Firebase only when they differ (skip redundant writes
          // right after signIn/createAccount, which already set the member).
          if (identity.kind !== 'member' || identity.accountId !== user.uid) {
            const displayName = resolveDisplayName(user.displayName, user.email);
            void session.setMember({ accountId: user.uid, displayName });
          }
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

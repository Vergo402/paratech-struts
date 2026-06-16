import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut,
} from 'firebase/auth';
import { sessionStore, type SessionStoreApi } from '../store/session';
import { firebaseAuth } from './firebase';

// data/auth — the account seam: the ONE path a member creates an account /
// signs in / signs out. Firebase Auth (email+password, ADR-025) is the
// transport; the seam interface is unchanged so callers (AuthScreen, useSession)
// needed no edits when the stub was replaced. Magic-link and password-reset
// land here in a later session — their UI buttons already render greyed-out.
//
// Offline auth window (ADR-025): signing in must never block a returning member
// who last signed in online. The Firebase SDK handles its own credential cache;
// we don't build a separate offline queue here.
//
// Invariant: this file and data/sync/firebase.ts are the ONLY v4 Firebase
// importers. Callers go through the seam, never Firebase directly.

export interface CreateAccountInput {
  email: string;
  password: string;
  displayName: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export type AuthResult =
  | { ok: true; member: { accountId: string; displayName: string } }
  | { ok: false; reason: string };

export interface AccountServiceApi {
  /** Create an account → member session. Rejects an empty display name (ADR-025). */
  createAccount(input: CreateAccountInput): Promise<AuthResult>;
  /** Sign in → member session. */
  signIn(input: SignInInput): Promise<AuthResult>;
  /** Sign out → guest. Never discards local work. */
  signOut(): Promise<void>;
}

function mapFirebaseError(err: unknown): string {
  const code = (err as { code?: string }).code ?? '';
  if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
    return "That email and password don't match.";
  }
  if (code === 'auth/email-already-in-use') return 'An account with that email already exists.';
  if (code === 'auth/invalid-email') return "That doesn't look like a valid email address.";
  if (code === 'auth/weak-password') return 'Password must be at least 6 characters.';
  if (code === 'auth/too-many-requests') return 'Too many attempts — try again in a moment.';
  if (code === 'auth/network-request-failed') return 'No network connection — check your signal and try again.';
  return 'Something went wrong. Try again.';
}

export function createAccountService(deps: { session: () => SessionStoreApi }): AccountServiceApi {
  return {
    async createAccount({ email, password, displayName }) {
      // The display name is the accountability anchor (ADR-025) — guard FIRST,
      // nothing written on reject.
      const name = displayName.trim();
      if (!name) return { ok: false, reason: 'display name is required' };

      try {
        const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        await updateProfile(cred.user, { displayName: name });
        const member = { accountId: cred.user.uid, displayName: name };
        await deps.session().setMember(member);
        return { ok: true, member };
      } catch (err: unknown) {
        return { ok: false, reason: mapFirebaseError(err) };
      }
    },

    async signIn({ email, password }) {
      try {
        const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
        const displayName = cred.user.displayName || email.split('@')[0]?.trim() || 'Member';
        const member = { accountId: cred.user.uid, displayName };
        await deps.session().setMember(member);
        return { ok: true, member };
      } catch (err: unknown) {
        return { ok: false, reason: mapFirebaseError(err) };
      }
    },

    async signOut() {
      // Best-effort Firebase sign-out — local guest state is set regardless so
      // the UI never gets stuck in a signed-in limbo on network failure.
      await fbSignOut(firebaseAuth).catch(() => {});
      await deps.session().setGuest();
    },
  };
}

/** The app's singleton account service, bound to the singleton session store. */
export const accountService = createAccountService({ session: () => sessionStore });

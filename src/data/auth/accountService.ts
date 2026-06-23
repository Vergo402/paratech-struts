import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { sessionStore, type SessionStoreApi } from '../store/session';
import { firebaseAuth } from './firebase';

// data/auth — the account seam: the ONE path a member creates an account /
// signs in / signs out / requests a magic-link or password reset. Firebase Auth
// (email+password + magic-link, ADR-025) is the transport; both email flows ride
// Firebase's BUILT-IN email (no custom transport). Callers (AuthScreen,
// useSession) reach Firebase only through this seam.
//
// Magic-link is SIGN-IN-ONLY for existing accounts (ADR-025) — the AuthScreen
// only offers it in Sign-In mode, because a new member must set a display name
// (the accountability anchor) which the link flow can't capture. Password reset
// uses Firebase's own hosted reset page, so it needs no landing handler here.
//
// Offline auth window (ADR-025): signing in must never block a returning member
// who last signed in online. The Firebase SDK handles its own credential cache;
// we don't build a separate offline queue here.
//
// Invariant: this file and data/sync/firebase.ts are the ONLY v4 Firebase
// importers. Callers go through the seam, never Firebase directly.

// The email a magic-link was requested for, stashed so the SAME device can
// complete the sign-in when the link is opened (signInWithEmailLink needs it).
// localStorage (not Dexie) — it must be readable synchronously the instant the
// link lands, before the data layer boots.
const MAGIC_EMAIL_KEY = 'fieldshore_magic_email';

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

/** A fire-and-forget action that produces no member (send a link / send a reset). */
export type ActionResult = { ok: true } | { ok: false; reason: string };

export interface AccountServiceApi {
  /** Create an account → member session. Rejects an empty display name (ADR-025). */
  createAccount(input: CreateAccountInput): Promise<AuthResult>;
  /** Sign in → member session. */
  signIn(input: SignInInput): Promise<AuthResult>;
  /** Sign out → guest. Never discards local work. */
  signOut(): Promise<void>;
  /** Email a one-time sign-in link (Firebase built-in email). Sign-in-only (ADR-025). */
  sendMagicLink(email: string): Promise<ActionResult>;
  /** True if this URL is an opened magic-link (drives the AuthScreen landing). */
  isMagicLink(url: string): boolean;
  /** Finish a magic-link sign-in from the opened URL → member session. */
  completeMagicLink(url: string): Promise<AuthResult>;
  /** Email a password-reset link (Firebase hosts the reset page). */
  sendPasswordReset(email: string): Promise<ActionResult>;
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
  if (code === 'auth/invalid-action-code' || code === 'auth/expired-action-code') {
    return 'That sign-in link has expired or was already used — request a new one.';
  }
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

    async sendMagicLink(email) {
      const addr = email.trim();
      if (!addr) return { ok: false, reason: 'Enter your email first.' };
      try {
        // The link returns to /auth, where AuthScreen detects + completes it.
        await sendSignInLinkToEmail(firebaseAuth, addr, {
          url: `${window.location.origin}/auth`,
          handleCodeInApp: true,
        });
        // Stash for completion on the same device (best-effort — a blocked
        // localStorage just means the cross-device "no saved email" path).
        try {
          window.localStorage.setItem(MAGIC_EMAIL_KEY, addr);
        } catch {
          /* storage unavailable */
        }
        return { ok: true };
      } catch (err: unknown) {
        return { ok: false, reason: mapFirebaseError(err) };
      }
    },

    isMagicLink(url) {
      try {
        return isSignInWithEmailLink(firebaseAuth, url);
      } catch {
        return false;
      }
    },

    async completeMagicLink(url) {
      let email = '';
      try {
        email = window.localStorage.getItem(MAGIC_EMAIL_KEY)?.trim() ?? '';
      } catch {
        /* storage unavailable */
      }
      if (!email) {
        // Opened on a different device (or storage cleared) — we have no email to
        // complete with. The cross-device re-entry prompt is deferred; until then
        // this is a calm dead-end, not a crash.
        return {
          ok: false,
          reason: 'Open the link on the same device you requested it from.',
        };
      }
      try {
        const cred = await signInWithEmailLink(firebaseAuth, email, url);
        try {
          window.localStorage.removeItem(MAGIC_EMAIL_KEY);
        } catch {
          /* storage unavailable */
        }
        const displayName = cred.user.displayName || email.split('@')[0]?.trim() || 'Member';
        const member = { accountId: cred.user.uid, displayName };
        await deps.session().setMember(member);
        return { ok: true, member };
      } catch (err: unknown) {
        return { ok: false, reason: mapFirebaseError(err) };
      }
    },

    async sendPasswordReset(email) {
      const addr = email.trim();
      if (!addr) return { ok: false, reason: 'Enter your email first.' };
      try {
        await sendPasswordResetEmail(firebaseAuth, addr);
        return { ok: true };
      } catch (err: unknown) {
        return { ok: false, reason: mapFirebaseError(err) };
      }
    },
  };
}

/** The app's singleton account service, bound to the singleton session store. */
export const accountService = createAccountService({ session: () => sessionStore });

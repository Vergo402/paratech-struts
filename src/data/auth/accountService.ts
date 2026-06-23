import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendPasswordResetEmail,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { sessionStore, type SessionStoreApi } from '../store/session';
import { firebaseAuth } from './firebase';

// data/auth — the account seam: the ONE path a member creates an account /
// signs in / signs out / requests a magic-link or password reset. Firebase Auth
// (email+password + magic-link, ADR-025) is the transport; both email flows ride
// Firebase's BUILT-IN email (no custom transport). Callers (AuthScreen,
// useSession) reach Firebase only through this seam.
//
// Magic-link is SIGN-IN-ONLY for existing accounts (ADR-025) — a new member must
// set a display name (the accountability anchor) which the link flow can't
// capture. Two guards, defense-in-depth:
//   1. UI: AuthScreen offers the link only in Sign-In mode.
//   2. Code: completeMagicLink() below deletes + rejects any account Firebase
//      auto-creates on link-open. signInWithEmailLink MINTS a real account for a
//      never-registered email, so without this guard a typed-in unknown email
//      would seat a nameless member with a fabricated name.
// A Firebase-console toggle that forbids email-link SIGN-UP (Identity Platform /
// a blocking function) is recommended belt-and-suspenders, but the accountability
// anchor does NOT depend on it — guard #2 enforces it in CODE, so a console
// regression can't silently reopen the gap. Password reset uses Firebase's own
// hosted reset page, so it needs no landing handler here.
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
  /**
   * Permanently delete the signed-in account. Re-authentication (the password) is
   * required by Firebase for this destructive op and doubles as the confirm gate.
   * Auth-only — the local data wipe is the caller's (useSession) job.
   */
  deleteAccount(password: string): Promise<ActionResult>;
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

/**
 * The display name to show for a member. Deliberate decision (ADR-025), shared by
 * signIn / completeMagicLink / authSessionSync so the fallback is ONE choice, not
 * three copies: prefer the typed display name (the accountability anchor); for a
 * nameless legacy/edge account fall back to the email local-part (still ties to a
 * real person) before the generic "Member". A NEW account always has a typed name
 * — createAccount requires it and completeMagicLink rejects nameless new accounts
 * — so this fallback is a safety net, not the normal path.
 */
export function resolveDisplayName(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string {
  return displayName?.trim() || email?.split('@')[0]?.trim() || 'Member';
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
        const displayName = resolveDisplayName(cred.user.displayName, email);
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

    async deleteAccount(password) {
      const user = firebaseAuth.currentUser;
      if (!user || !user.email) return { ok: false, reason: "You're not signed in." };
      try {
        // Re-auth first (Firebase requires a fresh login for deleteUser; the password
        // entry is also the confirmation). Does NOT touch the session store — the
        // caller captured departmentId before this and wipes local data after, so an
        // async onAuthStateChanged→setGuest can't blank the bucket id mid-flight.
        const cred = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, cred);
        await deleteUser(user);
        return { ok: true };
      } catch (err: unknown) {
        const code = (err as { code?: string }).code ?? '';
        if (
          code === 'auth/invalid-credential' ||
          code === 'auth/wrong-password' ||
          code === 'auth/invalid-login-credentials'
        ) {
          return { ok: false, reason: "That password doesn't match." };
        }
        return { ok: false, reason: mapFirebaseError(err) };
      }
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

        // Magic-link is sign-in-only (ADR-025). signInWithEmailLink AUTO-CREATES a
        // real account for a never-registered email — that account never went
        // through createAccount, so it has no display name (the accountability
        // anchor). Detect the just-minted account (created === last-signed-in, and
        // no name) and DELETE it, so a typed-in unknown email can't seat a nameless
        // member. Delete (not just reject) is load-bearing: an orphaned account
        // would have created !== last-sign-in on the next link-open and slip past
        // this check. metadata absent → treat as not-fresh (don't block a sign-in).
        const meta = cred.user.metadata;
        const isFreshlyCreated = !!meta?.creationTime && meta.creationTime === meta.lastSignInTime;
        if (isFreshlyCreated && !cred.user.displayName) {
          try {
            await cred.user.delete?.();
          } catch {
            /* best-effort — the next sign-in will re-hit this guard regardless */
          }
          return { ok: false, reason: 'No account found for that email — create one first.' };
        }

        try {
          window.localStorage.removeItem(MAGIC_EMAIL_KEY);
        } catch {
          /* storage unavailable */
        }
        const displayName = resolveDisplayName(cred.user.displayName, email);
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

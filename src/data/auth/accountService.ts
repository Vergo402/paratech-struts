import { newId } from '@core/id';
import { sessionStore, type SessionStoreApi } from '../store/session';

// data/auth — the account seam: the ONE path a member creates an account / signs
// in / signs out. This slice ships it as a STUB behind the real seam (mirrors
// data/sync/syncService.ts): the method signatures and the mandatory
// display-name guard (ADR-025) are real; the TRANSPORT (Firebase Auth — email +
// password, magic-link) is a no-op a later session fills WITHOUT touching any
// caller. That session also quarantines its Firebase import to this data/auth/
// folder (mirrors data/sync/firebase.ts being the only Firebase importer).
//
// Offline auth window (ADR-025): signing in must never block. Locally there is
// no network, so nothing blocks and there is nothing to queue — the
// queued-intent behavior belongs to the Firebase session, NOT built here.
//
// Dependency is one-directional: accountService → session (data/store never
// imports data/auth), so there is no real init-time import cycle to guard here.
// The lazy session() accessor still mirrors syncService's ops() — for uniformity
// with the sync seam and as the test-injection seam (tests pass their own
// session) — not because a cycle needs breaking.

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
  /** Sign in → member session. STUB — no real credential check until Firebase. */
  signIn(input: SignInInput): Promise<AuthResult>;
  /** Sign out → guest. Never discards local work. */
  signOut(): Promise<void>;
}

export function createAccountService(deps: { session: () => SessionStoreApi }): AccountServiceApi {
  return {
    async createAccount({ displayName }) {
      // The display name is the accountability anchor — the audit log and signed
      // attestations attribute to it, so it can never be empty (ADR-025). Guard
      // FIRST; nothing is written on reject.
      const name = displayName.trim();
      if (!name) return { ok: false, reason: 'display name is required' };

      const member = { accountId: newId(), displayName: name };
      await deps.session().setMember(member);
      return { ok: true, member };
    },

    async signIn({ email }) {
      // STUB: with no cloud account store yet there is nothing to authenticate
      // against. Mint a local member so the future UI can be built + tested
      // against the seam; the real session checks the credential and reads the
      // display name from the Auth profile (this placeholder derives it from the
      // email local-part).
      const displayName = email.split('@')[0]?.trim() || 'Member';
      const member = { accountId: newId(), displayName };
      await deps.session().setMember(member);
      return { ok: true, member };
    },

    async signOut() {
      await deps.session().setGuest();
    },
  };
}

/** The app's singleton account service, bound to the singleton session store. */
export const accountService = createAccountService({ session: () => sessionStore });

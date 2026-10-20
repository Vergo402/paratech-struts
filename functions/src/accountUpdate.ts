// adminUpdateAccount's credential write sequence (password reset / sign-in email
// change), extracted so its ordering and rollbacks are testable.
//
// ZERO imports on purpose: CI installs only the root package (there is no
// functions/node_modules there) and root `npm test` runs this module's test, so it
// must not pull in firebase-admin or firebase-functions. index.ts injects every
// Admin SDK call and both error factories.
//
// Invariant: Auth never holds a new (guessable starter) password unless the member
// row says mustChangePassword: true AND the target's refresh tokens get revoked.
// The order that guarantees it:
//   1. reads (previous flag, current Auth email)       fail → nothing changed
//   2. password ⇒ raise mustChangePassword FIRST        fail → nothing changed
//   3. one Auth update
//        definitive rejection → restore the flag (best-effort), rethrow
//        unknown outcome (network/timeout/5xx after the SDK's own retries) → the
//        update MAY have landed: keep the flag raised and revoke
//   4. email ⇒ mirror the new email on the member row
//        fail → roll Auth back to the old email (best-effort), throw
//   5. finally: revoke refresh tokens whenever a credential change landed (or may
//      have), even when step 4 throws
// The displayName-only call is a profile sync, not a credential change: one Auth
// update, no reads, no mirror, no revoke.

export interface AccountUpdateFields {
  email: string; // '' = unchanged
  newPassword: string; // '' = unchanged
  displayName: string; // '' = unchanged
}

export interface AuthPatch {
  email?: string;
  password?: string;
  displayName?: string;
}

export interface AccountUpdateOps {
  /** The target's current Auth sign-in email (the email-rollback target). */
  readAuthEmail(): Promise<string | undefined>;
  /** The target member row's current mustChangePassword value, raw. */
  readMustChangePassword(): Promise<unknown>;
  /** Granular update on the target member row; null deletes the key. */
  writeMemberFields(fields: Record<string, string | boolean | null>): Promise<void>;
  /** auth.updateUser(targetUid, patch); rejects with the raw Admin SDK error. */
  updateAuth(patch: AuthPatch): Promise<void>;
  revokeRefreshTokens(): Promise<void>;
  /** Raw Auth error → the user-facing error to throw (index.ts: mapAuthError). */
  mapAuthError(err: unknown): Error;
  /** A cloud step failed → the user-facing error (index.ts: HttpsError 'aborted',
   *  whose message departmentService.callableError passes through verbatim). */
  saveFailed(message: string): Error;
  /** Reports a swallowed best-effort failure (index.ts: Cloud Logging). */
  warn(step: string, err: unknown): void;
}

export const NOTHING_CHANGED = "The change couldn't be saved — nothing was changed. Try again.";
export const MAY_BE_UNFINISHED = 'The change may not have finished saving — try it again.';

// Auth rejections that are CERTAIN the update did not apply: the Admin SDK's local
// argument validation plus the server's definitive refusals. Any other failure
// (app/network-*, auth/internal-error, 5xx) leaves the outcome unknown.
const DEFINITIVE_AUTH_REJECTIONS = new Set([
  'auth/email-already-exists',
  'auth/invalid-email',
  'auth/invalid-password',
  'auth/invalid-display-name',
  'auth/invalid-uid',
  'auth/user-not-found',
]);

function errorCode(err: unknown): string {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : '';
}

export async function runAccountUpdate(
  f: AccountUpdateFields,
  ops: AccountUpdateOps,
): Promise<void> {
  const patch: AuthPatch = {
    ...(f.email ? { email: f.email } : {}),
    ...(f.newPassword ? { password: f.newPassword } : {}),
    ...(f.displayName ? { displayName: f.displayName } : {}),
  };

  if (!f.email && !f.newPassword) {
    try {
      await ops.updateAuth(patch);
    } catch (err) {
      throw ops.mapAuthError(err);
    }
    return;
  }

  // A swallowed step: its failure is logged and can never mask the real outcome.
  const bestEffort = async (step: string, fn: () => Promise<void>): Promise<boolean> => {
    try {
      await fn();
      return true;
    } catch (err) {
      ops.warn(step, err);
      return false;
    }
  };

  // 1–2. Reads, then raise the flag. A failure here has changed nothing (a lost
  // ack on the flag write can at worst leave it raised: the safe direction).
  let prevFlag: boolean | null = null;
  let oldEmail: string | undefined;
  try {
    if (f.newPassword) {
      const v = await ops.readMustChangePassword();
      prevFlag = typeof v === 'boolean' ? v : null; // never undefined: RTDB rejects it
    }
    if (f.email) oldEmail = await ops.readAuthEmail();
    if (f.newPassword) await ops.writeMemberFields({ mustChangePassword: true });
  } catch (err) {
    ops.warn('prepare', err);
    throw ops.saveFailed(NOTHING_CHANGED);
  }

  let credentialMayHaveChanged = false;
  try {
    // 3. One Auth update.
    try {
      await ops.updateAuth(patch);
    } catch (err) {
      if (!DEFINITIVE_AUTH_REJECTIONS.has(errorCode(err))) {
        credentialMayHaveChanged = true;
        ops.warn('updateAuth', err);
        throw ops.saveFailed(MAY_BE_UNFINISHED);
      }
      if (f.newPassword && prevFlag !== true) {
        await bestEffort('restoreFlag', () =>
          ops.writeMemberFields({ mustChangePassword: prevFlag }),
        );
      }
      throw ops.mapAuthError(err);
    }
    credentialMayHaveChanged = true;

    // 4. Mirror the new sign-in email.
    if (f.email) {
      try {
        await ops.writeMemberFields({ email: f.email });
      } catch (err) {
        ops.warn('mirrorEmail', err);
        const previous = oldEmail; // no previous email ⇒ nothing to roll back to
        const rolledBack =
          !!previous && (await bestEffort('rollbackEmail', () => ops.updateAuth({ email: previous })));
        // "Nothing was changed" only when Auth is back on the old email AND no
        // password rode along in the same call.
        throw ops.saveFailed(rolledBack && !f.newPassword ? NOTHING_CHANGED : MAY_BE_UNFINISHED);
      }
    }
  } finally {
    if (credentialMayHaveChanged) {
      await bestEffort('revokeRefreshTokens', () => ops.revokeRefreshTokens());
    }
  }
}

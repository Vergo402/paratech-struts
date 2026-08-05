import { HttpsError } from 'firebase-functions/v2/https';
import { getDatabase } from 'firebase-admin/database';

// The shared caller/target verification for every privileged account op (#439).
// The Admin SDK BYPASSES database.rules.json, so everything the rules would have
// enforced must be re-checked here — this module is the server-side mirror of the
// client rules (rules.ts ADMIN_MANAGE / adminGainingAdmin) and MUST NOT regress:
// without the escalation guard, a custom-role manageUsers holder could reset an
// Admin's password to a guessable starter and take over the account — the exact
// escalation the adminGainingAdmin rule closes on the client-write side.
//
// Stable role token — mirrors ADMIN_ROLE_ID in src/core/schema/department.ts
// (duplicated, not imported: sharing app source would drag the client tree into
// the deploy bundle; the token is load-bearing and pinned by tests both sides).
export const ADMIN_ROLE_ID = 'admin';

interface MemberRow {
  role?: string;
  active?: boolean;
  displayName?: string;
}

async function readMember(deptId: string, uid: string): Promise<MemberRow | null> {
  const snap = await getDatabase().ref(`orgs/${deptId}/members/${uid}`).get();
  return snap.exists() ? (snap.val() as MemberRow) : null;
}

/**
 * Verify the caller may perform privileged account ops in this department:
 * authenticated + an ACTIVE member + their role carries manageUsers (the same
 * data-driven member→role→permission chain the rules use). Returns the caller's
 * roleId for the escalation checks. Throws HttpsError on every failure.
 */
export async function requireManageUsers(
  deptId: string,
  callerUid: string | undefined,
): Promise<{ callerRole: string }> {
  if (!callerUid) throw new HttpsError('unauthenticated', 'Sign in first.');
  if (!deptId) throw new HttpsError('invalid-argument', 'deptId is required.');

  const caller = await readMember(deptId, callerUid);
  if (!caller || caller.active === false || !caller.role) {
    throw new HttpsError('permission-denied', "You don't have permission for that change.");
  }
  const permSnap = await getDatabase()
    .ref(`orgs/${deptId}/roles/${caller.role}/permissions/manageUsers`)
    .get();
  if (permSnap.val() !== true) {
    throw new HttpsError('permission-denied', "You don't have permission for that change.");
  }
  return { callerRole: caller.role };
}

/**
 * Escalation guard for GRANTING the admin role (provision): only an Admin may
 * mint an Admin — mirrors the rules' adminGainingAdmin clause.
 */
export function requireAdminForAdminGrant(requestedRole: string, callerRole: string): void {
  if (requestedRole === ADMIN_ROLE_ID && callerRole !== ADMIN_ROLE_ID) {
    throw new HttpsError('permission-denied', 'Only an Admin can add another Admin.');
  }
}

/**
 * Escalation guard for setting an existing member's CREDENTIAL — password or
 * sign-in email (J257-S7, Alex 2026-07-28: restrict to Admins). `manageUsers`
 * alone is no longer enough: a non-Admin holder could reset any non-Admin
 * member's password to a value they know (or repoint their sign-in email to an
 * address they control, then run a reset) and sign in as them. Because ICS
 * positions follow the ACCOUNT (device→account binding, 2026-07-11), assuming a
 * member's login assumes their fireground position — up to Incident Commander —
 * which breaks ADR-017's claim that the back-office RBAC axis and the fireground
 * ICS axis are orthogonal. Account custody is now an Admin-only act.
 *
 * NOT applied to provisionAccount: minting a NEW member with a starter password
 * is the "add personnel" capability manageUsers is FOR, and it takes over no
 * existing identity. The vector is resetting an existing member's credential.
 */
export function requireAdminForCredentialChange(callerRole: string): void {
  if (callerRole !== ADMIN_ROLE_ID) {
    throw new HttpsError(
      'permission-denied',
      "Only an Admin can change a member's password or sign-in email.",
    );
  }
}

/**
 * Escalation guard for TOUCHING an existing member's account (password/email):
 * the target must be a member of the same dept, and touching an Admin's account
 * requires the caller to BE an Admin and not be targeting themselves through
 * the privileged path. Returns the target row (callers reuse displayName).
 */
export async function requireAccountTarget(
  deptId: string,
  callerUid: string,
  callerRole: string,
  targetUid: string,
): Promise<MemberRow> {
  if (!targetUid) throw new HttpsError('invalid-argument', 'targetUid is required.');
  const target = await readMember(deptId, targetUid);
  if (!target) {
    throw new HttpsError('not-found', 'That member is not part of this department.');
  }
  if (target.role === ADMIN_ROLE_ID && (callerRole !== ADMIN_ROLE_ID || targetUid === callerUid)) {
    throw new HttpsError('permission-denied', "Only another Admin can change an Admin's account.");
  }
  return target;
}

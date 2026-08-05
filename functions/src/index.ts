import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  ADMIN_ROLE_ID,
  requireManageUsers,
  requireAdminForAdminGrant,
  requireAdminForCredentialChange,
  requireAccountTarget,
} from './guards';

// FieldShore v4's first server code (#439) — the two privileged account ops the
// client SDK cannot perform: creating ANOTHER user's login, and setting ANOTHER
// user's password/email. Everything else about personnel stays client-side
// (profile-field writes ride the ADMIN_MANAGE rules branch; audit entries ride
// the client appendAudit path so the append-only trail has ONE writer shape).
// The Admin SDK bypasses database.rules.json — guards.ts re-checks everything
// the rules would have enforced. Deploys with `firebase deploy --only functions`
// (Blaze plan required; ADR-018's after-action email function will share this
// codebase later).

initializeApp();

interface ProvisionRequest {
  deptId: string;
  email: string;
  displayName: string;
  starterPassword: string; // client-derived `${lastname}123!` — shown to the admin
  role: string;
  rank?: string;
  apparatusId?: string;
  badge?: string;
  phone?: string;
  certifications?: string;
}

// Length caps mirror the Member schema (src/core/schema/department.ts) — the
// Admin SDK bypasses the generated .validate, so the caps are re-stated here.
const PROFILE_CAPS: Record<string, number> = {
  rank: 80,
  apparatusId: 80,
  badge: 40,
  phone: 40,
  certifications: 500,
};

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function optionalProfileFields(d: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, cap] of Object.entries(PROFILE_CAPS)) {
    const v = str(d[key]);
    if (!v) continue; // absent/empty = omit the key (present ⇒ non-empty, like the schema)
    if (v.length > cap) throw new HttpsError('invalid-argument', `${key} is too long.`);
    out[key] = v;
  }
  return out;
}

function mapAuthError(err: unknown): HttpsError {
  const code = (err as { code?: string }).code ?? '';
  if (code === 'auth/email-already-exists') {
    return new HttpsError('already-exists', 'An account with that email already exists.');
  }
  if (code === 'auth/invalid-email') {
    return new HttpsError('invalid-argument', "That doesn't look like a valid email address.");
  }
  if (code === 'auth/invalid-password') {
    return new HttpsError('invalid-argument', 'Password must be at least 6 characters.');
  }
  return new HttpsError('internal', 'Something went wrong. Try again.');
}

/**
 * Create a firefighter's login on the spot (User Manager "Add member" + CSV
 * import). Creates the Auth user, then one multi-path update writing the member
 * row (mustChangePassword: true) + the /userDepts reverse index — so the member
 * lands in the department on their very first sign-in (recoverDeptFromCloud
 * reads exactly those two nodes). RTDB failure rolls the Auth user back
 * (best-effort; an orphaned auth user holds the email but can read nothing).
 */
export const provisionAccount = onCall(async (request) => {
  const d = (request.data ?? {}) as Partial<ProvisionRequest>;
  const deptId = str(d.deptId);
  const email = str(d.email);
  const displayName = str(d.displayName);
  const starterPassword = typeof d.starterPassword === 'string' ? d.starterPassword : '';
  const role = str(d.role);

  const { callerRole } = await requireManageUsers(deptId, request.auth?.uid);

  if (!email) throw new HttpsError('invalid-argument', 'Email is required.');
  if (email.length > 120) throw new HttpsError('invalid-argument', 'Email is too long.');
  if (!displayName || displayName.length > 80) {
    throw new HttpsError('invalid-argument', 'A name is required (80 characters max).');
  }
  if (starterPassword.length < 6) {
    throw new HttpsError('invalid-argument', 'Password must be at least 6 characters.');
  }
  if (!role) throw new HttpsError('invalid-argument', 'A role is required.');
  requireAdminForAdminGrant(role, callerRole);
  const profile = optionalProfileFields(d as Record<string, unknown>);

  const db = getDatabase();
  const roleSnap = await db.ref(`orgs/${deptId}/roles/${role}`).get();
  if (!roleSnap.exists()) {
    throw new HttpsError('failed-precondition', 'That role no longer exists — pick another.');
  }
  const deptName = str((await db.ref(`orgs/${deptId}/name`).get()).val());

  let uid: string;
  try {
    const user = await getAuth().createUser({
      email,
      password: starterPassword,
      // The Auth profile displayName is load-bearing: resolveDisplayName reads it
      // on the member's first sign-in, before any member row is fetched.
      displayName,
    });
    uid = user.uid;
  } catch (err) {
    throw mapAuthError(err);
  }

  try {
    await db.ref().update({
      [`orgs/${deptId}/members/${uid}`]: {
        role,
        displayName,
        joinedAt: Date.now(),
        email,
        mustChangePassword: true,
        ...profile,
      },
      [`userDepts/${uid}`]: { deptId, deptName, inviteCode: '' },
    });
  } catch {
    await getAuth().deleteUser(uid).catch(() => {});
    throw new HttpsError('internal', "The account couldn't be finished — try again.");
  }

  return { uid };
});

interface AdminUpdateRequest {
  deptId: string;
  targetUid: string;
  email?: string;
  newPassword?: string; // reset-to-starter: sets mustChangePassword back to true
  displayName?: string; // Auth-profile sync only — the member-row copy writes client-side
}

/**
 * Field-driven privileged update of an EXISTING member's account: email change,
 * reset-password-to-starter, Auth-profile displayName sync. Password/email
 * changes also revoke the target's refresh tokens, so a lost/stale device drops
 * off the account within the ID-token hour.
 */
export const adminUpdateAccount = onCall(async (request) => {
  const d = (request.data ?? {}) as Partial<AdminUpdateRequest>;
  const deptId = str(d.deptId);
  const targetUid = str(d.targetUid);
  const email = str(d.email);
  const newPassword = typeof d.newPassword === 'string' ? d.newPassword : '';
  const displayName = str(d.displayName);

  const callerUid = request.auth?.uid;
  const { callerRole } = await requireManageUsers(deptId, callerUid);
  await requireAccountTarget(deptId, callerUid as string, callerRole, targetUid);

  if (!email && !newPassword && !displayName) {
    throw new HttpsError('invalid-argument', 'Nothing to change.');
  }
  // J257-S7 — credential custody (password OR sign-in email) is Admin-only.
  // displayName is a profile sync, not a credential, so it stays on manageUsers
  // (departmentService fires it best-effort behind every profile save).
  if (email || newPassword) requireAdminForCredentialChange(callerRole);
  if (email && email.length > 120) throw new HttpsError('invalid-argument', 'Email is too long.');
  if (newPassword && newPassword.length < 6) {
    throw new HttpsError('invalid-argument', 'Password must be at least 6 characters.');
  }
  if (displayName && displayName.length > 80) {
    throw new HttpsError('invalid-argument', 'A name is 80 characters max.');
  }

  const auth = getAuth();
  try {
    await auth.updateUser(targetUid, {
      ...(email ? { email } : {}),
      ...(newPassword ? { password: newPassword } : {}),
      ...(displayName ? { displayName } : {}),
    });
  } catch (err) {
    throw mapAuthError(err);
  }

  const db = getDatabase();
  const mirror: Record<string, unknown> = {};
  if (email) mirror[`orgs/${deptId}/members/${targetUid}/email`] = email;
  if (newPassword) mirror[`orgs/${deptId}/members/${targetUid}/mustChangePassword`] = true;
  if (Object.keys(mirror).length) await db.ref().update(mirror);

  if (email || newPassword) await auth.revokeRefreshTokens(targetUid).catch(() => {});

  return { ok: true };
});

interface DeleteOwnAccountRequest {
  /** Fallback department id — used ONLY when the /userDepts reverse index is
   *  missing or stale, and only after the server verifies a member row there. */
  deptId?: string;
}

interface MemberRowLite {
  role?: string;
  active?: boolean;
}

/**
 * Delete the CALLER'S OWN account (J257-S1). The client SDK cannot do this
 * completely: `remove()` on your own member row sets newData to null, which the
 * SELF_EDIT_RANK rule rejects (every field-equality clause fails) and
 * ADMIN_MANAGE denies for a self-delete — so the pre-fix flow deleted the Auth
 * user and the /userDepts entry but left `orgs/{dept}/members/{uid}` behind as a
 * live row carrying email/phone/badge/certifications. Two harms: the PII the
 * user was told was deleted stays readable by the whole department, and a
 * departing sole Admin strands the department forever (no remaining member can
 * demote or deactivate the ghost, and nobody can be promoted to Admin).
 *
 * Order is deliberate: refuse the sole-Admin case FIRST, then clear the cloud
 * rows, then delete the Auth user last — a failure at any step leaves the
 * account still usable rather than half-deleted.
 */
export const deleteOwnAccount = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');

  const d = (request.data ?? {}) as Partial<DeleteOwnAccountRequest>;
  const db = getDatabase();

  const indexedDeptId = str((await db.ref(`userDepts/${uid}/deptId`).get()).val());
  const claimedDeptId = str(d.deptId);

  // Resolve the department this account actually belongs to. The reverse index is
  // primary; the client-supplied id is a fallback for a stale/missing index and is
  // honoured only when a member row for THIS uid genuinely exists there — so a
  // forged deptId buys nothing (it can only delete the caller's own row).
  let deptId = '';
  let ownRow: MemberRowLite | null = null;
  for (const candidate of [indexedDeptId, claimedDeptId]) {
    if (!candidate || candidate === deptId) continue;
    const snap = await db.ref(`orgs/${candidate}/members/${uid}`).get();
    if (snap.exists()) {
      deptId = candidate;
      ownRow = snap.val() as MemberRowLite;
      break;
    }
  }

  if (deptId && ownRow) {
    // ACTIVE-admin convention: `active` is OPTIONAL and ABSENT means active (the
    // rules read `!= false`). Counting `active === true` would undercount and let
    // the last Admin delete — the exact strand this guard exists to prevent.
    const isActiveAdmin = (m: MemberRowLite | null): boolean =>
      !!m && m.role === ADMIN_ROLE_ID && m.active !== false;
    if (isActiveAdmin(ownRow)) {
      const all = (await db.ref(`orgs/${deptId}/members`).get()).val() as Record<
        string,
        MemberRowLite
      > | null;
      const activeAdmins = Object.entries(all ?? {}).filter(([, m]) => isActiveAdmin(m));
      if (activeAdmins.length <= 1) {
        throw new HttpsError(
          'failed-precondition',
          "You're the only Admin in this department. Promote another member to Admin first, then delete your account.",
        );
      }
    }
  }

  // One multi-path update: the member row and the reverse index go together, so
  // a partial cloud state is impossible. Guests / members with no department
  // land here with only the (harmless) reverse-index clear.
  const clears: Record<string, null> = { [`userDepts/${uid}`]: null };
  if (deptId) clears[`orgs/${deptId}/members/${uid}`] = null;
  try {
    await db.ref().update(clears);
  } catch {
    throw new HttpsError('internal', "Your account couldn't be removed from the department — try again.");
  }

  // Auth user LAST: if this fails the caller can retry (the cloud rows are
  // already gone and re-clearing them is a no-op).
  try {
    await getAuth().deleteUser(uid);
  } catch {
    throw new HttpsError('internal', "Your login couldn't be deleted — try again.");
  }

  return { ok: true };
});

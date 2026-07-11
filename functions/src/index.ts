import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  requireManageUsers,
  requireAdminForAdminGrant,
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

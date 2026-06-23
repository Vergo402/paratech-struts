import {
  Department,
  Member,
  Role,
  InviteCode,
  ADMIN_ROLE_ID,
  DEFAULT_ROLE_ID,
  ADMIN_PERMISSIONS,
  DEFAULT_PERMISSIONS,
  type Permissions,
} from '@core/schema';
import { newId } from '@core/id';
import type { AuditEntry } from '@core/audit';
import { rtdb, ref, get, set, update, remove } from '../sync/firebase';
import { logSyncEvent } from '../sync/diagnostics';
import { syncStatusStore } from '../sync/syncStatus';
import { sessionStore, type SessionStoreApi } from '../store/session';
import { globalDb, type FieldShoreDB } from '../store/db';

// data/dept — the department seam (workflow 07): create a department → become
// its first Admin → get an invite code. Department / membership / role are PLAIN
// RTDB state under /orgs (ADR-009 / ADR-017), NOT events (the event log is
// operations-only). Local-first (LESSONS §4): the session's dept projection is
// written FIRST so the dept persists offline / before the rules are deployed; the
// cloud set is best-effort and logged on failure (a created dept stands locally
// regardless). The invite code is generated + shown now; its CLOUD registration
// and the join that consumes it land with workflow #232. A pending-push retry
// rides the broader sync hardening (Engine A), not this slice.
//
// Invariant: RTDB is reached only through the data/sync seam (rtdb / set), never
// firebase/database directly.

// Unambiguous glyphs only — no 0/1/I/O. 32 chars divides 256 evenly, so the
// `% 32` below is bias-free.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function mintInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}

// The minted format: 4+4 unambiguous glyphs with a hyphen. The join field accepts
// the same shape, case-insensitively (gloves + radio): normalize → uppercase, and
// re-insert the hyphen if the user typed 8 bare characters.
const CODE_RE = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

/** Tidy a typed/pasted/scanned code into the canonical FORM-AT (no validity check). */
function normalizeInviteCode(raw: string): string {
  const bare = raw.trim().toUpperCase().replace(/[\s-]/g, '');
  return bare.length === 8 ? `${bare.slice(0, 4)}-${bare.slice(4)}` : raw.trim().toUpperCase();
}

export interface CreatedDepartment {
  id: string;
  name: string;
  role: string;
  inviteCode: string;
}

export type CreateDepartmentResult =
  | { ok: true; department: CreatedDepartment }
  | { ok: false; reason: string };

export interface JoinedDepartment {
  id: string;
  name: string;
  role: string;
}

export type JoinDepartmentResult =
  | { ok: true; department: JoinedDepartment }
  | { ok: false; reason: string; queued?: true }; // queued: held offline, will auto-complete on reconnect

export interface DepartmentServiceApi {
  /** Create a department, claim founding Admin, mint an invite code. Local-first. */
  createDepartment(name: string): Promise<CreateDepartmentResult>;
  /** Join an existing department by invite code → Default role (workflow #232).
   *  Offline: holds the intent and returns `queued` (auto-completes on reconnect). */
  joinByCode(rawCode: string): Promise<JoinDepartmentResult>;
  /** Retry a queued offline join (called on reconnect). Returns true if it completed,
   *  so the caller reloads onto the new bucket. */
  retryPendingJoin(): Promise<boolean>;
  /** Restore a queued join into the sync-status store on boot, so the banner reflects it
   *  across a reload that happened while still offline. */
  restorePendingJoin(): Promise<void>;

  // ---- User Manager (#381) — admin governance, manageUsers-gated by the rules ----
  /** Cold-read the department's members map (admin screen only — not a live store). */
  readMembers(): Promise<Record<string, Member> | null>;
  /** Cold-read the append-only governance audit trail, chronological (the Audit Log
   *  Administrative view, #211). manageUsers-gated server-side; null on read failure. */
  readAudit(): Promise<AuditEntry[] | null>;
  /** Set a member's role (also the promote-to-Admin path: roleId = ADMIN_ROLE_ID). */
  assignRole(uid: string, roleId: string): Promise<AdminMutationResult>;
  /** Soft-revoke: mark the member inactive (row kept for the audit trail). */
  revokeMember(uid: string): Promise<AdminMutationResult>;
  /** Restore a revoked member. */
  reactivateMember(uid: string): Promise<AdminMutationResult>;
  /** Create a custom role (name + the 8 permission toggles). */
  createRole(name: string, permissions: Permissions): Promise<AdminMutationResult>;
  /** Edit a role's name and/or permissions (Default editable; Admin is fixed). */
  editRole(roleId: string, patch: { name?: string; permissions?: Permissions }): Promise<AdminMutationResult>;
  /** Delete a custom role, reassigning any holders to Default first (built-ins can't be deleted). */
  deleteRole(roleId: string): Promise<AdminMutationResult>;
}

export interface AdminMutationResult {
  ok: boolean;
  reason?: string;
}

// The offline join intent lives in global meta (survives the page reload), alongside the
// session row. code-only when the resolve itself failed offline (deptName unknown then).
const PENDING_JOIN_KEY = 'fieldshore_pending_join';
interface PendingJoinIntent {
  code: string;
  deptName: string | null;
}

export function createDepartmentService(deps: {
  session: () => SessionStoreApi;
  /** Global meta DB for the pending-join intent (default: the global singleton). */
  db?: FieldShoreDB;
}): DepartmentServiceApi {
  const db = deps.db ?? globalDb;
  let retrying = false; // one retry at a time — a rapid double 'online' must not race two joins

  async function readIntent(): Promise<PendingJoinIntent | null> {
    const row = await db.meta.get(PENDING_JOIN_KEY);
    if (!row) return null;
    try {
      const p = JSON.parse(row.value);
      if (p && typeof p.code === 'string') {
        return { code: p.code, deptName: typeof p.deptName === 'string' ? p.deptName : null };
      }
    } catch {
      /* corrupt row → no intent */
    }
    return null;
  }
  async function queueJoin(code: string, deptName: string | null): Promise<void> {
    const intent: PendingJoinIntent = { code, deptName };
    await db.meta.put({ key: PENDING_JOIN_KEY, value: JSON.stringify(intent) });
    syncStatusStore.setPendingJoin(intent);
  }
  async function clearIntent(): Promise<void> {
    await db.meta.delete(PENDING_JOIN_KEY);
    syncStatusStore.setPendingJoin(null);
  }

  async function createDepartment(rawName: string): Promise<CreateDepartmentResult> {
      const name = rawName.trim();
      if (!name) return { ok: false, reason: 'Department name is required.' };
      if (name.length > 100) return { ok: false, reason: 'Department name is too long (max 100).' };

      const session = deps.session();
      const identity = session.store.getState().identity;
      if (identity.kind !== 'member') {
        return { ok: false, reason: 'Sign in before creating a department.' };
      }
      const uid = identity.accountId;
      const displayName = identity.displayName;

      const id = newId();
      const inviteCode = mintInviteCode();
      const createdAt = Date.now();

      // Client validates against the SAME schemas that generate the rules (L-11)
      // — a shape bug is caught here, not as a silent server rejection later.
      try {
        Department.parse({ id, name, createdBy: uid, createdAt });
        Member.parse({ role: ADMIN_ROLE_ID, displayName, joinedAt: createdAt });
        Role.parse({ id: ADMIN_ROLE_ID, name: 'Admin', builtIn: true, permissions: ADMIN_PERMISSIONS });
        Role.parse({ id: DEFAULT_ROLE_ID, name: 'Default', builtIn: true, permissions: DEFAULT_PERMISSIONS });
      } catch {
        return { ok: false, reason: 'Could not create the department. Try again.' };
      }

      // Local-first — the dept projection persists immediately (offline / before
      // the rules deploy). The cloud push follows, best-effort. The invite code is
      // persisted with it so Settings can show it again after the success sheet closes.
      await session.setDepartment({ id, name, role: ADMIN_ROLE_ID, inviteCode });

      // One atomic set at the dept node: the create-only .write grant cascades to
      // the whole subtree, so members/roles need no per-child .write (rules.ts).
      const payload = {
        name,
        createdBy: uid,
        createdAt,
        members: { [uid]: { role: ADMIN_ROLE_ID, displayName, joinedAt: createdAt } },
        roles: {
          [ADMIN_ROLE_ID]: { name: 'Admin', builtIn: true, permissions: ADMIN_PERMISSIONS },
          [DEFAULT_ROLE_ID]: { name: 'Default', builtIn: true, permissions: DEFAULT_PERMISSIONS },
        },
      };
      // Two best-effort cloud writes with SEPARATE ledger labels, so a partial
      // failure is diagnosable. If the dept write fails there is nothing to publish
      // a code against (the code-write rule checks the dept's createdBy at root), so
      // we stop. The local dept stands regardless (local-first); a pending-push
      // retry rides the broader sync hardening (Engine A), not this slice.
      try {
        await set(ref(rtdb, `orgs/${id}`), payload);
      } catch (err) {
        await logSyncEvent('dept_create_failed', {
          deptId: id,
          error: err instanceof Error ? err.message : String(err),
        });
        return { ok: true, department: { id, name, role: ADMIN_ROLE_ID, inviteCode } };
      }

      // Publish the invite-code resolver so a teammate can join by it (workflow
      // #232). MUST follow the dept write: the rule checks createdBy at root, which
      // only exists once the dept node is committed. The dept name rides along so a
      // not-yet-member can resolve it from the code alone (the dept node is
      // member-read-gated). A failure here is logged distinctly — the code is
      // unpublished (no one can join yet) but the dept is real locally.
      try {
        await set(ref(rtdb, `orgs/inviteCodes/${inviteCode}`), {
          deptId: id,
          deptName: name,
          createdBy: uid,
          createdAt,
          active: true,
        });
      } catch (err) {
        await logSyncEvent('invite_code_publish_failed', {
          deptId: id,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      return { ok: true, department: { id, name, role: ADMIN_ROLE_ID, inviteCode } };
  }

  async function joinByCode(rawCode: string): Promise<JoinDepartmentResult> {
      const code = normalizeInviteCode(rawCode);
      if (!CODE_RE.test(code)) {
        return { ok: false, reason: "That code isn't valid. Check it and try again." };
      }

      const session = deps.session();
      const identity = session.store.getState().identity;
      if (identity.kind !== 'member') {
        // Joining writes a member row keyed by the Firebase uid — that needs a real
        // signed-in account (the rules require auth.uid). Guests sign in first.
        return { ok: false, reason: 'Sign in before joining a department.' };
      }
      const uid = identity.accountId;
      const displayName = identity.displayName;

      // Resolve the code → dept. The resolver carries the name (the dept node is
      // member-read-gated; the joiner isn't a member yet). A failed read is treated
      // as offline (the read rule allows any signed-in user, so it's never a denial).
      let resolved: unknown;
      try {
        const snap = await get(ref(rtdb, `orgs/inviteCodes/${code}`));
        if (!snap.exists()) {
          return { ok: false, reason: "That code isn't valid. Check it and try again." };
        }
        resolved = snap.val();
      } catch {
        // Offline at the resolve step — deptName unknown (code-only). Hold the intent;
        // connectivity.retryPendingJoin completes it on reconnect.
        await queueJoin(code, null);
        return {
          ok: false,
          queued: true,
          reason: "You're offline. You'll join automatically when you reconnect.",
        };
      }

      const parsed = InviteCode.safeParse(resolved);
      if (!parsed.success) {
        return { ok: false, reason: "That code isn't valid. Check it and try again." };
      }
      if (!parsed.data.active) {
        return { ok: false, reason: 'That code has expired. Ask your Admin for a new one.' };
      }
      const { deptId, deptName } = parsed.data;

      // Already a member of THIS dept (re-scan / re-open the join screen)? Short
      // circuit. The member self-write rule denies a re-write (!data.exists()),
      // which would otherwise surface as a misleading "you're offline". Return the
      // CURRENT role — a re-join must not appear to downgrade an Admin to Default.
      const current = session.store.getState();
      if (current.departmentId === deptId) {
        await clearIntent(); // already in → no longer queued
        return {
          ok: true,
          department: { id: deptId, name: deptName, role: current.role ?? DEFAULT_ROLE_ID },
        };
      }

      const joinedAt = Date.now();
      // Validate the member shape against the SAME schema the rules derive from (L-11)
      // before the write — a shape bug fails here, not as a silent server rejection.
      try {
        Member.parse({ role: DEFAULT_ROLE_ID, displayName, joinedAt, viaCode: code });
      } catch {
        return { ok: false, reason: 'Could not join the department. Try again.' };
      }

      try {
        await set(ref(rtdb, `orgs/${deptId}/members/${uid}`), {
          role: DEFAULT_ROLE_ID,
          displayName,
          joinedAt,
          viaCode: code,
        });
      } catch (err) {
        await logSyncEvent('dept_join_failed', {
          deptId,
          error: err instanceof Error ? err.message : String(err),
        });
        // Offline at the member-write step — deptName IS known now. Hold + auto-complete.
        await queueJoin(code, deptName);
        return {
          ok: false,
          queued: true,
          reason: "You're offline. You'll join automatically when you reconnect.",
        };
      }

      // Local-first projection — the member now carries the joined dept + Default role.
      await session.setDepartment({ id: deptId, name: deptName, role: DEFAULT_ROLE_ID, inviteCode: code });
      await clearIntent(); // completed → drop any queued intent
      return { ok: true, department: { id: deptId, name: deptName, role: DEFAULT_ROLE_ID } };
  }

  async function retryPendingJoin(): Promise<boolean> {
    if (retrying) return false; // a rapid double 'online' must not run two joins concurrently
    retrying = true;
    try {
      const intent = await readIntent();
      if (!intent) return false;
      const result = await joinByCode(intent.code);
      if (result.ok) return true; // joinByCode cleared the intent → caller reloads
      // Still offline → joinByCode re-queued it (leave it). A DEFINITIVE failure (invalid /
      // expired / malformed code) is not `queued` → drop the stale intent so we stop retrying.
      if (!result.queued) await clearIntent();
      return false;
    } finally {
      retrying = false;
    }
  }

  async function restorePendingJoin(): Promise<void> {
    const intent = await readIntent();
    if (intent) syncStatusStore.setPendingJoin(intent);
  }

  // ---- User Manager (#381) ------------------------------------------------------
  // All governance writes target the CURRENT department and are gated server-side by
  // the ADMIN_MANAGE / roles / audit rules (manageUsers + the ≥1-Admin anti-lockout).
  // Online-first via the Firebase seam (RTDB's own offline cache queues a write made
  // offline + echoes it to the rolesListener instantly — no custom queue here). A rule
  // rejection (e.g. a tampered last-admin demote the UI already disables) surfaces as a
  // PERMISSION_DENIED, mapped to a plain reason. Every action appends an audit entry.
  interface AdminCtx {
    deptId: string;
    by: string; // the acting device's uid (the audit `by`; NOT bound to auth.uid by the rule)
    actor: string; // the acting admin's display name (denormalized for a readable trail)
  }
  function adminCtx(): AdminCtx | null {
    const s = deps.session().store.getState();
    if (s.identity.kind !== 'member' || !s.departmentId) return null;
    return { deptId: s.departmentId, by: s.deviceUid, actor: s.identity.displayName };
  }

  function writeError(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err);
    if (/permission_denied/i.test(msg)) return "You don't have permission for that change.";
    return 'That change could not be saved. Try again.';
  }

  // Append one write-once governance entry (the P3 /orgs/{dept}/audit append-only node).
  // Fire-and-forget: a failed audit write must never block (or roll back) the action it records.
  function appendAudit(c: AdminCtx, type: string, details: Record<string, unknown>): Promise<unknown> {
    const id = newId();
    return set(ref(rtdb, `orgs/${c.deptId}/audit/${id}`), {
      id,
      type,
      at: Date.now(),
      by: c.by,
      actor: c.actor,
      ...details,
    }).catch((err) =>
      logSyncEvent('audit_write_failed', {
        deptId: c.deptId,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }

  async function readMembers(): Promise<Record<string, Member> | null> {
    const c = adminCtx();
    if (!c) return null;
    try {
      const snap = await get(ref(rtdb, `orgs/${c.deptId}/members`));
      const val = snap.val();
      if (!val || typeof val !== 'object') return {};
      const out: Record<string, Member> = {};
      for (const [uid, body] of Object.entries(val as Record<string, unknown>)) {
        const parsed = Member.safeParse(body);
        if (parsed.success) out[uid] = parsed.data;
      }
      return out;
    } catch {
      return null; // offline / read error → the hook shows a retry state
    }
  }

  // Read the governance audit trail (the P3 /orgs/{dept}/audit append-only node). The
  // rules gate the read on manageUsers (#381); a denial / offline read returns null →
  // the hook shows a retry state, never a crash. Coarse shape-check, like readMembers.
  async function readAudit(): Promise<AuditEntry[] | null> {
    const c = adminCtx();
    if (!c) return null;
    try {
      const snap = await get(ref(rtdb, `orgs/${c.deptId}/audit`));
      const val = snap.val();
      if (!val || typeof val !== 'object') return [];
      const out: AuditEntry[] = [];
      for (const body of Object.values(val as Record<string, unknown>)) {
        const e = body as AuditEntry;
        if (e && typeof e === 'object' && typeof e.id === 'string' && typeof e.type === 'string' && typeof e.at === 'number' && typeof e.by === 'string') {
          out.push(e);
        }
      }
      out.sort((a, b) => a.at - b.at); // chronological; the UI reverses for newest-first
      return out;
    } catch {
      return null;
    }
  }

  async function assignRole(uid: string, roleId: string): Promise<AdminMutationResult> {
    const c = adminCtx();
    if (!c) return { ok: false, reason: 'Not connected to a department.' };
    try {
      await update(ref(rtdb, `orgs/${c.deptId}/members/${uid}`), { role: roleId });
    } catch (err) {
      return { ok: false, reason: writeError(err) };
    }
    void appendAudit(c, 'roleAssigned', { targetUid: uid, roleId });
    return { ok: true };
  }

  async function setActive(uid: string, active: boolean, type: string): Promise<AdminMutationResult> {
    const c = adminCtx();
    if (!c) return { ok: false, reason: 'Not connected to a department.' };
    try {
      await update(ref(rtdb, `orgs/${c.deptId}/members/${uid}`), { active });
    } catch (err) {
      return { ok: false, reason: writeError(err) };
    }
    void appendAudit(c, type, { targetUid: uid });
    return { ok: true };
  }
  const revokeMember = (uid: string) => setActive(uid, false, 'memberRevoked');
  const reactivateMember = (uid: string) => setActive(uid, true, 'memberReactivated');

  async function createRole(name: string, permissions: Permissions): Promise<AdminMutationResult> {
    const c = adminCtx();
    if (!c) return { ok: false, reason: 'Not connected to a department.' };
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, reason: 'A role name is required.' };
    const roleId = newId();
    const role = { name: trimmed, permissions }; // custom → no builtIn flag
    try {
      Role.parse({ id: roleId, ...role }); // L-11: validate the shape the rules derive from
    } catch {
      return { ok: false, reason: 'Could not create the role. Check the name and try again.' };
    }
    try {
      await set(ref(rtdb, `orgs/${c.deptId}/roles/${roleId}`), role);
    } catch (err) {
      return { ok: false, reason: writeError(err) };
    }
    void appendAudit(c, 'roleCreated', { roleId, roleName: trimmed });
    return { ok: true };
  }

  async function editRole(
    roleId: string,
    patch: { name?: string; permissions?: Permissions },
  ): Promise<AdminMutationResult> {
    const c = adminCtx();
    if (!c) return { ok: false, reason: 'Not connected to a department.' };
    if (roleId === ADMIN_ROLE_ID) return { ok: false, reason: 'The Admin role is fixed and cannot be edited.' };
    const changes: Record<string, unknown> = {};
    if (patch.name !== undefined) {
      const trimmed = patch.name.trim();
      if (!trimmed) return { ok: false, reason: 'A role name is required.' };
      changes.name = trimmed;
    }
    if (patch.permissions !== undefined) changes.permissions = patch.permissions;
    try {
      await update(ref(rtdb, `orgs/${c.deptId}/roles/${roleId}`), changes);
    } catch (err) {
      return { ok: false, reason: writeError(err) };
    }
    void appendAudit(c, 'roleEdited', { roleId, ...(changes.name ? { roleName: changes.name } : {}) });
    return { ok: true };
  }

  async function deleteRole(roleId: string): Promise<AdminMutationResult> {
    const c = adminCtx();
    if (!c) return { ok: false, reason: 'Not connected to a department.' };
    if (roleId === ADMIN_ROLE_ID || roleId === DEFAULT_ROLE_ID) {
      return { ok: false, reason: 'Built-in roles cannot be deleted.' };
    }
    // Reassign any holders to Default FIRST so no member is left pointing at a missing role.
    const members = await readMembers();
    const holders = members
      ? Object.entries(members).filter(([, m]) => m.role === roleId).map(([uid]) => uid)
      : [];
    for (const uid of holders) {
      try {
        await update(ref(rtdb, `orgs/${c.deptId}/members/${uid}`), { role: DEFAULT_ROLE_ID });
      } catch (err) {
        return { ok: false, reason: writeError(err) };
      }
    }
    try {
      await remove(ref(rtdb, `orgs/${c.deptId}/roles/${roleId}`));
    } catch (err) {
      return { ok: false, reason: writeError(err) };
    }
    void appendAudit(c, 'roleDeleted', { roleId, reassigned: holders.length });
    return { ok: true };
  }

  return {
    createDepartment,
    joinByCode,
    retryPendingJoin,
    restorePendingJoin,
    readMembers,
    readAudit,
    assignRole,
    revokeMember,
    reactivateMember,
    createRole,
    editRole,
    deleteRole,
  };
}

/** The app's singleton department service, bound to the singleton session store. */
export const departmentService = createDepartmentService({ session: () => sessionStore });

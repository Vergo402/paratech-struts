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
import { callFunction } from '../functions/firebase';
import { logSyncEvent } from '../sync/diagnostics';
import { syncStatusStore } from '../sync/syncStatus';
import { sessionStore, type SessionStoreApi } from '../store/session';
import { globalDb, type FieldShoreDB } from '../store/db';

// data/dept — the department seam (workflow 07): create a department → become
// its first Admin → get an invite code. Department / membership / role are PLAIN
// RTDB state under /orgs (ADR-009 / ADR-017), NOT events (the event log is
// operations-only). Local-first (LESSONS §4): the session's dept projection is
// written FIRST so the dept persists offline; the cloud push goes through a
// durable OUTBOX (#419) — the exact payloads are persisted to global meta BEFORE
// the first set() and retried on every authenticated boot + reconnect until they
// land, so a dept created through a connectivity hiccup can never end up
// permanently local-only with a dead invite code.
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
  /** Retry the dept-create outbox (#419) — re-push a created dept's orgs node + invite
   *  code until they land. Called on authenticated boot + reconnect. True = fully landed. */
  retryPendingDeptPush(): Promise<boolean>;
  /** Restore a pending dept push into the sync-status store on boot (banner across reload). */
  restorePendingDeptPush(): Promise<void>;

  // ---- User Manager (#381) — admin governance, manageUsers-gated by the rules ----
  /** Cold-read the department's members map (admin screen only — not a live store). */
  readMembers(): Promise<Record<string, Member> | null>;
  /** Cold-read the member-readable device→account binding map ({ deviceUid → accountId }) —
   *  resolves a legacy device-ref position to its owner's account across devices. */
  readDeviceOwners(): Promise<Record<string, string>>;
  /** Cold-read the member-readable roster ({ accountId, displayName }) — feeds the
   *  command-transfer + position pickers so a role can be handed to a specific person. */
  readRoster(): Promise<{ id: string; displayName: string }[]>;
  /** Cold-read the append-only governance audit trail, chronological (the Audit Log
   *  Administrative view, #211). manageUsers-gated server-side; null on read failure. */
  readAudit(): Promise<AuditEntry[] | null>;
  /** Set a member's role (also the promote-to-Admin path: roleId = ADMIN_ROLE_ID). */
  assignRole(uid: string, roleId: string): Promise<AdminMutationResult>;
  /** Admin sets another member's rank/title (manageUsers-gated; audited). */
  setMemberRank(uid: string, rank: string): Promise<AdminMutationResult>;
  /** The signed-in member sets their OWN rank/title (SELF_EDIT_RANK rule branch). */
  setRank(rank: string): Promise<AdminMutationResult>;
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
  /** Kill the current invite code (#423 — a leaked code must be revocable on scene). */
  revokeInviteCode(): Promise<AdminMutationResult>;
  /** Rotate the invite code: publish a new one, kill the old, update the session. */
  regenerateInviteCode(): Promise<AdminMutationResult & { code?: string }>;

  // ---- Admin-provisioned personnel (#439) — the server-callable-backed ops ----
  /** Create a member's login on the spot (provisionAccount callable): Auth user +
   *  member row (mustChangePassword) + userDepts reverse index. Online-only. */
  provisionMember(input: ProvisionMemberInput): Promise<AdminMutationResult & { uid?: string }>;
  /** Edit a member's profile fields (client write, ADMIN_MANAGE). '' clears a field.
   *  A displayName change also syncs the Auth profile (best-effort, via the callable). */
  setMemberProfile(uid: string, patch: MemberProfilePatch): Promise<AdminMutationResult>;
  /** Change a member's sign-in email (adminUpdateAccount callable; revokes their sessions). */
  changeMemberEmail(uid: string, email: string): Promise<AdminMutationResult>;
  /** Reset a member's password to the starter (adminUpdateAccount callable; re-raises
   *  mustChangePassword and revokes their sessions). The 0300 forgot-my-password fix. */
  resetMemberPassword(uid: string, starterPassword: string): Promise<AdminMutationResult>;
  /** The signed-in member clears their OWN starter flag after the forced change
   *  (SELF_EDIT rule branch allows exactly the true→false transition). */
  clearMustChangePassword(): Promise<AdminMutationResult>;
}

export interface ProvisionMemberInput {
  email: string;
  displayName: string;
  starterPassword: string;
  role: string;
  rank?: string;
  apparatusId?: string;
  badge?: string;
  phone?: string;
  certifications?: string;
}

/** Editable member-row profile fields. '' = clear (writes null; RTDB drops the key). */
export interface MemberProfilePatch {
  displayName?: string;
  rank?: string;
  apparatusId?: string;
  badge?: string;
  phone?: string;
  certifications?: string;
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

// The dept-create outbox (#419) — the EXACT cloud payloads a created dept still owes
// RTDB, persisted to global meta BEFORE the first set() attempt. The payloads ride
// verbatim because createdBy / createdAt / the founder's joinedAt are not recoverable
// from the session row later. Cleared only on confirmed success; retried on every
// authenticated boot + reconnect.
const PENDING_DEPT_PUSH_KEY = 'fieldshore_pending_dept_push';
interface PendingDeptPushRow {
  deptId: string;
  deptName: string;
  deptPath: string;
  deptPayload: Record<string, unknown>;
  codePath: string;
  codePayload: Record<string, unknown>;
}

// An offline RTDB set() never rejects — it buffers forever — so every outbox set is
// raced against a timeout (the buffered write may still land later; the next retry's
// permission_denied-as-already-created handles the overlap idempotently). The create
// call itself waits only briefly so the UI is never wedged behind a dead await.
const OUTBOX_SET_TIMEOUT_MS = 8000;
const CREATE_WAIT_MS = 4000;

// The same hang class applies to one-time get()s, not just set()s: offline, get()
// never rejects either — it just never resolves. Cold-read screens that key their
// loading state off the promise settling (Audit Log, #211) would spin forever
// without a bound. Bounded so the hook can show the retry state instead.
const READ_TIMEOUT_MS = 8000;

function timeoutMs<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function createDepartmentService(deps: {
  session: () => SessionStoreApi;
  /** Global meta DB for the pending-join intent (default: the global singleton). */
  db?: FieldShoreDB;
  /** Outbox timing overrides (tests only — production uses the defaults). */
  timeouts?: { outboxSet?: number; createWait?: number; read?: number };
}): DepartmentServiceApi {
  const db = deps.db ?? globalDb;
  const outboxSetMs = deps.timeouts?.outboxSet ?? OUTBOX_SET_TIMEOUT_MS;
  const createWaitMs = deps.timeouts?.createWait ?? CREATE_WAIT_MS;
  const readMs = deps.timeouts?.read ?? READ_TIMEOUT_MS;
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

  // ---- The dept-create outbox (#419) ----

  let pushingDept = false; // single-flight — a rapid double 'online' must not race two pushes

  async function readDeptPush(): Promise<PendingDeptPushRow | null> {
    const row = await db.meta.get(PENDING_DEPT_PUSH_KEY);
    if (!row) return null;
    try {
      const p = JSON.parse(row.value);
      if (p && typeof p.deptId === 'string' && typeof p.deptPath === 'string') return p as PendingDeptPushRow;
    } catch {
      /* corrupt row → no pending push */
    }
    return null;
  }

  async function clearDeptPush(): Promise<void> {
    await db.meta.delete(PENDING_DEPT_PUSH_KEY);
    syncStatusStore.setPendingDeptPush(null);
  }

  // One outbox set, raced against the timeout. 'denied' is its own outcome: the
  // dept node is CREATE_ONLY and the code node is create-only for its create
  // branch, so PERMISSION_DENIED here means the node already exists in the cloud
  // (the original write landed, or a prior retry's buffered write did) — done,
  // not failed. Logged under its own ledger label so a genuine rules mismatch
  // stays diagnosable.
  async function racedSet(path: string, payload: unknown): Promise<'ok' | 'denied' | { error: string }> {
    const settled = set(ref(rtdb, path), payload).then(
      () => 'ok' as const,
      (err: unknown) => ({ error: err instanceof Error ? err.message : String(err) }),
    );
    const result = await Promise.race([settled, timeoutMs(outboxSetMs, { error: 'timeout' })]);
    if (result !== 'ok' && /permission_denied/i.test(result.error)) return 'denied';
    return result;
  }

  async function retryPendingDeptPush(): Promise<boolean> {
    if (pushingDept) return false;
    pushingDept = true;
    try {
      const row = await readDeptPush();
      if (!row) return false;

      // Ledger writes are fire-and-forget here: offline, logSyncEvent's own set()
      // buffers without settling — awaiting it would hold the single-flight flag
      // for the whole offline window (re-verify LOW-1).
      const dept = await racedSet(row.deptPath, row.deptPayload);
      if (dept === 'denied') {
        void logSyncEvent('dept_push_denied', { deptId: row.deptId });
      } else if (dept !== 'ok') {
        void logSyncEvent('dept_create_failed', { deptId: row.deptId, error: dept.error });
        return false;
      }

      // MUST follow the dept write: the code rule checks the dept's createdBy at root.
      const code = await racedSet(row.codePath, row.codePayload);
      if (code === 'denied') {
        void logSyncEvent('invite_code_publish_denied', { deptId: row.deptId });
      } else if (code !== 'ok') {
        void logSyncEvent('invite_code_publish_failed', { deptId: row.deptId, error: code.error });
        return false;
      }

      await clearDeptPush();
      return true;
    } finally {
      pushingDept = false;
    }
  }

  async function restorePendingDeptPush(): Promise<void> {
    const row = await readDeptPush();
    if (row) syncStatusStore.setPendingDeptPush({ deptId: row.deptId, deptName: row.deptName });
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
      // the rules deploy). The cloud push follows via the durable outbox below. The
      // invite code is persisted with it so Settings can show it after the sheet closes.
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
      // The outbox (#419): persist BOTH cloud payloads durably BEFORE the first
      // attempt, then push. The dept write must precede the code write (the code
      // rule checks the dept's createdBy at root). The create call waits only
      // briefly — a truly-offline RTDB set() buffers forever instead of rejecting,
      // and the UI must never wedge behind that await. If the push doesn't confirm
      // in time, the row stays and the banner says so; boot + reconnect retry it.
      await db.meta.put({
        key: PENDING_DEPT_PUSH_KEY,
        value: JSON.stringify({
          deptId: id,
          deptName: name,
          deptPath: `orgs/${id}`,
          deptPayload: payload,
          codePath: `orgs/inviteCodes/${inviteCode}`,
          codePayload: { deptId: id, deptName: name, createdBy: uid, createdAt, active: true },
        } satisfies PendingDeptPushRow),
      });
      const landed = await Promise.race([
        retryPendingDeptPush().catch(() => false),
        timeoutMs(createWaitMs, false),
      ]);
      if (!landed) syncStatusStore.setPendingDeptPush({ deptId: id, deptName: name });

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
        const msg = err instanceof Error ? err.message : String(err);
        await logSyncEvent('dept_join_failed', { deptId, error: msg });
        // PERMISSION_DENIED is NOT offline (#420): the JOIN_SELF_WRITE rule denies any
        // EXISTING member row — a revoked member re-joining, or a member joining from a
        // new device whose row already exists. Pre-#420 this queued forever ("You're
        // offline" while fully online, re-failing on every reconnect). Definitive → do
        // not queue, drop any pending intent, say what actually happened.
        if (/permission_denied/i.test(msg)) {
          await clearIntent();
          return {
            ok: false,
            reason:
              "You don't have access to join this department — your access may have been revoked. Contact your department admin.",
          };
        }
        // A genuine network failure at the member-write step — deptName IS known now.
        // Hold + auto-complete on reconnect.
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

  // Cold-read the department's device→account binding map (member-readable, NOT admin-
  // gated): { deviceUid → accountId }. Resolves a legacy device-ref position to its
  // owner's account so a member's command/roles are recognised across devices. {} when
  // absent/offline (degrade to device-only matching — never a crash).
  async function readDeviceOwners(): Promise<Record<string, string>> {
    const deptId = sessionStore.store.getState().departmentId;
    if (!deptId) return {};
    try {
      const snap = await get(ref(rtdb, `orgs/${deptId}/deviceOwners`));
      const val = snap.val();
      if (!val || typeof val !== 'object') return {};
      const out: Record<string, string> = {};
      for (const [dev, acct] of Object.entries(val as Record<string, unknown>)) {
        if (typeof acct === 'string') out[dev] = acct;
      }
      return out;
    } catch {
      return {};
    }
  }

  // Cold-read the department roster as { accountId, displayName } — MEMBER-readable (the
  // orgs/{dept} read cascades to members; not the admin-gated readMembers). Feeds the
  // command-transfer + position pickers so an IC can hand a role to a specific PERSON
  // (account) that then follows them across devices. Active members only; [] on error.
  async function readRoster(): Promise<{ id: string; displayName: string }[]> {
    const deptId = sessionStore.store.getState().departmentId;
    if (!deptId) return [];
    try {
      const snap = await get(ref(rtdb, `orgs/${deptId}/members`));
      const val = snap.val();
      if (!val || typeof val !== 'object') return [];
      const out: { id: string; displayName: string }[] = [];
      for (const [uid, body] of Object.entries(val as Record<string, unknown>)) {
        const parsed = Member.safeParse(body);
        if (parsed.success && parsed.data.active !== false) {
          out.push({ id: uid, displayName: parsed.data.displayName });
        }
      }
      return out.sort((a, b) => a.displayName.localeCompare(b.displayName));
    } catch {
      return [];
    }
  }

  // Read the governance audit trail (the P3 /orgs/{dept}/audit append-only node). The
  // rules gate the read on manageUsers (#381); a denial / offline read returns null →
  // the hook shows a retry state, never a crash. Coarse shape-check, like readMembers.
  //
  // Raced against READ_TIMEOUT_MS (#211): an offline get() never rejects — it buffers
  // forever — so without a bound this promise would never settle and AuditLogScreen
  // would show "Loading…" eternally. On timeout, resolve null just like a read error;
  // the hook already renders "Couldn't load the trail" + Retry for that case.
  async function readAudit(): Promise<AuditEntry[] | null> {
    const c = adminCtx();
    if (!c) return null;
    const TIMED_OUT = 'timed-out' as const;
    try {
      const result = await Promise.race([
        get(ref(rtdb, `orgs/${c.deptId}/audit`)),
        timeoutMs(readMs, TIMED_OUT),
      ]);
      if (result === TIMED_OUT) return null;
      const snap = result;
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

  // The uniform admin-mutation skeleton (#435 dedup): ctx guard → one cloud
  // write → fire-and-forget audit entry. Pre-write validation stays at each
  // site (it owns its reasons) and sits BEHIND an inline ctx guard — a
  // disconnected admin must get 'Not connected', never a validation reason
  // for a write that couldn't succeed anyway; the multi-step mutations (deleteRole,
  // regenerateInviteCode) and the self-edit setRank deliberately keep their
  // own structure (re-audit 2026-07-10: 6 of 11 sites fit).
  async function adminWrite(
    write: (c: AdminCtx) => Promise<unknown>,
    audit: () => [type: string, details: Record<string, unknown>],
  ): Promise<AdminMutationResult> {
    const c = adminCtx();
    if (!c) return { ok: false, reason: 'Not connected to a department.' };
    try {
      await write(c);
    } catch (err) {
      return { ok: false, reason: writeError(err) };
    }
    const [type, details] = audit();
    void appendAudit(c, type, details);
    return { ok: true };
  }

  async function assignRole(uid: string, roleId: string): Promise<AdminMutationResult> {
    return adminWrite(
      (c) => update(ref(rtdb, `orgs/${c.deptId}/members/${uid}`), { role: roleId }),
      () => ['roleAssigned', { targetUid: uid, roleId }],
    );
  }

  // Admin sets another member's rank (#321 inc3). manageUsers-gated by the rules; audited.
  async function setMemberRank(uid: string, rank: string): Promise<AdminMutationResult> {
    if (!adminCtx()) return { ok: false, reason: 'Not connected to a department.' };
    const trimmed = rank.trim();
    if (trimmed.length > 80) return { ok: false, reason: 'Rank is too long (max 80 characters).' };
    return adminWrite(
      (c) => update(ref(rtdb, `orgs/${c.deptId}/members/${uid}`), { rank: trimmed }),
      () => ['memberRankSet', { targetUid: uid }],
    );
  }

  // A member sets their OWN rank (#321 inc3) — the SELF_EDIT_RANK rule branch. No audit
  // (a self-profile edit isn't a governance action). Writes own row via update (merge), so
  // every other field stays put and the rule's equality guards hold.
  async function setRank(rank: string): Promise<AdminMutationResult> {
    const s = deps.session().store.getState();
    if (s.identity.kind !== 'member' || !s.departmentId) {
      return { ok: false, reason: 'Sign in and connect to a department first.' };
    }
    const trimmed = rank.trim();
    if (trimmed.length > 80) return { ok: false, reason: 'Rank is too long (max 80 characters).' };
    try {
      await update(ref(rtdb, `orgs/${s.departmentId}/members/${s.identity.accountId}`), { rank: trimmed });
    } catch (err) {
      return { ok: false, reason: writeError(err) };
    }
    return { ok: true };
  }

  async function setActive(uid: string, active: boolean, type: string): Promise<AdminMutationResult> {
    return adminWrite(
      (c) => update(ref(rtdb, `orgs/${c.deptId}/members/${uid}`), { active }),
      () => [type, { targetUid: uid }],
    );
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
    return adminWrite(
      () => set(ref(rtdb, `orgs/${c.deptId}/roles/${roleId}`), role),
      () => ['roleCreated', { roleId, roleName: trimmed }],
    );
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
    return adminWrite(
      () => update(ref(rtdb, `orgs/${c.deptId}/roles/${roleId}`), changes),
      () => ['roleEdited', { roleId, ...(changes.name ? { roleName: changes.name } : {}) }],
    );
  }

  async function deleteRole(roleId: string): Promise<AdminMutationResult> {
    const c = adminCtx();
    if (!c) return { ok: false, reason: 'Not connected to a department.' };
    if (roleId === ADMIN_ROLE_ID || roleId === DEFAULT_ROLE_ID) {
      return { ok: false, reason: 'Built-in roles cannot be deleted.' };
    }
    // Reassign any holders to Default FIRST so no member is left pointing at a missing
    // role. A failed members read must ABORT (re-verify MED-2): pre-#418 the role
    // remove() was denied anyway, but now it succeeds — proceeding on a null read
    // would strand every holder on a nonexistent role (permissionGate fails on every
    // gated write until an admin notices).
    const members = await readMembers();
    if (members === null) {
      return { ok: false, reason: "Couldn't verify who holds this role — check your connection and try again." };
    }
    const holders = Object.entries(members)
      .filter(([, m]) => m.role === roleId)
      .map(([uid]) => uid);
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

  // ---- Invite-code lifecycle (#423) — a leaked code must be killable on scene ----

  // Flip the current code inactive. The rules' REVOKE branch allows exactly this
  // transition (active → false, every other field frozen); resolve-on-join already
  // rejects inactive codes ("That code has expired"). The dead code stays in the
  // session row until a regenerate replaces it — the UI's primary affordance is
  // Regenerate, which rotates rather than leaving the dept code-less.
  async function revokeInviteCode(): Promise<AdminMutationResult> {
    if (!adminCtx()) return { ok: false, reason: 'Not connected to a department.' };
    const code = deps.session().store.getState().inviteCode;
    if (!code) return { ok: false, reason: 'No invite code on record for this department.' };
    return adminWrite(
      () => update(ref(rtdb, `orgs/inviteCodes/${code}`), { active: false }),
      () => ['inviteCodeRevoked', { code }],
    );
  }

  // Rotate: kill the OLD code FIRST, then publish the new one. Regenerate is the
  // only user-facing kill path, and its confirm promises "the current code stops
  // working immediately" — so the kill is the primary operation and its failure
  // ABORTS with an honest error (re-verify: a publish-first ordering reported
  // ok while a leaked code could silently stay live). A revoke-then-publish
  // failure leaves the dept briefly code-less with a dead code on display —
  // honest and self-healing: the next Regenerate re-revokes the dead code (the
  // rules' active:false→false update is idempotent) and mints a fresh one.
  async function regenerateInviteCode(): Promise<AdminMutationResult & { code?: string }> {
    const c = adminCtx();
    if (!c) return { ok: false, reason: 'Not connected to a department.' };
    const s = deps.session().store.getState();
    if (s.identity.kind !== 'member' || !s.departmentId || !s.departmentName || !s.role) {
      return { ok: false, reason: 'Not connected to a department.' };
    }
    const oldCode = s.inviteCode;
    if (oldCode) {
      try {
        await update(ref(rtdb, `orgs/inviteCodes/${oldCode}`), { active: false });
      } catch (err) {
        void logSyncEvent('invite_code_revoke_failed', {
          deptId: c.deptId,
          error: err instanceof Error ? err.message : String(err),
        });
        return {
          ok: false,
          reason: "Couldn't retire the current code — it is still active. Check your connection and try again.",
        };
      }
    }
    const newCode = mintInviteCode();
    try {
      await set(ref(rtdb, `orgs/inviteCodes/${newCode}`), {
        deptId: s.departmentId,
        deptName: s.departmentName,
        createdBy: s.identity.accountId, // the rule self-stamp: createdBy === auth.uid
        createdAt: Date.now(),
        active: true,
      });
    } catch (err) {
      void logSyncEvent('invite_code_publish_failed', {
        deptId: c.deptId,
        error: err instanceof Error ? err.message : String(err),
      });
      return {
        ok: false,
        reason: 'The old code was retired, but a new code could not be issued — tap Regenerate again.',
      };
    }
    await deps.session().setDepartment({
      id: s.departmentId,
      name: s.departmentName,
      role: s.role,
      inviteCode: newCode,
    });
    void appendAudit(c, 'inviteCodeRegenerated', { revokedCode: oldCode ?? null });
    return { ok: true, code: newCode };
  }

  // ---- Admin-provisioned personnel (#439) ----

  // Callable failures → plain reasons. The server already speaks user-facing copy
  // (HttpsError messages), so known application codes pass its message through;
  // reachability failures get the offline copy (callables are online-only by
  // design — privileged account ops have no meaningful offline queue).
  function callableError(err: unknown): string {
    const code = (err as { code?: string }).code ?? '';
    const message = (err as { message?: string }).message ?? '';
    if (code === 'functions/already-exists') {
      return 'An account with that email already exists — they can join with the invite code instead.';
    }
    if (code === 'functions/unavailable' || code === 'functions/deadline-exceeded' || code === 'functions/internal') {
      return "Couldn't reach the server — check your connection and try again.";
    }
    if (message) return message;
    return 'That change could not be saved. Try again.';
  }

  async function provisionMember(
    input: ProvisionMemberInput,
  ): Promise<AdminMutationResult & { uid?: string }> {
    const c = adminCtx();
    if (!c) return { ok: false, reason: 'Not connected to a department.' };
    let uid: string;
    try {
      const res = await callFunction<
        ProvisionMemberInput & { deptId: string },
        { uid: string }
      >('provisionAccount', { ...input, deptId: c.deptId });
      uid = res.uid;
    } catch (err) {
      return { ok: false, reason: callableError(err) };
    }
    void appendAudit(c, 'memberProvisioned', { targetUid: uid, roleId: input.role });
    return { ok: true, uid };
  }

  async function setMemberProfile(uid: string, patch: MemberProfilePatch): Promise<AdminMutationResult> {
    const changes: Record<string, unknown> = {};
    for (const key of ['displayName', 'rank', 'apparatusId', 'badge', 'phone', 'certifications'] as const) {
      const v = patch[key];
      if (v === undefined) continue;
      const trimmed = v.trim();
      // '' clears the field (null → RTDB drops the key) — except displayName,
      // which the schema requires non-empty; an empty name is a caller bug.
      if (key === 'displayName' && !trimmed) return { ok: false, reason: 'A name is required.' };
      changes[key] = trimmed || null;
    }
    if (!Object.keys(changes).length) return { ok: true };
    const res = await adminWrite(
      (c) => update(ref(rtdb, `orgs/${c.deptId}/members/${uid}`), changes),
      () => ['memberProfileEdited', { targetUid: uid }],
    );
    // Keep the Auth profile displayName in sync (resolveDisplayName's fallback
    // source) — best-effort: the member row is the app's display truth, so a
    // failed profile sync must not fail the save.
    if (res.ok && typeof changes.displayName === 'string') {
      const c = adminCtx();
      if (c) {
        void callFunction('adminUpdateAccount', {
          deptId: c.deptId,
          targetUid: uid,
          displayName: changes.displayName,
        }).catch((err) =>
          logSyncEvent('auth_profile_sync_failed', {
            deptId: c.deptId,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    }
    return res;
  }

  async function changeMemberEmail(uid: string, email: string): Promise<AdminMutationResult> {
    const c = adminCtx();
    if (!c) return { ok: false, reason: 'Not connected to a department.' };
    const addr = email.trim();
    if (!addr) return { ok: false, reason: 'Enter an email first.' };
    try {
      await callFunction('adminUpdateAccount', { deptId: c.deptId, targetUid: uid, email: addr });
    } catch (err) {
      return { ok: false, reason: callableError(err) };
    }
    void appendAudit(c, 'accountEmailChanged', { targetUid: uid });
    return { ok: true };
  }

  async function resetMemberPassword(uid: string, starterPassword: string): Promise<AdminMutationResult> {
    const c = adminCtx();
    if (!c) return { ok: false, reason: 'Not connected to a department.' };
    try {
      await callFunction('adminUpdateAccount', {
        deptId: c.deptId,
        targetUid: uid,
        newPassword: starterPassword,
      });
    } catch (err) {
      return { ok: false, reason: callableError(err) };
    }
    void appendAudit(c, 'passwordResetToStarter', { targetUid: uid });
    return { ok: true };
  }

  // Self-write, like setRank: the SELF_EDIT rule branch permits exactly the
  // true→false transition. No audit — finishing your own forced password change
  // is hygiene, not governance.
  async function clearMustChangePassword(): Promise<AdminMutationResult> {
    const s = deps.session().store.getState();
    if (s.identity.kind !== 'member' || !s.departmentId) {
      return { ok: false, reason: 'Sign in and connect to a department first.' };
    }
    try {
      await update(ref(rtdb, `orgs/${s.departmentId}/members/${s.identity.accountId}`), {
        mustChangePassword: false,
      });
    } catch (err) {
      return { ok: false, reason: writeError(err) };
    }
    return { ok: true };
  }

  return {
    createDepartment,
    joinByCode,
    retryPendingJoin,
    restorePendingJoin,
    retryPendingDeptPush,
    restorePendingDeptPush,
    readMembers,
    readDeviceOwners,
    readRoster,
    readAudit,
    assignRole,
    setMemberRank,
    setRank,
    revokeMember,
    reactivateMember,
    createRole,
    editRole,
    deleteRole,
    revokeInviteCode,
    regenerateInviteCode,
    provisionMember,
    setMemberProfile,
    changeMemberEmail,
    resetMemberPassword,
    clearMustChangePassword,
  };
}

/** The app's singleton department service, bound to the singleton session store. */
export const departmentService = createDepartmentService({ session: () => sessionStore });

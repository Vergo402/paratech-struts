import {
  Department,
  Member,
  Role,
  InviteCode,
  ADMIN_ROLE_ID,
  DEFAULT_ROLE_ID,
  ADMIN_PERMISSIONS,
  DEFAULT_PERMISSIONS,
} from '@core/schema';
import { newId } from '@core/id';
import { rtdb, ref, get, set } from '../sync/firebase';
import { logSyncEvent } from '../sync/diagnostics';
import { sessionStore, type SessionStoreApi } from '../store/session';

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
  | { ok: false; reason: string };

export interface DepartmentServiceApi {
  /** Create a department, claim founding Admin, mint an invite code. Local-first. */
  createDepartment(name: string): Promise<CreateDepartmentResult>;
  /** Join an existing department by invite code → Default role (workflow #232). */
  joinByCode(rawCode: string): Promise<JoinDepartmentResult>;
}

export function createDepartmentService(deps: {
  session: () => SessionStoreApi;
}): DepartmentServiceApi {
  return {
    async createDepartment(rawName) {
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
    },

    async joinByCode(rawCode) {
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
        return {
          ok: false,
          reason: "You're offline. You'll be able to join once you reconnect.",
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
        return {
          ok: false,
          reason: "You're offline. You'll be able to join once you reconnect.",
        };
      }

      // Local-first projection — the member now carries the joined dept + Default role.
      await session.setDepartment({ id: deptId, name: deptName, role: DEFAULT_ROLE_ID, inviteCode: code });
      return { ok: true, department: { id: deptId, name: deptName, role: DEFAULT_ROLE_ID } };
    },
  };
}

/** The app's singleton department service, bound to the singleton session store. */
export const departmentService = createDepartmentService({ session: () => sessionStore });

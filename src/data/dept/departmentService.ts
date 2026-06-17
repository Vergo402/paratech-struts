import {
  Department,
  Member,
  Role,
  ADMIN_ROLE_ID,
  DEFAULT_ROLE_ID,
  ADMIN_PERMISSIONS,
  DEFAULT_PERMISSIONS,
} from '@core/schema';
import { newId } from '@core/id';
import { rtdb, ref, set } from '../sync/firebase';
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

export interface CreatedDepartment {
  id: string;
  name: string;
  role: string;
  inviteCode: string;
}

export type CreateDepartmentResult =
  | { ok: true; department: CreatedDepartment }
  | { ok: false; reason: string };

export interface DepartmentServiceApi {
  /** Create a department, claim founding Admin, mint an invite code. Local-first. */
  createDepartment(name: string): Promise<CreateDepartmentResult>;
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
      // the rules deploy). The cloud push follows, best-effort.
      await session.setDepartment({ id, name, role: ADMIN_ROLE_ID });

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
      try {
        await set(ref(rtdb, `orgs/${id}`), payload);
      } catch (err) {
        // The local dept stands; surface the cloud failure to the ledger (lesson 5).
        await logSyncEvent('dept_create_failed', {
          deptId: id,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      return { ok: true, department: { id, name, role: ADMIN_ROLE_ID, inviteCode } };
    },
  };
}

/** The app's singleton department service, bound to the singleton session store. */
export const departmentService = createDepartmentService({ session: () => sessionStore });

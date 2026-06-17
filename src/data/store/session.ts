import { createStore, type StoreApi } from 'zustand/vanilla';
import { z } from 'zod';
import { db as defaultDb, type FieldShoreDB } from './db';

// data/store — the local session/identity (workflow 06 sign-in/out + workflow 07
// department). Guest is the resting default (ADR-015: cold-open to guest, never
// an auth wall). The per-device `deviceUid` (auth.ts, ADR-024) is the FLOOR —
// present guest or member, never discarded on sign-out. setGuest() drops the
// identity AND the department projection back to empty but NEVER touches the
// events/inventory tables: local work persists across a sign-out (workflow 06
// §Step 4).
//
// The department projection (departmentId/Name + role, ADR-017) is set by
// workflow 07 (createDepartment → setDepartment) and restored from the meta row
// on boot. Only a member carries a department; setGuest clears it (a guest is no
// one's member). Re-discovering a member's department after a sign-out → sign-in
// (a plain reload is covered by the meta row) needs a per-user dept lookup —
// deferred with multi-dept membership (#232 / open question).
//
// Durable copy is ONE json row in `meta` (SESSION_KEY). `deviceUid` is NOT
// duplicated here (it owns the fieldshore_auth_uid row — one source of truth).
// Real Firebase Auth (ADR-025) lives behind the account seam (accountService.ts)
// and is reconciled on boot by authSession.ts — not here.

export const SESSION_KEY = 'fieldshore_session';

export type Identity =
  | { kind: 'guest' }
  | { kind: 'member'; accountId: string; displayName: string };

export interface SessionState {
  identity: Identity;
  departmentId: string | null;
  departmentName: string | null;
  role: string | null;
  deviceUid: string;
}

export interface SessionStoreApi {
  store: StoreApi<SessionState>;
  /** Hydrate from the persisted meta row. deviceUid is passed in from boot. */
  boot(deviceUid: string): Promise<void>;
  /** Sign-in / create-account success → durable write THEN setState (L-4). */
  setMember(member: { accountId: string; displayName: string }): Promise<void>;
  /** Sign out → guest. Keeps deviceUid; clears the dept; never touches events. */
  setGuest(): Promise<void>;
  /** Workflow 07 — attach the founded department + the member's role. */
  setDepartment(dept: { id: string; name: string; role: string }): Promise<void>;
}

const GUEST: Identity = { kind: 'guest' };

// The persisted slice — deviceUid is excluded (it has its own meta row).
interface PersistedSession {
  identity: Identity;
  departmentId: string | null;
  departmentName: string | null;
  role: string | null;
}

const GUEST_SESSION: PersistedSession = {
  identity: GUEST,
  departmentId: null,
  departmentName: null,
  role: null,
};

// Validate the persisted row on read — boot() is a trust boundary: a future
// schema change or a partial write could leave a valid-JSON-but-wrong-shape blob.
// safeParse-then-degrade mirrors operationStore.commit's gate; the member variant
// enforces the ADR-025 non-empty display name. Older rows (pre-dept) lack the
// department fields → they fail this schema and degrade to guest, which is safe
// (the only loss is the local dept projection, re-set on next create/restore).
const PersistedSchema = z.object({
  identity: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('guest') }),
    z.object({
      kind: z.literal('member'),
      accountId: z.string().min(1),
      displayName: z.string().min(1),
    }),
  ]),
  departmentId: z.string().nullable(),
  // .catch(null) — a pre-department member row (workflow 06, before these fields
  // existed) stays a member with no dept, rather than degrading to guest on
  // upgrade. A wrong-typed value also degrades to null (safe; re-set on create).
  departmentName: z.string().nullable().catch(null),
  role: z.string().nullable().catch(null),
});

export function createSessionStore(db: FieldShoreDB = defaultDb): SessionStoreApi {
  // deviceUid is '' until boot() fills it; boot runs before any UI mounts.
  const store = createStore<SessionState>(() => ({ ...GUEST_SESSION, deviceUid: '' }));

  // put (not add) — the session row is overwritten on every sign-in/out/dept set.
  function persist(next: PersistedSession): Promise<unknown> {
    return db.meta.put({ key: SESSION_KEY, value: JSON.stringify(next) });
  }

  function deptOf(s: SessionState): Pick<PersistedSession, 'departmentId' | 'departmentName' | 'role'> {
    return { departmentId: s.departmentId, departmentName: s.departmentName, role: s.role };
  }

  return {
    store,

    async boot(deviceUid) {
      let persisted: PersistedSession = GUEST_SESSION;
      const row = await db.meta.get(SESSION_KEY);
      if (row) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(row.value);
        } catch {
          parsed = undefined;
        }
        // Validate the SHAPE, not just that it parsed: any unreadable or
        // wrong-shape row degrades to guest, never dead-ends boot (W6).
        const result = PersistedSchema.safeParse(parsed);
        if (result.success) persisted = result.data;
      }
      store.setState({ ...persisted, deviceUid }, true);
    },

    async setMember(member) {
      const identity: Identity = { kind: 'member', ...member };
      // Preserve the department projection — a plain reload re-confirms a member
      // who already has a department (boot restores it from the meta row).
      await persist({ identity, ...deptOf(store.getState()) });
      store.setState((s) => ({ ...s, identity }), true);
    },

    async setGuest() {
      // A guest is no one's member — drop the department projection too. Local
      // events/inventory are never touched.
      await persist(GUEST_SESSION);
      store.setState((s) => ({ ...s, ...GUEST_SESSION }), true);
    },

    async setDepartment({ id, name, role }) {
      const next = { departmentId: id, departmentName: name, role };
      await persist({ identity: store.getState().identity, ...next });
      store.setState((s) => ({ ...s, ...next }), true);
    },
  };
}

/** The app's singleton session store, bound to the singleton DB. */
export const sessionStore = createSessionStore();

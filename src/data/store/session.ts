import { createStore, type StoreApi } from 'zustand/vanilla';
import { z } from 'zod';
import { db as defaultDb, type FieldShoreDB } from './db';

// data/store — the local session/identity (workflow 06, signing in/out). Guest
// is the resting default (ADR-015: the app cold-opens to guest, never an auth
// wall). The per-device `deviceUid` (auth.ts, ADR-024) is the FLOOR — present
// guest or member, never discarded on sign-out. setGuest() drops the identity
// back to guest but NEVER touches the events/inventory tables: local work
// persists across a sign-out (workflow 06 §Step 4).
//
// Durable copy is ONE json row in `meta` (SESSION_KEY) — a single small object
// with no query needs, so a dedicated table + schema migration would be pure
// overhead. `deviceUid` is NOT duplicated here (it owns the fieldshore_auth_uid
// row — one source of truth). `departmentId` (and the future role, ADR-017) are
// populated by workflows 07/08 (create / join a department) — null this slice.
//
// Real Firebase Auth (email + password, magic-link — ADR-025) lands in a later
// session behind the account seam (data/auth/accountService.ts), not here.

export const SESSION_KEY = 'fieldshore_session';

export type Identity =
  | { kind: 'guest' }
  | { kind: 'member'; accountId: string; displayName: string };

export interface SessionState {
  identity: Identity;
  departmentId: string | null;
  deviceUid: string;
}

export interface SessionStoreApi {
  store: StoreApi<SessionState>;
  /** Hydrate from the persisted meta row. deviceUid is passed in from boot. */
  boot(deviceUid: string): Promise<void>;
  /** Sign-in / create-account success → durable write THEN setState (L-4). */
  setMember(member: { accountId: string; displayName: string }): Promise<void>;
  /** Sign out → guest. Keeps deviceUid; never touches events/inventory. */
  setGuest(): Promise<void>;
}

const GUEST: Identity = { kind: 'guest' };

// The persisted slice — deviceUid is excluded (it has its own meta row).
interface PersistedSession {
  identity: Identity;
  departmentId: string | null;
}

const GUEST_SESSION: PersistedSession = { identity: GUEST, departmentId: null };

// Validate the persisted row on read — boot() is a trust boundary: a future
// schema change or a partial write could leave a valid-JSON-but-wrong-shape blob
// (`null`, `{}`, a member missing its name…). A bare `as` cast would let
// identity become undefined and dead-end boot (the W6 invariant this file
// claims). safeParse-then-degrade mirrors operationStore.commit's gate; the
// member variant also enforces the ADR-025 non-empty display name.
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
});

export function createSessionStore(db: FieldShoreDB = defaultDb): SessionStoreApi {
  // deviceUid is '' until boot() fills it; boot runs before any UI mounts.
  const store = createStore<SessionState>(() => ({ ...GUEST_SESSION, deviceUid: '' }));

  // put (not add) — the session row is overwritten on every sign-in/out, so
  // there is no mint-race to detect (unlike auth.ts's uid add).
  function persist(next: PersistedSession): Promise<unknown> {
    return db.meta.put({ key: SESSION_KEY, value: JSON.stringify(next) });
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
        // wrong-shape row degrades to guest, never dead-ends boot (W6), and
        // identity is guaranteed a valid union before boot.ts reads .kind.
        const result = PersistedSchema.safeParse(parsed);
        if (result.success) persisted = result.data;
      }
      store.setState({ ...persisted, deviceUid }, true);
    },

    async setMember(member) {
      const identity: Identity = { kind: 'member', ...member };
      await persist({ identity, departmentId: store.getState().departmentId });
      store.setState((s) => ({ ...s, identity }), true);
    },

    async setGuest() {
      // departmentId is preserved (null this slice); whether sign-out detaches
      // the department association is a workflow 07/08 decision.
      await persist({ identity: GUEST, departmentId: store.getState().departmentId });
      store.setState((s) => ({ ...s, identity: GUEST }), true);
    },
  };
}

/** The app's singleton session store, bound to the singleton DB. */
export const sessionStore = createSessionStore();

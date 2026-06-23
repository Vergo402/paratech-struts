import { createStore, type StoreApi } from 'zustand/vanilla';
import { Role } from '@core/schema';

// The department's role definitions (#381, User Manager) — the live `/orgs/{deptId}/roles`
// map, keyed by roleId. It feeds usePermissions app-wide, so editing a role re-gates every
// screen. Unlike inventory/apparatus (last-write-wins blobs), roles are PLAIN cloud-
// authoritative objects written only by admins through the User Manager, so this is a simple
// pull (rolesListener: onValue → applyRemote), plus applyLocal/removeLocal for the acting
// admin's own instant feedback before the cloud echo returns.
//
// ponytail: IN-MEMORY only (no Dexie persistence). Offline, the store is empty and
// permissionsForRole falls back to the built-in constants (admin/Default correct; a custom
// role floors to Default — under-privilege, never over). Add a meta-row persist if offline
// custom-role gating ever needs to survive a reload while disconnected.

export interface RolesState {
  roles: Record<string, Role>;
}

export interface RolesStoreApi {
  store: StoreApi<RolesState>;
  /** Replace the whole map from a cloud snapshot. A null/non-object snapshot means
   *  not-loaded (offline, or mid-create) → KEEP local, never wipe to {} (the built-in
   *  Admin + Default always exist, so a real roles node is never empty). */
  applyRemote(snap: unknown): void;
  /** Upsert one role locally (the admin's own create/edit — instant, pre-cloud-echo). */
  applyLocal(role: Role): void;
  /** Drop one role locally (the admin's own delete). */
  removeLocal(roleId: string): void;
}

// Cloud stores a role WITHOUT its id (the id is the RTDB key), so parse the body and
// re-attach the key. A wrong-shape entry is skipped, never crashing the whole map.
const RoleBody = Role.omit({ id: true });
function parseRoles(snap: Record<string, unknown>): Record<string, Role> {
  const out: Record<string, Role> = {};
  for (const [id, body] of Object.entries(snap)) {
    const parsed = RoleBody.safeParse(body);
    if (parsed.success) out[id] = { id, ...parsed.data };
  }
  return out;
}

export function createRolesStore(): RolesStoreApi {
  const store = createStore<RolesState>(() => ({ roles: {} }));
  return {
    store,
    applyRemote(snap) {
      if (!snap || typeof snap !== 'object') return; // not-loaded → keep local
      store.setState({ roles: parseRoles(snap as Record<string, unknown>) }, true);
    },
    applyLocal(role) {
      store.setState((s) => ({ roles: { ...s.roles, [role.id]: role } }), true);
    },
    removeLocal(roleId) {
      store.setState((s) => {
        const next = { ...s.roles };
        delete next[roleId];
        return { roles: next };
      }, true);
    },
  };
}

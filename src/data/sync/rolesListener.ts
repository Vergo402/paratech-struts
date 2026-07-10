import { rolesStore } from '../store/registry';
import { sessionStore } from '../store/session';
import { firebaseSubscribe } from './subscribe';

// data/sync — the cloud→local listener for the department's ROLE definitions (#381).
// A sibling of stateListener.ts, but far simpler: roles are PLAIN cloud-authoritative
// objects (only admins write them, through the User Manager), so this is a one-way PULL
// (onValue → rolesStore.applyRemote), no last-write-wins merge and no push-up. onValue
// fires once with the current value on subscribe, so this doubles as the first-load.
// Started from main.tsx after the state listener; a department switch is a FULL PAGE
// RELOAD, which tears the subscription down structurally (stop() exists for tests).
//
// FIREBASE SEAM — firebase-free at module load: the default subscribe lazily imports
// ./firebase only once start() runs; unit tests inject a fake subscribe.

export interface RolesListenerSync {
  start(): void;
  stop(): void;
}

export function createRolesListenerSync(deps: {
  deptId: () => string | null;
  applyRemote: (snap: unknown) => void;
  subscribe?: (path: string, cb: (snap: unknown) => void) => () => void;
}): RolesListenerSync {
  const subscribe = deps.subscribe ?? firebaseSubscribe;
  let unsub: (() => void) | null = null;
  return {
    start() {
      if (unsub) return; // idempotent (StrictMode double-start)
      const dept = deps.deptId();
      if (!dept) return; // guest → no cloud listener
      unsub = subscribe(`orgs/${dept}/roles`, (snap) => deps.applyRemote(snap));
    },
    stop() {
      unsub?.();
      unsub = null;
    },
  };
}

/** The app's singleton, wired to the active bucket's roles store. */
export const rolesListenerSync = createRolesListenerSync({
  deptId: () => sessionStore.store.getState().departmentId,
  applyRemote: (snap) => rolesStore.applyRemote(snap),
});

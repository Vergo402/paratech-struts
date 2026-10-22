import { sessionStore } from '../store/session';
import { firebaseSubscribe } from './subscribe';

// data/sync — the cloud→local listener for the signed-in member's OWN row
// (orgs/<dept>/members/<uid>), closing #555: the role ASSIGNMENT was read once at
// sign-in and never refreshed, while the role DEFINITIONS (rolesListener) were
// already live — so an admin reassigning a member changed nothing until they signed
// back in. A one-way pull, like rolesListener: onValue fires once on subscribe, so it
// doubles as the first-load. A department switch is a FULL PAGE RELOAD, which tears
// the subscription down structurally (stop() exists for tests).
//
// FIREBASE SEAM — firebase-free at module load (see rolesListener): unit tests inject
// a fake subscribe.

export interface MemberListenerSync {
  start(): void;
  stop(): void;
}

export function createMemberListenerSync(deps: {
  member: () => { deptId: string; uid: string } | null;
  applyRemote: (snap: unknown) => void;
  subscribe?: (path: string, cb: (snap: unknown) => void) => () => void;
}): MemberListenerSync {
  const subscribe = deps.subscribe ?? firebaseSubscribe;
  let unsub: (() => void) | null = null;
  return {
    start() {
      if (unsub) return; // idempotent (StrictMode double-start)
      const m = deps.member();
      if (!m) return; // guest / no department → no cloud listener
      unsub = subscribe(`orgs/${m.deptId}/members/${m.uid}`, (snap) => deps.applyRemote(snap));
    },
    stop() {
      unsub?.();
      unsub = null;
    },
  };
}

/** The app's singleton, wired to the session's role. */
export const memberListenerSync = createMemberListenerSync({
  member: () => {
    const s = sessionStore.store.getState();
    return s.identity.kind === 'member' && s.departmentId
      ? { deptId: s.departmentId, uid: s.identity.accountId }
      : null;
  },
  // null / non-object (offline not-loaded, row removed or denied) is ignored — never
  // wipes the session (same posture as rolesStore.applyRemote).
  applyRemote: (snap) => {
    if (!snap || typeof snap !== 'object') return;
    const role = (snap as { role?: unknown }).role;
    if (typeof role === 'string') void sessionStore.setRole(role);
  },
});

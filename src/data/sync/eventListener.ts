import type { FieldShoreEvent } from '@core/schema';
import { type EventRow } from '../store/db';
import { currentDeptDb } from '../store/registry';
import { sessionStore } from '../store/session';
import { syncService } from './syncService';
import { firebaseSubscribe } from './subscribe';

// data/sync — the cloud→local event listener (cloud-sync Increment 2). Mirrors
// authSession: a factory + a singleton with idempotent start()/stop(), started from
// main.tsx after bootData(). A department switch is a FULL PAGE RELOAD
// (ui/dept/switchBucket), which tears the Firebase subscription down structurally —
// so there is no per-switch teardown to wire; stop() exists for tests/symmetry.
//
// FIRST SNAPSHOT = TWO-WAY MERGE. The in-memory upload queue does NOT survive a
// reload, but a reload happens on every switch — so a member who worked offline then
// reloaded before syncing would hold un-uploaded local events with an EMPTY queue. On
// the first snapshot we therefore rebuild the backlog from local events absent in the
// cloud (push UP) as well as reconcile cloud events absent locally (pull DOWN). The
// empty-cloud case is just "push everything up" — this subsumes and strengthens the
// L-6 empty-first-snapshot guard (an empty first read is NEVER treated as a delete).
//
// FIREBASE SEAM — firebase-free at module load: the default `subscribe` lazily imports
// ./firebase only when start() runs, and unit tests inject a fake subscribe.

export interface EventListenerSync {
  start(): void;
  stop(): void;
  /** Re-reconcile the latest cloud snapshot already received (no new network read).
   *  Called by the STATE listener once inventory has durably landed: an inventory-
   *  consequential event (deploy/return) that was dropped because its stock row hadn't
   *  arrived yet (the two listeners are uncoordinated subscriptions) re-applies now that
   *  the row exists. Idempotent — already-applied events fail the &id dedup and drop. */
  resync(): void;
}

/** Flatten the RTDB {opId}→{eventId}→event snapshot into a flat event list. */
function flatten(snap: unknown): FieldShoreEvent[] {
  if (!snap || typeof snap !== 'object') return [];
  const out: FieldShoreEvent[] = [];
  for (const byEventId of Object.values(snap as Record<string, unknown>)) {
    if (byEventId && typeof byEventId === 'object') {
      for (const event of Object.values(byEventId as Record<string, unknown>)) {
        if (event && typeof event === 'object') out.push(event as FieldShoreEvent);
      }
    }
  }
  return out;
}

export function createEventListenerSync(deps: {
  deptId: () => string | null;
  localEvents: () => Promise<FieldShoreEvent[]>;
  reconcile: (events: FieldShoreEvent[]) => Promise<unknown>;
  enqueue: (event: FieldShoreEvent) => void;
  flush: () => Promise<void>;
  subscribe?: (path: string, cb: (snap: unknown) => void) => () => void;
}): EventListenerSync {
  const subscribe = deps.subscribe ?? firebaseSubscribe;
  let unsub: (() => void) | null = null;
  let firstSnapshotSeen = false;
  let lastCloud: FieldShoreEvent[] = []; // the latest snapshot, retained for resync()

  // Two-way reconciliation on the first snapshot (see header).
  async function firstMerge(cloud: FieldShoreEvent[]): Promise<void> {
    const cloudIds = new Set(cloud.map((e) => e.id));
    const local = await deps.localEvents();
    const backlog = local.filter((e) => !cloudIds.has(e.id));
    if (backlog.length > 0) {
      for (const e of backlog) deps.enqueue(e);
      void deps.flush(); // push un-synced local work UP (empty-cloud + reload-stranding)
    }
    if (cloud.length > 0) await deps.reconcile(cloud); // pull peer work DOWN
  }

  return {
    start() {
      if (unsub) return; // idempotent (StrictMode double-start)
      const dept = deps.deptId();
      if (!dept) return; // guest → no cloud listener
      firstSnapshotSeen = false;
      unsub = subscribe(`orgs/${dept}/events`, (snap) => {
        const cloud = flatten(snap);
        lastCloud = cloud; // retain for resync()
        if (!firstSnapshotSeen) {
          firstSnapshotSeen = true;
          void firstMerge(cloud);
          return;
        }
        void deps.reconcile(cloud); // steady state: pull cloud → local (idempotent, &id-dedup)
      });
    },
    stop() {
      unsub?.();
      unsub = null;
    },
    resync() {
      if (lastCloud.length > 0) void deps.reconcile(lastCloud);
    },
  };
}

/** Strip the local-only `seq` append key so it never leaks to the cloud wire event. */
export function stripSeq(row: EventRow): FieldShoreEvent {
  const e = { ...row };
  delete (e as { seq?: number }).seq;
  return e;
}

/** The app's singleton, wired to the active bucket's log + the sync service. */
export const eventListenerSync = createEventListenerSync({
  deptId: () => sessionStore.store.getState().departmentId,
  localEvents: async () => (await currentDeptDb().events.toArray()).map(stripSeq),
  reconcile: (events) => syncService.reconcile(events),
  enqueue: (event) => syncService.enqueue(event),
  flush: () => syncService.flush(),
});

import { compareCanonical } from '@core/operation';
import type { FieldShoreEvent } from '@core/schema';
import { operationStore } from '../store/registry';
import { sessionStore } from '../store/session';
import { syncService, type ReconcileOptions } from './syncService';
import { cloudIndex, type CloudIndex, type CloudIndexEntry } from './cloudIndex';
import { firebaseSubscribe } from './subscribe';

// data/sync — the cloud→local event listener (cloud-sync Increment 2; ADR-041 / #499).
// Mirrors authSession: a factory + a singleton with idempotent start()/stop(), started
// from main.tsx after bootData(). A department switch is a FULL PAGE RELOAD
// (ui/dept/switchBucket), which tears the Firebase subscription down structurally —
// so there is no per-switch teardown to wire; stop() exists for tests/symmetry.
//
// EVERY SNAPSHOT IS THE WHOLE DEPARTMENT LOG. The callback first replaces the cloud
// snapshot index (cloudIndex) — synchronously, so a flush awaiting its upload ack can read
// the server stamp the moment the write resolves — then hands the snapshot to reconcile.
// SINGLE-FLIGHT: one reconcile at a time; snapshots that arrive meanwhile collapse to the
// latest (each is a full state, so skipping intermediates loses nothing) and run as exactly
// one more pass.
//
// THE SDK ECHO (ADR-041 Notes, verified in @firebase/database repoSetWithPriority): this
// device's own set()/update() raises onValue IMMEDIATELY with the server timestamp
// ESTIMATED from the local clock + offset, before the server has the write. When the
// server acknowledges, the SDK raises the snapshot again with the REAL stamp, and only then
// resolves the write promise. So a snapshot's `receivedAt` for an own event is provisional
// while that event is still in the upload queue — syncService.reconcile ignores it there
// (the echo gate) and syncService.flush stamps the real value after the ack.
//
// FIRST SNAPSHOT = TWO-WAY MERGE. The in-memory upload queue does NOT survive a reload,
// but a reload happens on every switch — so a member who worked offline then reloaded
// before syncing holds un-uploaded local events with an EMPTY queue. On the first
// snapshot we rebuild the backlog — local events absent from the cloud that were never
// received (a stamped row reached the cloud once; it is never re-uploaded) — in canonical
// order (= commit order for provisional events) and push it UP, then pull the cloud DOWN.
// That first pull tracks "had no effect" ONLY for the backlog ids (onlyIds): work done
// offline before a reload that lost to a peer is surfaced, while the history the pass
// replays (and, once after the ADR-041 upgrade, the re-sort of a pre-upgrade log) never
// floods the list; nor does it feed the peer-cut badge. An empty first snapshot is never a
// delete (L-6).
//
// FIREBASE SEAM — firebase-free at module load: the default `subscribe` lazily imports
// ./firebase only when start() runs, and unit tests inject a fake subscribe.

export interface EventListenerSync {
  start(): void;
  stop(): void;
}

/** Flatten the RTDB {opId}→{eventId}→event snapshot into a flat list of records. */
function flatten(snap: unknown): Record<string, unknown>[] {
  if (!snap || typeof snap !== 'object') return [];
  const out: Record<string, unknown>[] = [];
  for (const byEventId of Object.values(snap as Record<string, unknown>)) {
    if (byEventId && typeof byEventId === 'object') {
      for (const event of Object.values(byEventId as Record<string, unknown>)) {
        if (event && typeof event === 'object') out.push(event as Record<string, unknown>);
      }
    }
  }
  return out;
}

/** The index entries of a snapshot (records without a string id are skipped). */
function entriesOf(cloud: readonly Record<string, unknown>[]): CloudIndexEntry[] {
  const out: CloudIndexEntry[] = [];
  for (const r of cloud) {
    if (typeof r.id !== 'string') continue;
    out.push(typeof r.receivedAt === 'number' ? { id: r.id, receivedAt: r.receivedAt } : { id: r.id });
  }
  return out;
}

export function createEventListenerSync(deps: {
  deptId: () => string | null;
  /** This bucket's events (the in-memory canonical log) — the backlog source. */
  localEvents: () => Promise<FieldShoreEvent[]> | FieldShoreEvent[];
  reconcile: (cloud: readonly unknown[], opts: ReconcileOptions) => Promise<unknown>;
  enqueue: (event: FieldShoreEvent) => void;
  flush: () => Promise<void>;
  /** The cloud snapshot index (default: the app singleton the sync service reads). */
  cloud?: CloudIndex;
  subscribe?: (path: string, cb: (snap: unknown) => void) => () => void;
}): EventListenerSync {
  const subscribe = deps.subscribe ?? firebaseSubscribe;
  const index = deps.cloud ?? cloudIndex;
  let unsub: (() => void) | null = null;
  let firstMergeDone = false; //    the two-way merge has completed once
  let running = false;
  let pending: Record<string, unknown>[] | null = null;
  let generation = 0; // bumped by start/stop so a stale in-flight loop exits

  async function firstMerge(cloud: readonly Record<string, unknown>[]): Promise<void> {
    const cloudIds = new Set(cloud.map((e) => e.id));
    const local = await deps.localEvents();
    const backlog = local
      .filter((e) => e.receivedAt === undefined && !cloudIds.has(e.id))
      .sort(compareCanonical);
    if (backlog.length > 0) {
      for (const e of backlog) deps.enqueue(e);
      void deps.flush(); // push un-synced local work UP (empty-cloud + reload-stranding)
    }
    // Pull peer work DOWN. Track "had no effect" ONLY for the backlog: the genuinely
    // un-uploaded work is surfaced if it lost while offline; the history the pass replays
    // (and, once, the post-upgrade re-sort of stamped/legacy rows) is not.
    if (cloud.length > 0) {
      await deps.reconcile(cloud, { trackOverridden: true, onlyIds: new Set(backlog.map((e) => e.id)) });
    }
  }

  async function pass(cloud: Record<string, unknown>[]): Promise<void> {
    if (!firstMergeDone) {
      await firstMerge(cloud);
      firstMergeDone = true; // only after success — a failed first merge retries as one
    } else {
      await deps.reconcile(cloud, { trackOverridden: true });
    }
  }

  function schedule(cloud: Record<string, unknown>[]): void {
    if (running) {
      pending = cloud; // collapse: only the latest full snapshot matters
      return;
    }
    running = true;
    const gen = generation;
    void (async () => {
      let next: Record<string, unknown>[] | null = cloud;
      try {
        while (next && gen === generation) {
          pending = null;
          try {
            await pass(next);
          } catch (err) {
            // Never wedge the listener: log and move on to the next snapshot.
            console.warn('FieldShore: event reconcile failed', err);
          }
          next = pending;
        }
      } finally {
        if (gen === generation) running = false;
      }
    })();
  }

  return {
    start() {
      if (unsub) return; // idempotent (StrictMode double-start)
      const dept = deps.deptId();
      if (!dept) return; // guest → no cloud listener
      generation++;
      running = false;
      pending = null;
      firstMergeDone = false;
      index.clear(); // a previous department's ids must never vouch for this one's uploads
      unsub = subscribe(`orgs/${dept}/events`, (snap) => {
        const cloud = flatten(snap);
        index.replace(entriesOf(cloud)); // FIRST — a flush awaiting its ack reads this
        schedule(cloud);
      });
    },
    stop() {
      unsub?.();
      unsub = null;
      generation++;
      running = false;
      pending = null;
      firstMergeDone = false;
      index.clear();
    },
  };
}

/** The app's singleton, wired to the active bucket's log + the sync service. */
export const eventListenerSync = createEventListenerSync({
  deptId: () => sessionStore.store.getState().departmentId,
  localEvents: () => operationStore.sortedEvents(),
  reconcile: (cloud, opts) => syncService.reconcile(cloud, opts),
  enqueue: (event) => syncService.enqueue(event),
  flush: () => syncService.flush(),
});

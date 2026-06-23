import type { FieldShoreEvent } from '@core/schema';
import { type OperationStoreApi } from '../store/operationStore';
import { operationStore } from '../store/registry';
import { sessionStore } from '../store/session';

// data/sync — the ONE backend path (module-boundaries.md). Cloud-sync Increment 2:
// the real event upload + the merge guard. flush() drains the in-memory queue to
// /orgs/{deptId}/events/{opId}/{id} (idempotent set, best-effort, keep-on-failure);
// reconcile() merges incoming peer events through the L-7 guard + the one local
// commit path (the listener in eventListener.ts feeds it).
//
// FIREBASE SEAM — this factory is firebase-FREE on purpose: the transport (`set`)
// and the failure ledger (`log`) are injected, defaulting to thin wrappers that
// LAZILY `import('./firebase')` only when a real upload happens. So importing this
// module never initializes Firebase, and unit tests inject fakes (no mock plumbing).
//
// NOTE — data/store ↔ data/sync is a function-level-only import cycle (store calls
// enqueue; reconcile calls store.commit). The singleton below takes LAZY accessors
// (ops, deptId) so neither module touches the other's binding during init.

/** Default transport — only loaded (and only touches Firebase) on a real upload. */
async function firebaseSet(path: string, value: unknown): Promise<void> {
  const { rtdb, ref, set } = await import('./firebase');
  await set(ref(rtdb, path), value);
}

/** Default failure ledger — lazy for the same reason (L-8, never throws). */
function firebaseLog(event: string, detail: Record<string, unknown>): void {
  void import('./diagnostics').then(({ logSyncEvent }) => logSyncEvent(event, detail));
}

export type RowSyncState = 'queued' | 'synced';

export interface ReconcileResult {
  applied: FieldShoreEvent[];
  dropped: FieldShoreEvent[];
}

export interface SyncServiceApi {
  /** Queue a locally-committed event for upload. Returns immediately (L-4). */
  enqueue(event: FieldShoreEvent): void;
  /** Drain the queue to the cloud (best-effort): set each event at its path, drop it
   *  on success, keep it on failure. No-op when guest/offline. One drain at a time. */
  flush(): Promise<void>;
  /** Merge incoming peer events through the L-7 guard + the local commit path. */
  reconcile(incoming: FieldShoreEvent[]): Promise<ReconcileResult>;
  /** Per-row sync state for the repo hooks (staleness is life-safety — ADR-024). */
  getRowSyncState(eventId: string): RowSyncState;
  pendingCount(): number;
}

export function createSyncService(deps: {
  ops: () => OperationStoreApi;
  /** The active department id (null/guest ⇒ no cloud sync). Lazy, like `ops`. */
  deptId: () => string | null;
  /** Cloud write transport — injected so tests stay firebase-free (default: RTDB set). */
  set?: (path: string, value: unknown) => Promise<void>;
  /** Failure ledger — injected for the same reason (default: /diagnostics/sync). */
  log?: (event: string, detail: Record<string, unknown>) => void;
}): SyncServiceApi {
  const queue: FieldShoreEvent[] = [];
  const set = deps.set ?? firebaseSet;
  const log = deps.log ?? firebaseLog;
  let flushing = false; // one drain at a time — post-commit + reconnect must not race

  return {
    enqueue(event) {
      // Dedup by id: a backlog rebuild (eventListener.firstMerge) can re-enqueue an
      // event already queued this session; with the append-only cloud rule a second
      // upload of the same id would be rejected and wedge the queue.
      if (!queue.some((e) => e.id === event.id)) queue.push(event);
    },

    async flush() {
      if (flushing) return;
      const dept = deps.deptId();
      if (!dept) return; // guest / no department → nothing to sync
      flushing = true;
      try {
        // Re-drain until the queue is empty or a whole pass makes no progress. Events
        // enqueued DURING a pass's awaits — a commit mid-drain, or a grouped commitMany
        // emitting N events — would otherwise strand until an unrelated later trigger.
        // The no-progress break stops a spin on persistent (e.g. offline) failures.
        while (queue.length > 0) {
          let progress = false;
          for (const event of [...queue]) {
            const path = `orgs/${dept}/events/${event.opId}/${event.id}`;
            try {
              await set(path, event); // create-only set keyed by event.id (append-only cloud rule)
              const i = queue.indexOf(event);
              if (i !== -1) {
                queue.splice(i, 1); // success → 'queued' flips to 'synced'
                progress = true;
              }
            } catch (err) {
              log('flush-failed', { path, id: event.id, reason: String(err) });
              // keep it queued for the next trigger (reconnect / next commit) — best-effort
            }
          }
          if (!progress) break; // every remaining event failed this pass — retry later
        }
      } finally {
        flushing = false;
      }
    },

    async reconcile(incoming) {
      const ops = deps.ops();
      const applied: FieldShoreEvent[] = [];
      const dropped: FieldShoreEvent[] = [];

      // Apply in causal (`at`) order, NOT the cloud snapshot's key order — RTDB returns
      // the {opId}/{eventId} children in random-UUID key order, so an out-of-order status
      // chain would otherwise apply scrambled. `at` is the event clock; `id` is a stable
      // tiebreaker for same-ms events (a grouped add emits N at one `at`).
      const ordered = [...incoming].sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

      for (const event of ordered) {
        // L-7 merge guard: a peer ShorePointStatusChanged applies ONLY when premised on
        // our EXACT current status (a deliberate step-back is from===current too, ADR-010).
        // If the point isn't here yet, OR we're ahead of OR BEHIND event.from, DROP it
        // WITHOUT committing — committing a status change the reducer will no-op still
        // durably appends the row and consumes its &id, permanently stranding the
        // transition. onValue re-delivers the whole-dept snapshot, so it re-applies once
        // we reach event.from (e.g. after the missing intermediate edge arrives).
        if (event.type === 'ShorePointStatusChanged') {
          const local = ops.store.getState().shorePoints.find((sp) => sp.id === event.spId);
          if (!local || local.status !== event.from) {
            dropped.push(event);
            continue;
          }
        }

        // Survivors go through the SAME commit path as local mutations (one write path,
        // L-4) — fromRemote stops the re-enqueue echo. A duplicate event id fails the
        // log's unique index and lands in `dropped`.
        const result = await ops.commit(event, { fromRemote: true });
        (result.ok ? applied : dropped).push(event);
      }

      return { applied, dropped };
    },

    getRowSyncState(eventId) {
      return queue.some((e) => e.id === eventId) ? 'queued' : 'synced';
    },

    pendingCount() {
      return queue.length;
    },
  };
}

/** The app's singleton sync service, lazily bound to the singleton store + session. */
export const syncService = createSyncService({
  ops: () => operationStore,
  deptId: () => sessionStore.store.getState().departmentId,
});

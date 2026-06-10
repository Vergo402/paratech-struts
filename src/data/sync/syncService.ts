import type { FieldShoreEvent } from '@core/schema';
import { isAfter } from '@core/shorepoint';
import { operationStore, type OperationStoreApi } from '../store/operationStore';

// data/sync — the ONE backend path (module-boundaries.md). This slice ships it
// as a STUB behind the real seam (scope decision 1, settled with Alex
// 2026-06-10): the method signatures and the L-7 merge guard are real; the
// transport is a no-op. The real Firebase session (a later session) replaces
// flush()/the listener wiring without touching any caller — that is the point
// of the seam. L-5 (Zod→rules generation) and L-6 (listener teardown +
// empty-first-snapshot guard) land with it.
//
// NOTE — data/store ↔ data/sync is a function-level-only import cycle (store
// calls enqueue; reconcile calls store.commit). The singleton below takes a
// LAZY accessor so neither module touches the other's binding during init.

export type RowSyncState = 'queued' | 'synced';

export interface ReconcileResult {
  applied: FieldShoreEvent[];
  dropped: FieldShoreEvent[];
}

export interface SyncServiceApi {
  /** Queue a locally-committed event for upload. Returns immediately (L-4). */
  enqueue(event: FieldShoreEvent): void;
  /** STUB — the real session writes the queue to RTDB events/{opId}/ and clears it. */
  flush(): Promise<void>;
  /** Merge incoming peer events through the L-7 guard + the local commit path. */
  reconcile(incoming: FieldShoreEvent[]): Promise<ReconcileResult>;
  /** Per-row sync state for the repo hooks (staleness is life-safety — ADR-024). */
  getRowSyncState(eventId: string): RowSyncState;
  pendingCount(): number;
}

export function createSyncService(deps: { ops: () => OperationStoreApi }): SyncServiceApi {
  const queue: FieldShoreEvent[] = [];

  return {
    enqueue(event) {
      queue.push(event);
    },

    async flush() {
      // No-op by design (scope decision 1). Queued events stay 'queued' until
      // the Firebase session implements the upload + the L-5/L-6 disciplines.
    },

    async reconcile(incoming) {
      const ops = deps.ops();
      const applied: FieldShoreEvent[] = [];
      const dropped: FieldShoreEvent[] = [];

      for (const event of incoming) {
        // L-7 merge guard — built for real NOW: an incoming peer status change
        // PREMISED on state older than ours (the peer hadn't seen our advance —
        // the v3 stale-listener regression class) is dropped, keeping it out of
        // our log entirely. The comparison is against event.from, not event.to:
        // a peer move premised on our exact current status — including a
        // deliberate step-back — is legal under ADR-010 and applies.
        if (event.type === 'ShorePointStatusChanged') {
          const local = ops.store.getState().shorePoints.find((sp) => sp.id === event.spId);
          if (local && isAfter(local.status, event.from)) {
            dropped.push(event);
            continue;
          }
        }

        // Survivors go through the SAME commit path as local mutations (one
        // write path, L-4) — fromRemote stops the re-enqueue echo. A duplicate
        // event id fails the log's unique index and lands in `dropped`.
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

/** The app's singleton sync service, lazily bound to the singleton store. */
export const syncService = createSyncService({ ops: () => operationStore });

import type { FieldShoreEvent } from '@core/schema';
import { type OperationStoreApi } from '../store/operationStore';
import { operationStore } from '../store/registry';
import { sessionStore } from '../store/session';
import { syncStatusStore } from './syncStatus';
import { peerCutStore } from './peerCuts';
import { cloudIndex, type CloudIndex } from './cloudIndex';
// Type-only (erased at build) — importing the diagnostics VALUE here would drag
// Firebase into module init, which the seam below deliberately avoids.
import type { SyncDiagnosticDetail } from './diagnostics';

// data/sync — the ONE backend path (module-boundaries.md) for the operation event log.
// ADR-041 (#499): every device folds the log in one canonical order keyed by the cloud's
// receipt time, `(receivedAt ?? +∞, at, id)`.
//
// UPLOAD (flush) — strictly in commit order, every event carrying
// `receivedAt: serverTimestamp()` (the rules require `receivedAt == now`). Throughput path:
// up to CHUNK_SIZE queued events go up as ONE multi-path update() at /orgs/{deptId}/events
// with `${opId}/${id}` keys — atomic, one server stamp, `(at, id)` ordering inside it (the
// per-device clock makes `at` strictly increasing); a `batchId` group is never split across
// two chunks. If a chunk is rejected, the pass falls back to head groups — a single event via
// a create-only set() at /events/{opId}/{id}, a batch via one update() under /events/{opId} —
// which isolates the first bad write and stops there. When a write resolves, the server stamp
// is read from the cloud snapshot index (the SDK raises the acknowledged snapshot — with the
// REAL server value — before the write promise resolves; fallback: a one-shot get), stamped
// onto the local copy (ops.markReceived), and only then dequeued. A failure stops the pass and
// schedules ONE backoff retry (5 s → 15 s → 60 s); the next trigger resumes from the head, so
// upload order = commit order. A rejected write whose ids the snapshot index already holds
// landed earlier and lost its ack (create-only rules reject the re-upload) — it is synced.
//
// MERGE (reconcile) — the listener hands over the ENTIRE department snapshot each time.
// Unknown ids go to ops.ingestRemote (appended unconditionally; the pure reducers no-op a
// losing branch identically on every device — no premise drop). Known ids only ever gain a
// receipt stamp. ECHO GATE: the SDK raises a snapshot for this device's own set() at once,
// with an ESTIMATED server time; while that id is still in the upload queue its snapshot
// stamp is ignored — only the flush, after the server acknowledges, stamps it.
//
// FIREBASE SEAM — this factory is firebase-FREE on purpose: the transports (set / update /
// get) and the failure ledger (log) are injected, defaulting to thin wrappers that LAZILY
// `import('./firebase')` only when a real upload happens. The server-timestamp sentinel is
// the literal `{ '.sv': 'timestamp' }` (exactly what firebase/database serverTimestamp()
// returns) so building an upload never loads the SDK either. Unit tests inject fakes.
//
// NOTE — data/store ↔ data/sync is a function-level-only import cycle (store calls
// enqueue; reconcile calls the store). The singleton below takes LAZY accessors
// (ops, deptId) so neither module touches the other's binding during init.

/**
 * Ack-time stamping ALWAYS tracks overridden changes: a queued id is by definition this
 * device's un-uploaded work, never history. If an ack lands mid-way through the first merge
 * and folds the event against a half-stamped log (a transient no-effect), the merge tracks
 * the same ids (its `onlyIds` backlog), so the later flip back to applied removes it again.
 */
const ACK_TRACKING = { trackOverridden: true } as const;

/** Events per multi-path chunk upload (a batch group is never split across two). */
export const CHUNK_SIZE = 100;
/** Backoff before the single scheduled retry after a failed pass (the last value repeats). */
export const RETRY_DELAYS_MS = [5_000, 15_000, 60_000] as const;

/** RTDB's server-timestamp placeholder — the value `serverTimestamp()` returns. */
export const SERVER_TIMESTAMP: Readonly<{ '.sv': 'timestamp' }> = Object.freeze({ '.sv': 'timestamp' });

/** Default transport — only loaded (and only touches Firebase) on a real upload. */
async function firebaseSet(path: string, value: unknown): Promise<void> {
  const { rtdb, ref, set } = await import('./firebase');
  await set(ref(rtdb, path), value);
}

/** Default multi-path transport (a batch upload) — lazy for the same reason. */
async function firebaseUpdate(path: string, values: Record<string, unknown>): Promise<void> {
  const { rtdb, ref, update } = await import('./firebase');
  await update(ref(rtdb, path), values);
}

/** Default one-shot read (the ack fallback) — lazy for the same reason. */
async function firebaseGet(path: string): Promise<unknown> {
  const { rtdb, ref, get } = await import('./firebase');
  return (await get(ref(rtdb, path))).val();
}

/** Default failure ledger — lazy for the same reason (L-8, never throws). */
function firebaseLog(event: string, detail: SyncDiagnosticDetail): void {
  void import('./diagnostics').then(({ logSyncEvent }) => logSyncEvent(event, detail));
}

/**
 * Firebase RTDB `set` REJECTS any value containing `undefined` (an unfilled optional
 * field — e.g. OperationCreated.location, an untracked BOM component's inventoryId).
 * A JSON round-trip drops undefined-valued keys recursively (the absent-key convention
 * RTDB wants), losslessly for the rest (events are plain Zod data — no Dates/functions).
 * Done at the upload boundary, not the emit sites, so no event constructor can forget it.
 */
function stripUndefined(event: FieldShoreEvent): Record<string, unknown> {
  return JSON.parse(JSON.stringify(event)) as Record<string, unknown>;
}

/** The wire form of a queued event: undefined stripped, the server stamp requested. */
function toWire(event: FieldShoreEvent): Record<string, unknown> {
  return { ...stripUndefined(event), receivedAt: SERVER_TIMESTAMP };
}

/** Same undefined-stripping for the non-event state path (Increment 3 setState). */
function jsonClean(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

/** A finite number, or undefined (a cloud value is untrusted data). */
function stampOf(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/** The PAR/pending-sync indicator's resource key (#352) — `ref:value`, matching the
 *  same key CommandRail's roster already builds. A queued ResourceCleared with no
 *  `resource` (clear-ALL-on-position) can't be attributed to one resource — skipped,
 *  not counted, rather than guessed. */
function pendingResourceKeyOf(event: FieldShoreEvent): string | null {
  if (event.type === 'ResourceAssigned') return `${event.resource.ref}:${event.resource.value}`;
  if (event.type === 'ResourceCleared' && event.resource) return `${event.resource.ref}:${event.resource.value}`;
  return null;
}

export type RowSyncState = 'queued' | 'synced';

export interface ReconcileOptions {
  /** Record this device's own events that flip applied → no-effect in the store's
   *  `overridden` list. Default true. */
  trackOverridden?: boolean;
  /** Restrict that tracking to these ids. Set ONLY by the first merge after boot: it
   *  passes the un-uploaded backlog, so own work that lost while the device was offline
   *  (and reloaded) is surfaced, while the history it replays — and, once, the re-sort of a
   *  pre-ADR-041 log — is not. Its presence also marks the pass as the first merge, which
   *  never feeds the #404 peer-cut badge (history, not news). */
  onlyIds?: ReadonlySet<string>;
}

export interface ReconcileResult {
  /** Peer events newly appended to the log by this pass (canonical order). */
  inserted: FieldShoreEvent[];
  /** The inserted events whose fold outcome is `applied` (the rest folded as no effect). */
  applied: FieldShoreEvent[];
  /** Known ids that gained their receipt stamp in this pass. */
  stamped: string[];
}

export interface SyncServiceApi {
  /** Queue a locally-committed event for upload. Returns immediately (L-4). */
  enqueue(event: FieldShoreEvent): void;
  /** Drain the queue to the cloud strictly in commit order (see the header). No-op when
   *  guest. One drain at a time; a failure stops the pass and the next trigger resumes. */
  flush(): Promise<void>;
  /** Merge the ENTIRE department snapshot (see the header). */
  reconcile(cloud: readonly unknown[], opts?: ReconcileOptions): Promise<ReconcileResult>;
  /** Is this event still waiting for its upload acknowledgment? */
  isPending(eventId: string): boolean;
  /** Per-row sync state for the repo hooks (staleness is life-safety — ADR-024). */
  getRowSyncState(eventId: string): RowSyncState;
  pendingCount(): number;
  /** Distinct apparatus/individual resource keys with a queued (not-yet-synced)
   *  assignment change — the PAR/pending-sync indicator's data source (#352). */
  pendingResourceKeys(): Set<string>;
  /** Push a non-event STATE record (cloud-sync Increment 3) to orgs/{deptId}/{relPath}
   *  — an LWW overwrite (not the append-only event queue). Best-effort, guest-guarded,
   *  strips undefined. Fire-and-forget: callers void the promise. */
  setState(relPath: string, value: unknown): Promise<void>;
}

export function createSyncService(deps: {
  ops: () => OperationStoreApi;
  /** The active department id (null/guest ⇒ no cloud sync). Lazy, like `ops`. */
  deptId: () => string | null;
  /** This device's uid — a peer cutting-arrival is one NOT by this device (#404). Lazy;
   *  defaults to the session store. */
  deviceUid?: () => string | null | undefined;
  /** Cloud write transport — injected so tests stay firebase-free (default: RTDB set). */
  set?: (path: string, value: unknown) => Promise<void>;
  /** Multi-path write at `path` (a chunk or batch upload; default: RTDB update). */
  update?: (path: string, values: Record<string, unknown>) => Promise<void>;
  /** One-shot read — the ack fallback when the snapshot index lacks the stamp (default: RTDB get). */
  get?: (path: string) => Promise<unknown>;
  /** The latest cloud snapshot index (default: the app singleton the event listener fills). */
  cloud?: CloudIndex;
  /** Failure ledger — injected for the same reason (default: /diagnostics/sync). */
  log?: (event: string, detail: SyncDiagnosticDetail) => void;
  /** Reactive pending-count sink (cloud-sync Increment 4 banner). Injected so unit tests
   *  stay store-free; defaults to the syncStatus singleton. */
  notifyPending?: (count: number) => void;
  /** Reactive "uploads are stuck" sink (Increment 4 banner). True after a flush leaves
   *  changes queued on failure; false once the queue drains. Injected; defaults to the store. */
  notifyError?: (stuck: boolean) => void;
  /** Reactive "N cuts arrived from a peer" sink (#404 Cutting Station badge). Called with
   *  the count of newly arrived peer cutting moves per reconcile. Injected; defaults to the store. */
  notifyRemoteCuts?: (count: number) => void;
  /** Reactive PAR/pending-sync count sink (#352 Command chrome). Injected so unit tests
   *  stay store-free; defaults to the syncStatus singleton. */
  notifyPendingResources?: (count: number) => void;
  /** Timer seam for the failure backoff retry (default: the global timers). */
  timers?: { setTimeout: (fn: () => void, ms: number) => unknown; clearTimeout: (handle: unknown) => void };
}): SyncServiceApi {
  const queue: FieldShoreEvent[] = [];
  const queuedIds = new Set<string>(); // O(1) membership for the echo gate / row state
  const set = deps.set ?? firebaseSet;
  const update = deps.update ?? firebaseUpdate;
  const get = deps.get ?? firebaseGet;
  const cloud = deps.cloud ?? cloudIndex;
  const log = deps.log ?? firebaseLog;
  const deviceUid = deps.deviceUid ?? (() => sessionStore.store.getState().deviceUid);
  const notifyPending = deps.notifyPending ?? ((count) => syncStatusStore.setPending(count));
  const notifyError = deps.notifyError ?? ((stuck) => syncStatusStore.setSyncError(stuck));
  const notifyRemoteCuts = deps.notifyRemoteCuts ?? ((count) => peerCutStore.add(count));
  const notifyPendingResources =
    deps.notifyPendingResources ?? ((count) => syncStatusStore.setPendingResourceCount(count));
  const computePendingResourceKeys = (): Set<string> => {
    const keys = new Set<string>();
    for (const event of queue) {
      const key = pendingResourceKeyOf(event);
      if (key) keys.add(key);
    }
    return keys;
  };
  // After every queue mutation — both the raw event count (existing banner) and the
  // distinct-resource count (#352) move together, from the same queue snapshot.
  const emitPending = () => {
    notifyPending(queue.length);
    notifyPendingResources(computePendingResourceKeys().size);
  };
  const isQueued = (id: string) => queuedIds.has(id);
  let flushing = false; // one drain at a time — post-commit + reconnect must not race

  // Failure backoff: after a pass that stops on a rejected write, ONE delayed retry is
  // scheduled (5 s → 15 s → 60 s, capped), reset after any successful upload and cleared on
  // a full drain. Commits and the window 'online' event keep triggering flush() as well. The
  // head is never skipped or reordered — upload order = commit order is the invariant.
  const timers = deps.timers ?? {
    setTimeout: (fn: () => void, ms: number): unknown => globalThis.setTimeout(fn, ms),
    clearTimeout: (h: unknown) => globalThis.clearTimeout(h as ReturnType<typeof globalThis.setTimeout>),
  };
  let retryHandle: unknown = null;
  let backoffStep = 0;
  function scheduleRetry(): void {
    if (retryHandle !== null) return;
    const ms = RETRY_DELAYS_MS[Math.min(backoffStep, RETRY_DELAYS_MS.length - 1)]!;
    backoffStep++;
    retryHandle = timers.setTimeout(() => {
      retryHandle = null;
      void api.flush();
    }, ms);
  }
  function clearRetry(): void {
    if (retryHandle !== null) timers.clearTimeout(retryHandle);
    retryHandle = null;
  }

  /** The head of the queue plus every consecutive event of the same batch (and op — the
   *  multi-path write is rooted at one op's event list). */
  function headGroup(): FieldShoreEvent[] {
    const head = queue[0]!;
    const group = [head];
    if (head.batchId === undefined) return group;
    for (let i = 1; i < queue.length; i++) {
      const e = queue[i]!;
      if (e.batchId !== head.batchId || e.opId !== head.opId) break;
      group.push(e);
    }
    return group;
  }

  /** The server stamp for an acknowledged upload: the snapshot index first (the SDK has
   *  raised the acked snapshot by now), else a one-shot read. Undefined when neither
   *  answers — the event still counts as synced, and the next reconcile stamps it (a known,
   *  un-queued id with no local stamp). */
  async function serverStamp(id: string, path: string): Promise<number | undefined> {
    const indexed = cloud.receivedAt(id);
    if (indexed !== undefined) return indexed;
    try {
      const v = await get(path);
      return v && typeof v === 'object' ? stampOf((v as { receivedAt?: unknown }).receivedAt) : undefined;
    } catch {
      return undefined;
    }
  }

  function dequeue(group: readonly FieldShoreEvent[]): void {
    const ids = new Set(group.map((e) => e.id));
    for (let i = queue.length - 1; i >= 0; i--) if (ids.has(queue[i]!.id)) queue.splice(i, 1);
    for (const id of ids) queuedIds.delete(id);
    emitPending();
  }

  /** The next chunk from the head: up to CHUNK_SIZE events, cut back so a batchId group
   *  never straddles two chunks (a single group larger than a chunk goes up whole). */
  function nextChunk(): FieldShoreEvent[] {
    let end = Math.min(queue.length, CHUNK_SIZE);
    if (end < queue.length) {
      const b = queue[end]!.batchId;
      if (b !== undefined && queue[end - 1]!.batchId === b) {
        let start = end - 1;
        while (start > 0 && queue[start - 1]!.batchId === b) start--;
        if (start > 0) end = start;
        else while (end < queue.length && queue[end]!.batchId === b) end++;
      }
    }
    return queue.slice(0, end);
  }

  /** Stamp every acked event (index first, then a one-shot read), then dequeue them. */
  async function stampAndDequeue(dept: string, events: readonly FieldShoreEvent[]): Promise<void> {
    try {
      // Stamp BEFORE dequeue: while the id is queued, reconcile ignores the snapshot's
      // estimate for it (the echo gate); once dequeued, the local copy already carries the
      // server's value.
      for (const e of events) {
        const stamp = await serverStamp(e.id, `orgs/${dept}/events/${e.opId}/${e.id}`);
        if (stamp !== undefined) await deps.ops().markReceived(e.id, stamp, ACK_TRACKING);
      }
    } catch (err) {
      // The write landed; a local stamping failure must not re-upload it. Dequeue anyway —
      // the next reconcile stamps it from the snapshot.
      const head = events[0]!;
      log('flush-stamp-failed', { path: `orgs/${dept}/events/${head.opId}/${head.id}`, id: head.id, reason: String(err) });
    }
    dequeue(events);
  }

  /** A rejected write whose events the latest snapshot ALL holds landed earlier and lost its
   *  ack (create-only rules reject the re-upload). On a rejected write the SDK reverts its
   *  optimistic copy and raises that snapshot BEFORE rejecting, so the index reflects the
   *  server here, not our own echo. */
  async function settleLostAck(events: readonly FieldShoreEvent[]): Promise<boolean> {
    if (!events.every((e) => cloud.has(e.id))) return false;
    try {
      for (const e of events) {
        const stamp = cloud.receivedAt(e.id);
        if (stamp !== undefined) await deps.ops().markReceived(e.id, stamp, ACK_TRACKING);
      }
    } catch {
      // stamping is best-effort here — the next reconcile stamps a known, un-queued id
    }
    dequeue(events);
    return true;
  }

  /** Upload one chunk as ONE multi-path update at /events with `${opId}/${id}` keys (one
   *  server stamp; `(at, id)` orders inside it). True = synced; false = rejected (the
   *  caller falls back to head groups to isolate the bad write). */
  async function uploadChunk(dept: string, chunk: readonly FieldShoreEvent[]): Promise<boolean> {
    try {
      await update(`orgs/${dept}/events`, Object.fromEntries(chunk.map((e) => [`${e.opId}/${e.id}`, toWire(e)])));
    } catch {
      return settleLostAck(chunk);
    }
    await stampAndDequeue(dept, chunk);
    return true;
  }

  /** Upload one head group. True = synced and dequeued; false = stop this pass. */
  async function uploadGroup(dept: string, group: readonly FieldShoreEvent[]): Promise<boolean> {
    const head = group[0]!;
    const opPath = `orgs/${dept}/events/${head.opId}`;
    const pathOf = (e: FieldShoreEvent) => `${opPath}/${e.id}`;
    try {
      if (group.length === 1) {
        await set(pathOf(head), toWire(head));
      } else {
        await update(opPath, Object.fromEntries(group.map((e) => [e.id, toWire(e)])));
      }
    } catch (err) {
      if (await settleLostAck(group)) return true;
      log('flush-failed', { path: pathOf(head), id: head.id, reason: String(err) });
      return false; // keep it (and everything after it) for the next trigger
    }
    await stampAndDequeue(dept, group);
    return true;
  }

  const api: SyncServiceApi = {
    enqueue(event) {
      // Dedup by id: a backlog rebuild (eventListener.firstMerge) can re-enqueue an
      // event already queued this session; with the append-only cloud rule a second
      // upload of the same id would be rejected.
      if (!queuedIds.has(event.id)) {
        queue.push(event);
        queuedIds.add(event.id);
      }
      emitPending();
    },

    async flush() {
      if (flushing) return;
      const dept = deps.deptId();
      if (!dept) return; // guest / no department → nothing to sync
      flushing = true;
      let failed = false;
      try {
        // Strictly from the head. Throughput path: a chunk of up to CHUNK_SIZE events goes
        // up as ONE multi-path update (one server stamp; `at` is strictly increasing per
        // device, so `(at, id)` keeps commit order inside it). If a chunk is rejected, the
        // rest of the pass falls back to one head group at a time, which isolates the first
        // genuinely bad write and stops there — nothing ever uploads ahead of an earlier
        // commit. Events enqueued during a pass's awaits are picked up by the same loop.
        let chunked = true;
        while (queue.length > 0) {
          if (chunked) {
            const chunk = nextChunk();
            if (chunk.length > headGroup().length) {
              if (await uploadChunk(dept, chunk)) {
                backoffStep = 0;
                continue;
              }
              chunked = false; // isolate the bad write below
            }
          }
          if (!(await uploadGroup(dept, headGroup()))) {
            failed = true;
            break;
          }
          backoffStep = 0;
        }
        // Stuck iff changes remain after the drain (writes are failing, not progressing) —
        // the banner shows "couldn't sync, retrying" instead of a forever-"Syncing…".
        notifyError(queue.length > 0);
        if (queue.length === 0) {
          clearRetry();
          backoffStep = 0;
        } else if (failed) {
          scheduleRetry();
        }
      } finally {
        flushing = false;
      }
    },

    async reconcile(snapshot, opts) {
      const ops = deps.ops();
      const track = opts?.trackOverridden !== false;
      const firstMerge = opts?.onlyIds !== undefined;
      // On the first merge, track the un-uploaded backlog the listener named PLUS whatever
      // this device committed since (it sits in the upload queue until acked) — an own event
      // committed while the merge was running is just as much "your change" as the backlog.
      const onlyIds = opts?.onlyIds === undefined ? undefined : new Set([...opts.onlyIds, ...queuedIds]);
      const ingestOpts = { trackOverridden: track, onlyIds };

      // Split by id, synchronously, before any await (the queue can drain mid-pass).
      const fresh: unknown[] = [];
      const toStamp: { id: string; receivedAt: number; at: number }[] = [];
      for (const raw of snapshot) {
        const id = raw && typeof raw === 'object' ? (raw as { id?: unknown }).id : undefined;
        if (typeof id !== 'string' || !ops.has(id)) {
          fresh.push(raw); // ingestRemote parses: an invalid record is dropped (and warned) there
          continue;
        }
        // ECHO GATE — an own event still awaiting its upload ack: the snapshot's stamp is
        // the SDK's local estimate, never the server's. The flush stamps it after the ack.
        if (isQueued(id)) continue;
        // Events are create-only in the cloud, so a stamp, once on the local copy, is final.
        const local = ops.get(id);
        if (!local || local.receivedAt !== undefined) continue;
        // Un-stamped and not queued: an own event acked in an earlier session (or whose ack
        // carried no readable stamp), or a pre-ADR-041 row. Prefer the LATEST index value
        // over this (possibly older) snapshot; a legacy cloud event folds at its `at`, the
        // same normalization ingestRemote applies to a fresh one.
        const r = raw as { receivedAt?: unknown; at?: unknown };
        const stamp = cloud.receivedAt(id) ?? stampOf(r.receivedAt) ?? local.at;
        toStamp.push({ id, receivedAt: stamp, at: local.at });
      }

      // Stamp in canonical order of the new key so each lands at the end of its op's
      // received tier (an incremental fold, not a re-fold per event).
      toStamp.sort((a, b) => a.receivedAt - b.receivedAt || a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      const stamped: string[] = [];
      for (const s of toStamp) {
        await ops.markReceived(s.id, s.receivedAt, ingestOpts);
        stamped.push(s.id);
      }

      if (fresh.length === 0) return { inserted: [], applied: [], stamped };
      const { inserted, outcomes } = await ops.ingestRemote(fresh, ingestOpts);
      const applied = inserted.filter((e) => outcomes.get(e.id) === 'applied');

      // #404 — a PEER moved a shore point INTO the cutting queue: the "someone sent you
      // work" signal. Only newly inserted, applied arrivals from another device count —
      // never a re-delivered snapshot, never a later outcome flip of an old arrival, never
      // the first merge after boot (that is history, not news).
      if (track && !firstMerge) {
        const me = deviceUid();
        const arrivals = applied.filter(
          (e) => e.type === 'ShorePointStatusChanged' && e.to === 'cutting' && e.by !== me,
        ).length;
        if (arrivals > 0) notifyRemoteCuts(arrivals);
      }

      return { inserted, applied, stamped };
    },

    isPending: isQueued,

    getRowSyncState(eventId) {
      return isQueued(eventId) ? 'queued' : 'synced';
    },

    pendingCount() {
      return queue.length;
    },

    pendingResourceKeys() {
      return computePendingResourceKeys();
    },

    async setState(relPath, value) {
      const dept = deps.deptId();
      if (!dept) return; // guest / no department → nothing to sync
      const path = `orgs/${dept}/${relPath}`;
      try {
        await set(path, jsonClean(value)); // LWW overwrite; the cloud rule guards monotonic lastWriteAt
      } catch (err) {
        log('state-write-failed', { path, reason: String(err) }); // best-effort (the listener re-pushes on next merge)
      }
    },
  };
  return api;
}

/** The app's singleton sync service, lazily bound to the singleton store + session. */
export const syncService = createSyncService({
  ops: () => operationStore,
  deptId: () => sessionStore.store.getState().departmentId,
});

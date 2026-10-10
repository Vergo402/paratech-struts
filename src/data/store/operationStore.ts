import Dexie, { type BulkError } from 'dexie';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { FieldShoreEvent, type DeployedComponentRole, type InventoryItem, type StockRow } from '@core/schema';
import { deployVerdict } from '@core/shorepoint';
import { roleHistory } from '@core/org';
import { newId } from '@core/id';
import { createMonotonicClock, type MonotonicClock } from '@core/clock';
import {
  createEventLog,
  projectOperationById,
  projectArchive,
  shorePointHistory,
  isTellWorthy,
  type HeldCounts,
  type OperationState,
  type ArchivedOperationSummary,
  type Outcome,
} from '@core/operation';
import { stampReceivedAt, type FieldShoreDB } from './db';
import { createInventoryStore, type InventoryStoreApi } from './inventoryStore';

// The only legal mutation entry (module-boundaries.md, data/store). ADR-041:
//
// - ONE canonical order on every device. An in-memory EventLog (core/operation/eventLog)
//   holds every event of this bucket sorted by `(receivedAt ?? +∞, at, id)` and folds it
//   per operation; it is the truth for every read (hot state AND cold reads). Dexie is the
//   durable store only — `seq` is its primary key, not the fold order.
// - A LOCAL commit = validate → stamp `at` from the per-device monotonic clock → a
//   read-only pre-flight (user-error prevention, localCommitGuard) → durable Dexie append
//   → THEN the in-memory insert + re-render → THEN the sync enqueue (L-4: subscribers see
//   it only after the durable write lands). A local event is PROVISIONAL (no receivedAt)
//   until the sync layer stamps the cloud receipt time (markReceived).
// - A PEER event (ingestRemote) is appended unconditionally once it parses: the reducers
//   no-op a losing branch deterministically, identically on every device, and the outcome
//   map records it. No pre-flight, no premise drop — dropping is what let two devices hold
//   different event sets (#499).
// - Stock is DERIVED: `held` comes from the fold and is pushed into the inventory store
//   after every change; no commit path writes a stock row.
//
// NOTE — data/store ↔ data/sync is a function-level-only import cycle (store calls the
// injected enqueue; sync calls operationStore methods). Safe in ESM: neither touches the
// other's binding during module init.

export type CommitResult = { ok: true } | { ok: false; reason: string };

export interface IngestOptions {
  /** Record this device's own events that flipped applied → no-effect in `overridden`.
   *  Default true. */
  trackOverridden?: boolean;
  /** When present, only these ids are considered (a flip to no-effect adds, a flip back to
   *  applied removes) — still own-device only. The first merge after boot passes the
   *  un-uploaded backlog here, so the one-time re-sort of history never floods the list
   *  while genuinely new work that lost is still surfaced. */
  onlyIds?: ReadonlySet<string>;
}

export interface IngestResult {
  /** The events actually added to the log (new ids), canonical order. */
  inserted: FieldShoreEvent[];
  /** The outcome of every event after this call. */
  outcomes: ReadonlyMap<string, Outcome>;
  /** Ids already in the log whose outcome flipped in this call. */
  flipped: string[];
}

/** This device's own events that a peer's earlier-received change overrode. */
export interface OverriddenState {
  /** Newest last; deduped by id. */
  events: FieldShoreEvent[];
}

export interface OperationStoreApi {
  store: StoreApi<OperationState>;
  /** A local mutation (see the header). The event's `at` is re-stamped from the device
   *  clock; any `receivedAt` / `batchId` on the input is dropped. */
  commit(event: FieldShoreEvent): Promise<CommitResult>;
  /**
   * Atomic multi-event local commit — a grouped Add Shore Point (#220) lands all N
   * member events as ONE durable batch (all-or-nothing), sharing one `batchId` so every
   * device folds them all-or-nothing too, and one re-render. Plain-append events only;
   * inventory-consequential events (Equipment* deploy/return/reclaim + ComponentResourced)
   * need the per-event pre-flight and commit one at a time. ShorePointDeleted IS accepted
   * and gets the holder pre-flight — a grouped delete must not slip a deployed member
   * through the batch path (#421).
   */
  commitMany(events: FieldShoreEvent[]): Promise<CommitResult>;
  /** Peer events from the cloud: parse (invalid dropped), normalize a legacy missing
   *  `receivedAt` to `at`, dedupe, append durably, fold. Never enqueued. */
  ingestRemote(events: readonly unknown[], opts?: IngestOptions): Promise<IngestResult>;
  /** Stamp the cloud receipt time on a known event (provisional → received). Returns true
   *  when that event's operation had to re-fold its received tier from scratch. */
  markReceived(id: string, receivedAt: number, opts?: IngestOptions): Promise<boolean>;
  /** This device's own events that ended up with no effect (the losing branch). */
  overridden: StoreApi<OverriddenState>;
  /** Clear the overridden list ("Got it"). */
  acknowledgeOverridden(): void;
  /** Every event's fold outcome (snapshot; replaced, never mutated). */
  outcomes(): ReadonlyMap<string, Outcome>;
  /** Units held per inventory row id across every op in the bucket. */
  held(): HeldCounts;
  /** Every event in canonical order (a fresh array). */
  sortedEvents(): FieldShoreEvent[];
  /** Is this event id in the in-memory log? (O(1) — the sync layer's known/fresh split.) */
  has(id: string): boolean;
  /** The logged copy of one event (carries its current `receivedAt`), or undefined. */
  get(id: string): FieldShoreEvent | undefined;
  /** Rebuild in-memory state from the durable log (boot path). */
  boot(): Promise<void>;
  /** Finished-incident summaries, newest-ended first (#238 Past-operations list), plus
   *  superseded ops (lost the active-op race). Reads the in-memory canonical log. */
  readArchive(): Promise<ArchivedOperationSummary[]>;
  /** One operation's folded state by id (#238 read-only archive drill-in). */
  readOperation(opId: string): Promise<OperationState>;
  /** Every logged event touching one shore point, in CANONICAL order — the Quick View
   *  timeline. Includes group-fanned status changes the point moved on even though the
   *  event names only the trigger (#453). The log keeps events after OperationEnded, so
   *  this works for archived points too. */
  readShorePointHistory(spId: string): Promise<FieldShoreEvent[]>;
  /** Org/command role history for one op, canonical order (#323). Omit positionId for
   *  the whole command timeline (the transfer handoff record); pass one for a single
   *  node's history. Works for archived ops too. */
  readRoleHistory(opId: string, positionId?: string): Promise<FieldShoreEvent[]>;
  /** Every event for ONE operation, canonical order — the Audit Log Incident view (#211).
   *  Works for archived ops too. */
  readEventLog(opId: string): Promise<FieldShoreEvent[]>;
}

// The inventory record `type` a deployed component must source from — so a
// re-source can't point a strut slot at a plate row (ADR-033 decision 7 guard).
function roleToType(role: DeployedComponentRole): InventoryItem['type'] {
  return role === 'strut' ? 'strut' : role === 'extension' ? 'extension' : 'plate';
}

const HOLDER_DELETE_REASON = 'cannot delete a shore point holding deployed equipment — return it first';

/** Dexie `meta` row (per department bucket) holding the ids of this device's own events that
 *  lost a race and have not been acknowledged yet — the "had no effect" list is a persistent
 *  quiet state (Principle 10), so it must survive a reload / PWA relaunch until "Got it". */
export const OVERRIDDEN_KEY = 'fieldshore_overridden';

/**
 * The LOCAL commit pre-flight — user-error prevention, read-only, pure. Returns the
 * rejection reason, or null to let the commit proceed. It reads the active op's folded
 * state and the DERIVED stock view (`available = quantity − held`); it never touches
 * Dexie. Peer events never pass through here (ADR-041 — the fold, not a pre-flight,
 * decides a peer event's effect), so this can never make two devices' event sets differ.
 */
export function localCommitGuard(
  state: OperationState,
  event: FieldShoreEvent,
  items: readonly StockRow[],
): string | null {
  const row = (id: string) => items.find((i) => i.id === id);
  switch (event.type) {
    case 'EquipmentDeployed': {
      const sp = state.shorePoints.find((s) => s.id === event.spId);
      if (!sp) return `unknown shore point ${event.spId}`;
      if (sp.status !== 'pending') return 'deploy requires a Pending shore point';
      // The engine's safety verdict lives in the UI gate (RecommendationCard) ABOVE the
      // seam; re-derive it from the point's own inputs so an off-UI local deploy can't
      // commit an assembly the engine flagged. (A PEER deploy is not refused — D4: it folds
      // as deployed and the red capacity flag shows at read time.)
      const verdict = deployVerdict(sp, event.deployedBom);
      if (verdict.noFit) return 'no strut fits this opening at this length';
      if (verdict.exceedsCapacity) return 'deploy exceeds 4-strut capacity for this load';
      if (verdict.unrated && !event.unratedAcknowledged) {
        return 'unrated-zone deploy requires a recorded team acknowledgment';
      }
      if (verdict.overCapacity && !event.overCapacityAcknowledged) {
        return 'over-capacity deploy requires a recorded team acknowledgment';
      }
      // ADR-033 — every TRACKED component must name a real row with a unit to spare. A BOM
      // that sources one row twice claims two units of it (the same-row double claim).
      // Untracked components (no inventoryId) carry no stock consequence.
      const claims = new Map<string, number>();
      for (const c of event.deployedBom) {
        if (c.inventoryId === undefined) continue;
        const r = row(c.inventoryId);
        if (!r) return `inventory item ${c.inventoryId} not found`;
        const claimed = claims.get(r.id) ?? 0;
        if (r.available - claimed <= 0) return `inventory item ${r.id} has none available`;
        claims.set(r.id, claimed + 1);
      }
      return null;
    }
    case 'EquipmentReturned':
    case 'EquipmentReclaimed': {
      // They differ only in the required current status and the status the reducer lands
      // on (return → pending, clears the BOM; reclaim → returned, keeps it as history,
      // #224). No stock row is checked: the hold simply ends in the fold, so a row that
      // was deleted meanwhile cannot strand the return.
      const sp = state.shorePoints.find((s) => s.id === event.spId);
      if (!sp) return `unknown shore point ${event.spId}`;
      const need = event.type === 'EquipmentReturned' ? 'process' : 'secured';
      if (sp.status !== need || !sp.deployedBom) {
        const label = need === 'process' ? 'Equipment Assigned' : 'Wood Shore Secured';
        return `return requires a ${label} shore point with deployed equipment`;
      }
      return null;
    }
    case 'ComponentResourced': {
      // ADR-033 (decision 7) — re-point one deployed component to another rig. Net-zero
      // when the source row is unchanged.
      const sp = state.shorePoints.find((s) => s.id === event.spId);
      if (!sp) return `unknown shore point ${event.spId}`;
      if (!sp.deployedBom) return 're-source requires a deployed shore point';
      // Returned points keep their BOM as history (#224) but no longer hold stock —
      // re-sourcing one would move stock against an already-reclaimed assembly.
      if (sp.status === 'returned') return 'cannot re-source returned equipment';
      const old = sp.deployedBom[event.componentIndex];
      if (!old) return `no component at index ${event.componentIndex}`;
      if (old.inventoryId !== event.inventoryId && event.inventoryId !== undefined) {
        const r = row(event.inventoryId);
        if (!r) return `inventory item ${event.inventoryId} not found`;
        // Kind guard: the new row must match the component's role (no strut slot
        // re-pointed at a plate row).
        if (r.type !== roleToType(old.role)) {
          return `re-source kind mismatch: ${old.role} cannot source from a ${r.type} row`;
        }
        if (r.available <= 0) return `inventory item ${r.id} has none available`;
      }
      return null;
    }
    case 'OperationCreated':
    case 'OperationReopened':
      // ADR-036 / ADR-041 — one active op at a time. The UI only offers Start / Re-open
      // from the empty state; this is defense-in-depth with a clear reason (a second
      // create or reopen while one is active would otherwise fold as a silent no-effect
      // — the active-op race rule; a PEER's racing create/reopen does exactly that).
      return state.operation ? 'an operation is already active' : null;
    case 'ShorePointDeleted': {
      // The fold already no-ops a delete of a point still holding equipment (ADR-041);
      // refusing here gives the local user a clear reason instead of a silent no-op. A
      // `returned` point keeps its BOM as history but holds nothing; a `pending` point
      // never carries a BOM; an unknown point falls through (the reducer no-ops it).
      const sp = state.shorePoints.find((s) => s.id === event.spId);
      return sp && sp.deployedBom && sp.status !== 'returned' ? HOLDER_DELETE_REASON : null;
    }
    default:
      return null;
  }
}

const INVENTORY_CONSEQUENTIAL = new Set<FieldShoreEvent['type']>([
  'StrutDeployed',
  'StrutReturned',
  'EquipmentDeployed',
  'EquipmentReturned',
  'EquipmentReclaimed',
  'ComponentResourced',
]);

/** A fresh local event: `at` from the device clock, never a receipt stamp or batch. */
function provisional(e: FieldShoreEvent, at: number, batchId?: string): FieldShoreEvent {
  const out = { ...e, at };
  delete out.receivedAt;
  delete out.batchId;
  return batchId === undefined ? out : { ...out, batchId };
}

function isBulkError(err: unknown): err is BulkError {
  return err instanceof Dexie.BulkError;
}

export function createOperationStore(opts: {
  db: FieldShoreDB;
  inventory?: InventoryStoreApi;
  enqueue?: (event: FieldShoreEvent) => void;
  /** Dev-only bucket guard (registry-injected): fires if a commit lands on a bucket
   *  that no longer matches the signed-in department — a switch that didn't reload
   *  (ui/dept/switchBucket). Stripped from prod; stores built without it skip the check. */
  assertBucket?: () => void;
  /** The per-device monotonic clock that stamps every local commit's `at`. */
  clock?: MonotonicClock;
  /** This device's uid — selects the own events the clock observes on boot and the own
   *  events that can land in `overridden`. Null = none (most tests). */
  deviceUid?: () => string | null | undefined;
}): OperationStoreApi {
  const db = opts.db;
  const inventory = opts.inventory ?? createInventoryStore(db);
  // enqueue is INJECTED by the registry (wired to syncService) — keeping syncService
  // out of this file breaks the registry↔operationStore↔syncService import cycle.
  // A store built without an injected enqueue (most tests) simply doesn't sync.
  const enqueue = opts.enqueue ?? (() => {});
  // `() => Date.now()`, not `Date.now`: a captured reference would ignore fake timers
  // installed after construction.
  const clock = opts.clock ?? createMonotonicClock(() => Date.now());
  const deviceUid = opts.deviceUid ?? (() => null);

  const log = createEventLog();
  const store = createStore<OperationState>(() => log.active());
  const overridden = createStore<OverriddenState>(() => ({ events: [] }));

  // Serialize every mutation (local commits, peer ingests, receipt stamps) through one
  // promise chain, so each local pre-flight reads the PRIOR mutation's folded result —
  // two near-simultaneous deploys for one shore point can't both clear the Pending guard.
  // Single-threaded callers pay nothing.
  let queue: Promise<unknown> = Promise.resolve();
  function serialize<T>(run: () => Promise<T>): Promise<T> {
    const next = queue.then(run);
    queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  // Read trust boundary (F-SETUP-1): the event log is replayed forever, so a row written
  // under an OLDER schema must never crash a projection or the board. Drop rows that fail
  // the CURRENT schema (validate-then-degrade — the session.ts boot pattern) and keep the
  // valid rows' content unchanged (only the local `seq` key is dropped), so replay is
  // unchanged for everything well-formed.
  async function loadEvents(): Promise<FieldShoreEvent[]> {
    const rows = await db.events.toArray();
    const valid: FieldShoreEvent[] = [];
    let dropped = 0;
    for (const row of rows) {
      if (!FieldShoreEvent.safeParse(row).success) {
        dropped++;
        continue;
      }
      const e = { ...row };
      delete e.seq;
      valid.push(e);
    }
    if (dropped) console.warn(`FieldShore: skipped ${dropped} unreadable event(s) on load (stale or corrupt schema).`);
    return valid;
  }

  /** Push the log's current folds out: the active op (only when it changed) and held. */
  function publish(): void {
    const next = log.active();
    if (next !== store.getState()) store.setState(next, true);
    inventory.setHeld(log.held());
  }

  /** Durable copy of the overridden ids (best-effort; the in-memory list is the hot state). */
  function persistOverridden(events: readonly FieldShoreEvent[]): void {
    void db.meta.put({ key: OVERRIDDEN_KEY, value: JSON.stringify(events.map((e) => e.id)) }).catch(() => {});
  }

  /** Maintain `overridden` from the ids whose outcome just flipped. */
  function track(flipped: readonly string[], o?: IngestOptions): void {
    if (o?.trackOverridden === false || flipped.length === 0) return;
    const me = deviceUid();
    if (!me) return;
    const outcomes = log.outcomes();
    const lost: FieldShoreEvent[] = [];
    const recovered = new Set<string>();
    for (const id of flipped) {
      const e = log.get(id);
      if (!e || e.by !== me) continue;
      if (outcomes.get(id) === 'no-effect') {
        // Only ids the caller named (the un-uploaded backlog on a first merge) and only
        // changes whose intent did not land (idempotent bookkeeping never nags).
        if (o?.onlyIds && !o.onlyIds.has(id)) continue;
        if (!isTellWorthy(e)) continue;
        lost.push(e);
      } else {
        recovered.add(id); // a later arrival restored it — always safe to drop from the list
      }
    }
    if (lost.length === 0 && recovered.size === 0) return;
    const lostIds = new Set(lost.map((e) => e.id));
    const kept = overridden.getState().events.filter((e) => !lostIds.has(e.id) && !recovered.has(e.id));
    const next = [...kept, ...lost];
    overridden.setState({ events: next }, true);
    persistOverridden(next);
  }

  async function doCommit(raw: FieldShoreEvent): Promise<CommitResult> {
    opts.assertBucket?.(); // dev-only: warn if this write is landing on a stale department bucket
    // Garbage never enters the log — the schema is the gate (L-5 discipline).
    const parsed = FieldShoreEvent.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, reason: `invalid event: ${parsed.error.issues[0]?.message ?? 'schema mismatch'}` };
    }
    // Legacy single-strut events are REPLAY-ONLY: the reducer projects them into a
    // one-element BOM, but the app emits Equipment* now; reject the legacy literals
    // defensively (mirrors the commitMany guard).
    if (parsed.data.type === 'StrutDeployed' || parsed.data.type === 'StrutReturned') {
      return { ok: false, reason: 'legacy strut event is replay-only and cannot be committed' };
    }
    // One object for Dexie, memory and the upload queue.
    const event = provisional(parsed.data, clock.now());
    if (log.has(event.id)) return { ok: false, reason: 'duplicate event id' };

    const reason = localCommitGuard(store.getState(), event, inventory.store.getState().items);
    if (reason) return { ok: false, reason };

    try {
      await db.events.add({ ...event }); // clone — Dexie writes the seq key onto the object
    } catch (err) {
      // e.g. the &id unique index — another tab already stored this id.
      return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }

    // Durable write landed — now (and only now) the UI may see it (L-4).
    log.insert([event]);
    publish();
    enqueue(event);
    return { ok: true };
  }

  async function doCommitMany(raws: FieldShoreEvent[]): Promise<CommitResult> {
    opts.assertBucket?.(); // dev-only: warn if this write is landing on a stale department bucket
    if (raws.length === 0) return { ok: false, reason: 'empty batch' };

    // Validate the WHOLE batch before any write — garbage never enters the log.
    const parsedAll: FieldShoreEvent[] = [];
    const ids = new Set<string>();
    for (const raw of raws) {
      const parsed = FieldShoreEvent.safeParse(raw);
      if (!parsed.success) {
        return { ok: false, reason: `invalid event: ${parsed.error.issues[0]?.message ?? 'schema mismatch'}` };
      }
      if (INVENTORY_CONSEQUENTIAL.has(parsed.data.type)) {
        return { ok: false, reason: 'inventory-consequential events commit one at a time' };
      }
      if (log.has(parsed.data.id) || ids.has(parsed.data.id)) return { ok: false, reason: 'duplicate event id' };
      ids.add(parsed.data.id);
      parsedAll.push(parsed.data);
    }

    // Same holder pre-flight as a single ShorePointDeleted (#421): a grouped delete
    // (DeleteShorePointModal batches ALL live group members, no status filter) must not
    // slip a deployed member past the guard. Reject the WHOLE batch (all-or-nothing).
    const state = store.getState();
    for (const event of parsedAll) {
      if (event.type !== 'ShorePointDeleted') continue;
      const sp = state.shorePoints.find((s) => s.id === event.spId);
      if (sp && sp.deployedBom && sp.status !== 'returned') return { ok: false, reason: HOLDER_DELETE_REASON };
    }

    // Strictly increasing clock stamps (commit order = `at` order) and one shared batchId
    // so every device folds the group all-or-nothing (ADR-041 batch-atomic fold).
    const batchId = newId();
    const events = parsedAll.map((e) => provisional(e, clock.now(), batchId));

    try {
      // All-or-nothing: an uncaught failure (e.g. a duplicate &id BulkError) inside the
      // transaction callback aborts the whole transaction. Do NOT catch inside the callback
      // — the abort must propagate.
      await db.transaction('rw', db.events, async () => {
        await db.events.bulkAdd(events.map((e) => ({ ...e }))); // clone — Dexie writes seq onto the object
      });
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }

    // Durable batch landed — fold all events, then ONE setState / re-render (L-4).
    log.insert(events);
    publish();
    for (const e of events) enqueue(e);
    return { ok: true };
  }

  async function doIngestRemote(raws: readonly unknown[], o?: IngestOptions): Promise<IngestResult> {
    const parsed: FieldShoreEvent[] = [];
    let invalid = 0;
    for (const raw of raws) {
      const p = FieldShoreEvent.safeParse(raw);
      if (!p.success) {
        invalid++;
        continue;
      }
      // Every event passed here came from the cloud, so it HAS been received. A legacy one
      // (uploaded before receipt stamps existed) folds at its own `at`, persisted once.
      parsed.push(p.data.receivedAt === undefined ? { ...p.data, receivedAt: p.data.at } : p.data);
    }
    if (invalid) console.warn(`FieldShore: dropped ${invalid} unreadable peer event(s) (schema mismatch).`);

    const fresh: FieldShoreEvent[] = [];
    const seen = new Set<string>();
    for (const e of parsed) {
      if (log.has(e.id) || seen.has(e.id)) continue;
      seen.add(e.id);
      fresh.push(e);
    }
    if (fresh.length === 0) return { inserted: [], outcomes: log.outcomes(), flipped: [] };

    // Durable first (L-4), one transaction. A per-row unique-index conflict means another
    // tab of this app already stored that event: it is durable, so swallow those (INSIDE
    // the callback — an uncaught BulkError would abort the transaction and roll back the
    // rows that did land) and make sure the stored copy carries the receipt stamp, so a
    // reboot doesn't read it back as provisional. Any other failure aborts the whole call.
    await db.transaction('rw', db.events, async () => {
      try {
        await db.events.bulkAdd(fresh.map((e) => ({ ...e })));
      } catch (err) {
        if (!isBulkError(err)) throw err;
        const failed = Object.entries(err.failuresByPos);
        if (!failed.every(([, f]) => f.name === 'ConstraintError')) throw err;
        for (const [pos] of failed) {
          const e = fresh[Number(pos)]!;
          await stampReceivedAt(db, e.id, e.receivedAt!);
        }
      }
    });

    const res = log.insert(fresh);
    publish();
    track(res.flipped, o);
    return { inserted: res.inserted, outcomes: log.outcomes(), flipped: res.flipped };
  }

  async function doMarkReceived(id: string, receivedAt: number, o?: IngestOptions): Promise<boolean> {
    const prev = log.get(id);
    if (prev && prev.receivedAt === receivedAt) return false;
    await stampReceivedAt(db, id, receivedAt);
    if (!prev) return false; // not in this tab's log (nothing to re-fold here)
    const refolded = log.setReceivedAt(id, receivedAt);
    publish();
    track(log.lastFlipped(), o);
    return refolded;
  }

  return {
    store,
    commit: (raw: FieldShoreEvent) => serialize(() => doCommit(raw)),
    commitMany: (raws: FieldShoreEvent[]) => serialize(() => doCommitMany(raws)),
    ingestRemote: (events, o) => serialize(() => doIngestRemote(events, o)),
    markReceived: (id, receivedAt, o) => serialize(() => doMarkReceived(id, receivedAt, o)),
    overridden,
    acknowledgeOverridden() {
      if (overridden.getState().events.length === 0) return;
      overridden.setState({ events: [] }, true);
      persistOverridden([]);
    },
    outcomes: () => log.outcomes(),
    held: () => log.held(),
    sortedEvents: () => log.sortedEvents(),
    has: (id) => log.has(id),
    get: (id) => log.get(id),
    async boot() {
      // Canonical order is the log's job — Dexie's seq order is irrelevant here. Rows the
      // sync layer has not yet stamped (no receivedAt) come back provisional by design.
      const rows = await loadEvents();
      log.rebuild(rows);
      store.setState(log.active(), true);
      inventory.setHeld(log.held());
      // The unacknowledged "had no effect" list survives a reload: restore the ids that are
      // still in the log and still read no-effect (a later arrival may have restored one).
      try {
        const row = await db.meta.get(OVERRIDDEN_KEY);
        const ids: unknown = row ? JSON.parse(row.value) : [];
        if (Array.isArray(ids)) {
          const outcomes = log.outcomes();
          const events = ids
            .filter((id): id is string => typeof id === 'string')
            .map((id) => log.get(id))
            .filter((e): e is FieldShoreEvent => e !== undefined && outcomes.get(e.id) === 'no-effect');
          if (events.length > 0) overridden.setState({ events }, true);
        }
      } catch {
        // a corrupt row only loses the list — never the boot
      }
      // The clock observes ONLY this device's own events (ADR-041): a peer's skewed clock
      // must never drag this device's timestamps.
      const me = deviceUid();
      if (me) {
        let maxOwn = Number.NEGATIVE_INFINITY;
        for (const e of rows) if (e.by === me && e.at > maxOwn) maxOwn = e.at;
        if (Number.isFinite(maxOwn)) clock.observe(maxOwn);
      }
    },
    // Cold reads: the in-memory canonical log (every event of the bucket, ended ops
    // included). Async for API compatibility with the earlier Dexie-backed reads.
    async readArchive() {
      return projectArchive(log.sortedEvents());
    },
    async readOperation(opId: string) {
      return log.opState(opId) ?? projectOperationById(log.sortedEvents(), opId);
    },
    async readShorePointHistory(spId: string) {
      // The filter is pure (core/operation) — it includes the group-fanned status changes
      // this point moved on but whose event names only the trigger (#453).
      return shorePointHistory(log.sortedEvents(), spId);
    },
    async readRoleHistory(opId: string, positionId?: string) {
      return roleHistory(log.sortedEvents(), opId, positionId); // the filter is pure (core/org)
    },
    async readEventLog(opId: string) {
      // The Audit Log Incident view reverses for newest-first.
      return log.sortedEvents().filter((e) => e.opId === opId);
    },
  };
}

/** The app's singleton operation store, bound to the singleton DB. */
// The dept-scoped singleton lives in registry.ts (it's recreated per-department
// on a switch); this file exports only the factory + helpers.

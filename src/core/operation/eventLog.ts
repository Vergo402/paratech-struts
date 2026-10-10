import type { FieldShoreEvent } from '../schema';
import { operationReducer, EMPTY_OPERATION_STATE, type OperationState } from './reducer';
import { heldCounts, type HeldCounts } from './held';

// ADR-041 — ONE canonical event order on every device, and the in-memory log that folds
// it. Pure core: no React, no Firebase, no Dexie. data/store owns persistence and feeds
// this log; this module owns ORDER, the two-tier per-op fold, batch atomicity, the
// active-op rule and per-event outcomes.
//
// Mental model:
// - `at` is audit time; `receivedAt` (the RTDB server stamp) is ORDER. Reducers never read
//   `receivedAt` — only this module does, to sort.
// - An event with `receivedAt === undefined` is PROVISIONAL (this device's own, not yet
//   confirmed by the cloud). It sorts after every received event. The log treats an
//   undefined receivedAt STRICTLY as provisional: the caller normalizes a legacy cloud
//   event that lacks one to `receivedAt = at` before inserting it.
// - Outcomes come from reference identity: a reducer that returns the SAME state object
//   had no effect. That is the reducer contract this module relies on (ADR-041 §C).

// ── Canonical order ────────────────────────────────────────────────────────────────────

/** The canonical sort key: `[receivedAt ?? +Infinity, at, id]`. */
export type CanonicalKey = readonly [number, number, string];

export function canonicalKey(e: FieldShoreEvent): CanonicalKey {
  return [e.receivedAt ?? Number.POSITIVE_INFINITY, e.at, e.id];
}

// Explicit </> on purpose: subtraction would give Infinity − Infinity = NaN for two
// provisional events, and localeCompare can collate differently across devices. Ids are
// compared by UTF-16 code unit, which is identical everywhere.
function cmp<T extends number | string>(a: T, b: T): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareKeys(a: CanonicalKey, b: CanonicalKey): number {
  return cmp(a[0], b[0]) || cmp(a[1], b[1]) || cmp(a[2], b[2]);
}

/**
 * Total order over events: receivedAt (absent = +∞, i.e. provisional after every received
 * event), then `at`, then `id`. Two distinct events never compare equal (ids are unique).
 */
export function compareCanonical(a: FieldShoreEvent, b: FieldShoreEvent): number {
  return compareKeys(canonicalKey(a), canonicalKey(b));
}

/** A new array in canonical order (the input is not mutated). */
export function sortCanonical(events: readonly FieldShoreEvent[]): FieldShoreEvent[] {
  return [...events].sort(compareCanonical);
}

// ── Outcomes ───────────────────────────────────────────────────────────────────────────

/** What one event did when folded: changed the state, or was a no-op (the losing branch). */
export type Outcome = 'applied' | 'no-effect';

// ── Active-op rule (one definition; projection.ts uses it too) ─────────────────────────

export interface LifecycleResolution {
  /** The active operation after the whole log, or null when none is active. */
  activeOpId: string | null;
  /** OperationCreated events that lost the active-op race (another op was active). */
  lostCreated: ReadonlySet<string>;
  /** OperationReopened events that lost the race. The per-op fold SKIPS these, so the
   *  op stays ended (a no-effect reopen must not flip status or re-hold released stock). */
  lostReopened: ReadonlySet<string>;
}

/**
 * Walk the lifecycle events in canonical order: a Created/Reopened while NOTHING is
 * active makes that op active; a Created/Reopened while ANOTHER op is active lost the
 * race (no-effect); an Ended of the active op clears it. "First received wins" — and
 * because it is a walk, the losing op does NOT become active when the winner later ends
 * (it was superseded, not queued). Callers pass canonical order.
 */
export function resolveLifecycle(events: Iterable<FieldShoreEvent>): LifecycleResolution {
  let active: string | null = null;
  const lostCreated = new Set<string>();
  const lostReopened = new Set<string>();
  for (const e of events) {
    if (e.type === 'OperationCreated' || e.type === 'OperationReopened') {
      if (active === null) active = e.opId;
      else if (active !== e.opId) (e.type === 'OperationCreated' ? lostCreated : lostReopened).add(e.id);
    } else if (e.type === 'OperationEnded' && e.opId === active) {
      active = null;
    }
  }
  return { activeOpId: active, lostCreated, lostReopened };
}

function isLifecycle(e: FieldShoreEvent): boolean {
  return e.type === 'OperationCreated' || e.type === 'OperationReopened' || e.type === 'OperationEnded';
}

// ── The fold kernel (the ONLY place batch atomicity + identity outcomes live) ──────────

interface FoldOptions {
  /** Present-member count per batchId over the WHOLE op (both tiers). */
  sizes: ReadonlyMap<string, number>;
  /** Event ids folded as no-effect without calling the reducer (losing reopens). */
  skip: ReadonlySet<string>;
  /** batchIds whose members are held back (they still have a provisional member). */
  defer?: ReadonlySet<string>;
}

interface FoldRun {
  state: OperationState;
  /** The event at whose position the last fold step happened (null = nothing folded). */
  last: FieldShoreEvent | null;
  /** batchIds folded (applied or no-effect) in this run. */
  batches: Set<string>;
}

function step(state: OperationState, e: FieldShoreEvent, skip: ReadonlySet<string>): OperationState {
  return skip.has(e.id) ? state : operationReducer(state, e);
}

/**
 * Fold `seq` (one op's events, canonical order) onto `start`, writing each event's
 * outcome via `setOutcome`.
 *
 * BATCH RULE (ADR-041): a batch (events sharing a batchId, always within one op) folds
 * as ONE unit at the position of its LAST PRESENT member in canonical order — members are
 * collected as the walk meets them and the group folds when the count of members present
 * in the op is reached. The group is dry-folded in canonical order; if ANY member returns
 * the same reference the whole group is no-effect and the state is untouched, else every
 * member applies. A batch of one present member folds like a plain event. Members of a
 * `defer`red batch are skipped entirely (no outcome written) — the caller folds them later.
 */
function foldRun(
  start: OperationState,
  seq: readonly FieldShoreEvent[],
  opts: FoldOptions,
  setOutcome: (id: string, o: Outcome) => void,
): FoldRun {
  let state = start;
  let last: FieldShoreEvent | null = null;
  const batches = new Set<string>();
  const buffered = new Map<string, FieldShoreEvent[]>();

  const foldGroup = (members: FieldShoreEvent[]) => {
    let s = state;
    let noEffect = false;
    for (const m of members) {
      const n = step(s, m, opts.skip);
      if (n === s) noEffect = true;
      s = n;
    }
    for (const m of members) setOutcome(m.id, noEffect ? 'no-effect' : 'applied');
    if (!noEffect) state = s;
  };

  for (const e of seq) {
    const b = e.batchId;
    const size = b === undefined ? 1 : (opts.sizes.get(b) ?? 1);
    if (b === undefined || size <= 1) {
      const next = step(state, e, opts.skip);
      setOutcome(e.id, next === state ? 'no-effect' : 'applied');
      state = next;
      last = e;
      if (b !== undefined) batches.add(b); // a one-member batch is still a folded batch
      continue;
    }
    if (opts.defer?.has(b)) continue;
    const members = buffered.get(b) ?? [];
    members.push(e);
    if (members.length < size) {
      buffered.set(b, members);
      continue;
    }
    buffered.delete(b);
    foldGroup(members);
    batches.add(b);
    last = e;
  }
  // Defensive: a group still short of its count (stale sizes) folds at the end, atomically.
  for (const [b, members] of buffered) {
    foldGroup(members);
    batches.add(b);
    last = members[members.length - 1]!;
  }
  return { state, last, batches };
}

function batchSizes(events: Iterable<FieldShoreEvent>): Map<string, number> {
  const sizes = new Map<string, number>();
  for (const e of events) if (e.batchId !== undefined) sizes.set(e.batchId, (sizes.get(e.batchId) ?? 0) + 1);
  return sizes;
}

/**
 * Cold read: fold ONE op out of a full canonical-order log and report every one of its
 * events' outcomes. Uses the same kernel as the live log (batch atomicity, the active-op
 * rule: a losing Reopened is skipped, a losing Created applies to the op's own state but
 * reads no-effect). `events` must be canonical order and may contain other ops' events
 * (they decide the active-op race). The result equals `createEventLog().rebuild(events)`
 * → `opState(scopeOpId)` / `outcomes()` restricted to that op.
 */
export function foldWithOutcomes(
  events: readonly FieldShoreEvent[],
  scopeOpId: string,
): { state: OperationState; outcomes: ReadonlyMap<string, Outcome> } {
  const life = resolveLifecycle(events);
  const own = events.filter((e) => e.opId === scopeOpId);
  const outcomes = new Map<string, Outcome>();
  const { state } = foldRun(
    EMPTY_OPERATION_STATE,
    own,
    { sizes: batchSizes(own), skip: life.lostReopened },
    (id, o) => outcomes.set(id, o),
  );
  for (const id of life.lostCreated) if (outcomes.has(id)) outcomes.set(id, 'no-effect');
  return { state, outcomes };
}

// ── The live log ───────────────────────────────────────────────────────────────────────

export interface InsertResult {
  /** The events actually added (new ids), in canonical order. Duplicates are ignored —
   *  a re-delivered id never changes the stored event; stamping is setReceivedAt's job. */
  inserted: FieldShoreEvent[];
  /** Ops whose RECEIVED tier was re-folded from scratch (a genuine late arrival, a late
   *  batch member, or an active-op race flip that touched them). */
  refoldedOps: string[];
  /** Every op whose state was re-derived in any way (incremental or full). */
  touchedOps: string[];
  /** Ids of events already in the log before this call whose outcome flipped. */
  flipped: string[];
}

export interface EventLog {
  /** Replace everything with `events` (any order; deduped by id, a received copy wins). */
  rebuild(events: readonly FieldShoreEvent[]): void;
  /** Add new events in canonical position and fold them (see InsertResult). */
  insert(events: readonly FieldShoreEvent[]): InsertResult;
  /**
   * Stamp the cloud receipt time onto a known event (provisional → received, or a
   * corrected stamp). Returns true when the event's op had to re-fold its received tier
   * from scratch — i.e. the new key landed BEFORE an already-folded received event of
   * that op. False for an unknown id or an unchanged stamp.
   */
  setReceivedAt(id: string, receivedAt: number): boolean;
  has(id: string): boolean;
  get(id: string): FieldShoreEvent | undefined;
  /** Every event, canonical order. A fresh array per call. */
  sortedEvents(): FieldShoreEvent[];
  activeOpId(): string | null;
  /** The active op's state, or EMPTY_OPERATION_STATE when none is active. */
  active(): OperationState;
  /** One op's folded state (also for ended / superseded ops — the archive drill-in). */
  opState(opId: string): OperationState | undefined;
  /** Snapshot of every op's state. Replaced (never mutated) when anything changes. */
  opStates(): ReadonlyMap<string, OperationState>;
  /** Snapshot of every event's outcome. Replaced (never mutated) when anything changes. */
  outcomes(): ReadonlyMap<string, Outcome>;
  /** Ids whose outcome flipped in the most recent insert / setReceivedAt ([] after rebuild). */
  lastFlipped(): readonly string[];
  /** Stock held across every op (ended included; stockReleased ops excluded). */
  held(): HeldCounts;
}

interface OpLog {
  received: FieldShoreEvent[]; // receivedAt defined, canonical order
  tail: FieldShoreEvent[]; //     provisional, canonical order
  sReceived: OperationState; //   fold of the received tier (minus deferred batches)
  lastKey: CanonicalKey | null; // key at the last fold position of the received tier
  foldedBatches: Set<string>; //  batchIds folded into sReceived
  state: OperationState; //       sReceived + deferred batches + tail
}

function newOpLog(): OpLog {
  return {
    received: [],
    tail: [],
    sReceived: EMPTY_OPERATION_STATE,
    lastKey: null,
    foldedBatches: new Set(),
    state: EMPTY_OPERATION_STATE,
  };
}

/** Index at which `e` would be inserted to keep `arr` canonical (binary search). */
function insertionIndex(arr: readonly FieldShoreEvent[], e: FieldShoreEvent): number {
  const k = canonicalKey(e);
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (compareKeys(canonicalKey(arr[mid]!), k) < 0) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function sortedInsert(arr: FieldShoreEvent[], e: FieldShoreEvent): void {
  arr.splice(insertionIndex(arr, e), 0, e);
}

function sortedRemove(arr: FieldShoreEvent[], e: FieldShoreEvent): void {
  const i = insertionIndex(arr, e);
  if (arr[i]?.id === e.id) arr.splice(i, 1);
}

export function createEventLog(): EventLog {
  let sorted: FieldShoreEvent[] = [];
  let byId = new Map<string, FieldShoreEvent>();
  let ops = new Map<string, OpLog>();
  let lifecycle: FieldShoreEvent[] = []; // Created/Reopened/Ended, canonical order
  let life: LifecycleResolution = resolveLifecycle([]);
  let raw = new Map<string, Outcome>(); // identity outcomes from the fold
  let flipped: string[] = [];

  // Snapshot caches — rebuilt lazily after any change, so a caller's old reference
  // never mutates under it (Stage 2 diffs snapshots).
  let outcomesSnap: ReadonlyMap<string, Outcome> | null = null;
  let opStatesSnap: ReadonlyMap<string, OperationState> | null = null;
  let heldSnap: HeldCounts | null = null;
  const invalidate = () => {
    outcomesSnap = null;
    opStatesSnap = null;
    heldSnap = null;
  };

  const effective = (id: string): Outcome | undefined =>
    life.lostCreated.has(id) && raw.has(id) ? 'no-effect' : raw.get(id);

  // Flip tracking for one mutating call: capture each touched id's effective outcome
  // before its first rewrite, compare after.
  let before: Map<string, Outcome | undefined> | null = null;
  const capture = (id: string) => {
    if (before && !before.has(id)) before.set(id, effective(id));
  };
  const setOutcome = (id: string, o: Outcome) => {
    capture(id);
    raw.set(id, o);
  };

  const opLog = (opId: string): OpLog => {
    let op = ops.get(opId);
    if (!op) ops.set(opId, (op = newOpLog()));
    return op;
  };

  const tailBatches = (op: OpLog): Set<string> => {
    const s = new Set<string>();
    for (const e of op.tail) if (e.batchId !== undefined) s.add(e.batchId);
    return s;
  };

  const sizesOf = (op: OpLog) => batchSizes([...op.received, ...op.tail]);

  function refoldReceived(op: OpLog): void {
    const run = foldRun(
      EMPTY_OPERATION_STATE,
      op.received,
      { sizes: sizesOf(op), skip: life.lostReopened, defer: tailBatches(op) },
      setOutcome,
    );
    op.sReceived = run.state;
    op.lastKey = run.last ? canonicalKey(run.last) : null;
    op.foldedBatches = run.batches;
  }

  function foldReceivedIncrement(op: OpLog, events: readonly FieldShoreEvent[]): void {
    const run = foldRun(
      op.sReceived,
      events,
      { sizes: sizesOf(op), skip: life.lostReopened, defer: tailBatches(op) },
      setOutcome,
    );
    op.sReceived = run.state;
    if (run.last) op.lastKey = canonicalKey(run.last);
    for (const b of run.batches) op.foldedBatches.add(b);
  }

  /** Re-fold the provisional tier: deferred received batch members + the tail, on top of
   *  sReceived. Deferred members are received (finite key) so they precede the tail. */
  function refoldTail(op: OpLog): void {
    const tb = tailBatches(op);
    const deferred = tb.size === 0 ? [] : op.received.filter((e) => e.batchId !== undefined && tb.has(e.batchId));
    const run = foldRun(op.sReceived, [...deferred, ...op.tail], { sizes: sizesOf(op), skip: life.lostReopened }, setOutcome);
    op.state = run.state;
  }

  /** Re-resolve the active-op race; returns the ops whose skip set or override changed. */
  function relife(): Set<string> {
    const prev = life;
    const next = resolveLifecycle(lifecycle);
    const changed = new Set<string>();
    const mark = (id: string) => {
      const e = byId.get(id);
      if (e) changed.add(e.opId);
      capture(id);
    };
    const diff = (a: ReadonlySet<string>, b: ReadonlySet<string>) => {
      for (const id of a) if (!b.has(id)) mark(id);
      for (const id of b) if (!a.has(id)) mark(id);
    };
    diff(prev.lostCreated, next.lostCreated);
    diff(prev.lostReopened, next.lostReopened);
    life = next;
    return changed;
  }

  const lessThanLast = (op: OpLog, k: CanonicalKey) => op.lastKey !== null && compareKeys(k, op.lastKey) <= 0;

  function finishCall(): string[] {
    const out: string[] = [];
    if (before) for (const [id, was] of before) if (was !== undefined && was !== effective(id)) out.push(id);
    before = null;
    flipped = out;
    invalidate();
    return out;
  }

  function addToStructures(e: FieldShoreEvent): void {
    byId.set(e.id, e);
    sortedInsert(sorted, e);
    const op = opLog(e.opId);
    sortedInsert(e.receivedAt === undefined ? op.tail : op.received, e);
    if (isLifecycle(e)) sortedInsert(lifecycle, e);
  }

  function removeFromStructures(e: FieldShoreEvent): void {
    sortedRemove(sorted, e);
    const op = opLog(e.opId);
    sortedRemove(e.receivedAt === undefined ? op.tail : op.received, e);
    if (isLifecycle(e)) sortedRemove(lifecycle, e);
  }

  const log: EventLog = {
    rebuild(events) {
      const dedup = new Map<string, FieldShoreEvent>();
      for (const e of events) {
        const prev = dedup.get(e.id);
        if (!prev || (prev.receivedAt === undefined && e.receivedAt !== undefined)) dedup.set(e.id, e);
      }
      sorted = sortCanonical([...dedup.values()]);
      byId = new Map(sorted.map((e) => [e.id, e]));
      ops = new Map();
      lifecycle = [];
      raw = new Map();
      before = null;
      for (const e of sorted) {
        const op = opLog(e.opId);
        (e.receivedAt === undefined ? op.tail : op.received).push(e);
        if (isLifecycle(e)) lifecycle.push(e);
      }
      life = resolveLifecycle(lifecycle);
      for (const op of ops.values()) {
        refoldReceived(op);
        refoldTail(op);
      }
      flipped = [];
      invalidate();
    },

    insert(events) {
      before = new Map();
      const fresh: FieldShoreEvent[] = [];
      const seen = new Set<string>();
      for (const e of events) {
        if (byId.has(e.id) || seen.has(e.id)) continue;
        seen.add(e.id);
        fresh.push(e);
      }
      if (fresh.length === 0) {
        // Nothing new (a re-delivery): keep every snapshot reference — nothing changed.
        before = null;
        flipped = [];
        return { inserted: [], refoldedOps: [], touchedOps: [], flipped: [] };
      }
      // Pre-insert facts per op, needed to choose incremental vs full re-fold.
      const byOp = new Map<string, FieldShoreEvent[]>();
      for (const e of fresh) {
        const list = byOp.get(e.opId) ?? [];
        list.push(e);
        byOp.set(e.opId, list);
      }
      for (const e of fresh) addToStructures(e);
      const lifeChanged = relife();

      const refolded = new Set<string>();
      const touched = new Set<string>();
      for (const opId of new Set([...byOp.keys(), ...lifeChanged])) {
        const op = opLog(opId);
        const added = sortCanonical(byOp.get(opId) ?? []);
        const newReceived = added.filter((e) => e.receivedAt !== undefined);
        // Full re-fold when: the race flipped for this op; a new received event lands at or
        // before the last folded position (a genuine late arrival); or a new event (either
        // tier) joins a batch already folded into sReceived (its membership changed).
        const full =
          lifeChanged.has(opId) ||
          newReceived.some((e) => lessThanLast(op, canonicalKey(e))) ||
          added.some((e) => e.batchId !== undefined && op.foldedBatches.has(e.batchId));
        if (full) {
          refoldReceived(op);
          refolded.add(opId);
        } else if (newReceived.length > 0) {
          foldReceivedIncrement(op, newReceived);
        }
        refoldTail(op);
        touched.add(opId);
      }
      const flips = finishCall();
      return {
        inserted: sortCanonical(fresh),
        refoldedOps: [...refolded],
        touchedOps: [...touched],
        flipped: flips,
      };
    },

    setReceivedAt(id, receivedAt) {
      const prev = byId.get(id);
      if (!prev || prev.receivedAt === receivedAt) return false;
      before = new Map();
      const wasReceived = prev.receivedAt !== undefined;
      removeFromStructures(prev);
      const next: FieldShoreEvent = { ...prev, receivedAt };
      addToStructures(next);
      const lifeChanged = relife();
      const op = opLog(next.opId);
      const key = canonicalKey(next);
      const b = next.batchId;
      const sizes = sizesOf(op);

      let full = wasReceived || lifeChanged.has(next.opId);
      let increment: FieldShoreEvent[] | null = null;
      if (!full) {
        if (b !== undefined && (sizes.get(b) ?? 1) > 1) {
          if (op.foldedBatches.has(b)) full = true;
          else if (!tailBatches(op).has(b)) {
            // The batch's last provisional member just got stamped: the whole group is now
            // received and folds at its last member's position (its max key).
            const members = op.received.filter((e) => e.batchId === b);
            const lastMember = members[members.length - 1]!;
            if (lessThanLast(op, canonicalKey(lastMember))) full = true;
            else increment = members;
          }
          // else: still has a provisional member — stays deferred in the tail tier.
        } else if (lessThanLast(op, key)) {
          full = true;
        } else {
          increment = [next];
        }
      }
      if (full) refoldReceived(op);
      else if (increment) foldReceivedIncrement(op, increment);
      refoldTail(op);
      for (const other of lifeChanged) {
        if (other === next.opId) continue;
        const o = opLog(other);
        refoldReceived(o);
        refoldTail(o);
      }
      finishCall();
      return full;
    },

    has: (id) => byId.has(id),
    get: (id) => byId.get(id),
    sortedEvents: () => [...sorted],
    activeOpId: () => life.activeOpId,
    active: () => (life.activeOpId === null ? EMPTY_OPERATION_STATE : (ops.get(life.activeOpId)?.state ?? EMPTY_OPERATION_STATE)),
    opState: (opId) => ops.get(opId)?.state,

    opStates() {
      if (!opStatesSnap) {
        const m = new Map<string, OperationState>();
        for (const [opId, op] of ops) m.set(opId, op.state);
        opStatesSnap = m;
      }
      return opStatesSnap;
    },

    outcomes() {
      if (!outcomesSnap) {
        const m = new Map(raw);
        for (const id of life.lostCreated) if (m.has(id)) m.set(id, 'no-effect');
        outcomesSnap = m;
      }
      return outcomesSnap;
    },

    lastFlipped: () => flipped,

    held() {
      if (!heldSnap) heldSnap = heldCounts(log.opStates().values());
      return heldSnap;
    },
  };
  return log;
}

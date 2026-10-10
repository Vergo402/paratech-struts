import type { FieldShoreEvent } from '../schema';
import { operationReducer, statusFanTargets, EMPTY_OPERATION_STATE, type OperationState } from './reducer';
import { foldWithOutcomes, resolveLifecycle } from './eventLog';

/** True when the event NAMES this shore point (Added carries the id under
 *  shorePoint.id; every other SP event under spId). */
function namesShorePoint(e: FieldShoreEvent, spId: string): boolean {
  return e.type === 'ShorePointAdded' ? e.shorePoint.id === spId : 'spId' in e && e.spId === spId;
}

/**
 * Every logged event that TOUCHED one shore point, in the order given (callers pass canonical order)
 * — the Quick View timeline (ADR-019). Not just the events naming the point: a
 * grouped `ShorePointStatusChanged` fans across every lockstep mate but carries only
 * the TRIGGER's spId, so a mate's audit trail silently lost those moves (#453).
 *
 * Fixed at READ time, deliberately. The alternative — stamping the fanned ids onto
 * future events — would leave every event ALREADY on disk (and every peer event from
 * an older build) wrong, and would need this same replay as a backfill anyway. The
 * log stays the source of truth (ADR-009): membership and lockstep at the moment of
 * the event are recoverable by folding, so nothing has to be denormalized onto the
 * wire. A fanned entry is returned as the TRIGGER event itself, so it carries the
 * same actor (`by`) and timestamp (`at`) — attributable, per the issue.
 *
 * Scoped to the point's OWN operation before folding: operationReducer carries
 * shorePoints across an OperationCreated, so folding a multi-op log raw would mix
 * points from different incidents into the membership check (projectOperationById's
 * filter-then-fold shape, for the same reason).
 */
export function shorePointHistory(events: readonly FieldShoreEvent[], spId: string): FieldShoreEvent[] {
  const opId = events.find((e) => namesShorePoint(e, spId))?.opId;
  if (opId == null) return []; // unknown point — no history
  const out: FieldShoreEvent[] = [];
  let state = EMPTY_OPERATION_STATE;
  for (const e of events) {
    if (e.opId !== opId) continue;
    if (namesShorePoint(e, spId)) out.push(e);
    else if (
      e.type === 'ShorePointStatusChanged' &&
      // The state BEFORE the event — the membership/lockstep the fan actually saw.
      statusFanTargets(state.shorePoints, e.spId, e.from, e.to).includes(spId)
    ) {
      out.push(e);
    }
    state = operationReducer(state, e);
  }
  return out;
}

/**
 * The opId of the active operation — the EARLIEST un-ended OperationCreated/
 * OperationReopened in canonical order (ADR-041: first received wins). A later
 * create/reopen while another op is active lost the race and is ignored (it is not
 * queued: when the winner ends, the loser does not become active). Null = none active.
 * This scopes the active projection to ONE incident so a second op never inherits the
 * first's points, and lets a re-opened op be reconstructed from the log (ADR-036).
 *
 * Every function in this file expects `events` in CANONICAL order (sortCanonical /
 * EventLog.sortedEvents()) — append (Dexie seq) order is not chronological.
 */
function activeOpId(events: readonly FieldShoreEvent[]): string | null {
  return resolveLifecycle(events).activeOpId;
}

/**
 * Project a single operation by id — fold ONLY its events, from empty, through the same
 * kernel as the live EventLog (batch-atomic; a reopen that lost the active-op race is
 * skipped so the op stays ended). Works for active, ended, re-opened and superseded ops.
 * The read-only archive drill-in and the active path both lean on this.
 */
export function projectOperationById(events: readonly FieldShoreEvent[], opId: string): OperationState {
  return foldWithOutcomes(events, opId).state;
}

/**
 * Recompute the ACTIVE operation's state by folding its events (ADR-009: the log
 * is the device's source of truth; state is a projection). Deterministic — the same
 * events in canonical order always yield the same state on every device (ADR-041).
 */
export function projectOperation(events: readonly FieldShoreEvent[]): OperationState {
  const id = activeOpId(events);
  return id == null ? EMPTY_OPERATION_STATE : projectOperationById(events, id);
}

/** One past-incident row for the Past-operations list. */
export interface ArchivedOperationSummary {
  id: string;
  name: string;
  /** epoch ms of the canonically LAST OperationEnded for this op; for a superseded op
   *  (never ended) its OperationCreated.at, so it sorts by when it was started. */
  endedAt: number;
  shorePointCount: number; // live (non-deleted) points
  /** Present (true) only on an op that lost the active-op race: it has no OperationEnded
   *  in the log and is not the active op (ADR-041). Read-only drill-in, no synthetic end. */
  superseded?: true;
}

/**
 * Every operation that is NOT the active one, newest first — the Past-operations list
 * (#238). Listed regardless of folded status: an ended op, a superseded op (lost the
 * active-op race — flagged `superseded`), and an op whose reopen lost the race (stays
 * ended, since the losing reopen is skipped). The log is retained, so each row is fully
 * re-projectable via projectOperationById for the read-only drill-in. A re-opened op that
 * won is active, so it drops out of this list. `events` must be canonical order.
 */
export function projectArchive(events: readonly FieldShoreEvent[]): ArchivedOperationSummary[] {
  const active = activeOpId(events);
  const createdAt = new Map<string, number>();
  const endedAt = new Map<string, number>();
  for (const e of events) {
    if (e.type === 'OperationCreated' && !createdAt.has(e.opId)) createdAt.set(e.opId, e.at);
    else if (e.type === 'OperationEnded') endedAt.set(e.opId, e.at); // canonical last wins
  }

  const out: ArchivedOperationSummary[] = [];
  for (const [id, created] of createdAt) {
    if (id === active) continue;
    const { operation, shorePoints } = projectOperationById(events, id);
    if (!operation) continue;
    const ended = endedAt.get(id);
    out.push({
      id,
      name: operation.name,
      endedAt: ended ?? created,
      shorePointCount: shorePoints.filter((sp) => sp.deletedAt == null).length,
      ...(ended === undefined ? { superseded: true as const } : {}),
    });
  }
  return out.sort((a, b) => b.endedAt - a.endedAt);
}

import type { FieldShoreEvent } from '../schema';
import { operationReducer, EMPTY_OPERATION_STATE, type OperationState } from './reducer';

/**
 * The opId of the operation that is active at the END of the log — the last
 * OperationCreated/OperationReopened whose op hasn't since been ended. Null = none
 * active (a fresh device, or every op archived). This is what scopes the active
 * projection to ONE incident so a second op never inherits the first's points,
 * and what lets a re-opened op be reconstructed from the retained log (ADR-036).
 */
function activeOpId(events: readonly FieldShoreEvent[]): string | null {
  let active: string | null = null;
  for (const e of events) {
    if (e.type === 'OperationCreated' || e.type === 'OperationReopened') active = e.opId;
    else if (e.type === 'OperationEnded' && e.opId === active) active = null;
  }
  return active;
}

/**
 * Project a single operation by id — fold ONLY its events, from empty. Works for
 * active, ended, and re-opened ops (an ended op folds to status:'ended'; a
 * re-opened one folds Ended-then-Reopened to status:'active'). The read-only
 * archive drill-in and the active path both lean on this.
 */
export function projectOperationById(events: readonly FieldShoreEvent[], opId: string): OperationState {
  return events.filter((e) => e.opId === opId).reduce(operationReducer, EMPTY_OPERATION_STATE);
}

/**
 * Recompute the ACTIVE operation's state by folding its events (ADR-009: the log
 * is the device's source of truth; state is a projection). data/store calls this
 * on boot and on every lifecycle-boundary commit. Deterministic — same events in
 * the same order always yield the same state, which is what keeps devices in sync.
 */
export function projectOperation(events: readonly FieldShoreEvent[]): OperationState {
  const id = activeOpId(events);
  return id == null ? EMPTY_OPERATION_STATE : projectOperationById(events, id);
}

/** One finished-incident row for the Past-operations list. */
export interface ArchivedOperationSummary {
  id: string;
  name: string;
  endedAt: number; // epoch ms of the most recent OperationEnded for this op
  shorePointCount: number; // live (non-deleted) points
}

/**
 * Every operation whose current state is `ended`, newest-ended first — the
 * Past-operations list (#238). The log is retained, so each row is fully
 * re-projectable via projectOperationById for the read-only drill-in. A
 * re-opened op is active again, so it correctly drops out of this list.
 */
export function projectArchive(events: readonly FieldShoreEvent[]): ArchivedOperationSummary[] {
  const opIds: string[] = [];
  for (const e of events) if (e.type === 'OperationCreated' && !opIds.includes(e.opId)) opIds.push(e.opId);

  const out: ArchivedOperationSummary[] = [];
  for (const id of opIds) {
    const { operation, shorePoints } = projectOperationById(events, id);
    if (!operation || operation.status !== 'ended') continue;
    let endedAt = 0;
    for (const e of events) if (e.type === 'OperationEnded' && e.opId === id) endedAt = e.at;
    out.push({
      id,
      name: operation.name,
      endedAt,
      shorePointCount: shorePoints.filter((sp) => sp.deletedAt == null).length,
    });
  }
  return out.sort((a, b) => b.endedAt - a.endedAt);
}

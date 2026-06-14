import type { Operation, ShorePoint, ShorePointStatus, FieldShoreEvent } from '../schema';
import { shorePointReducer, canTransition } from '../shorepoint';

// The projected current state of one operation: the operation record + its shore
// points in insertion order. Built from the event log by projectOperation().
export interface OperationState {
  operation: Operation | null;
  shorePoints: ShorePoint[];
}

export const EMPTY_OPERATION_STATE: OperationState = { operation: null, shorePoints: [] };

// v3 `individualPhase` — once a point is AT cutting or beyond, its lifecycle is
// per-card (its own cut length, its own slide). Before that (pending/process/
// strutset, including the strutset→cutting entry), a grouped transition moves all
// members at once.
const INDIVIDUAL_PHASE: readonly ShorePointStatus[] = ['cutting', 'runner', 'secured'];

/**
 * L-7 group fan-out. A status change on a grouped, pre-cutting point moves every
 * group member that is IN LOCKSTEP with the trigger (same current status); an
 * individual-phase (or ungrouped) point moves only itself. A mate that is ahead
 * or behind is left untouched — so a grouped transition can never regress a mate
 * that has advanced (the L-7 invariant), and never force-jumps a laggard across
 * the pending/deploy boundary. Both directions are symmetric (ADR-010).
 *
 * This is a deliberate refinement of v3's advance-only "catch up to target" rule:
 * v4 moves only lockstep members, which is safer and reads identically when the
 * group is in lockstep (the only state the gated UI produces). Broadening group
 * semantics beyond this would be an ADR, not an inline change (plan risk #7).
 */
function groupAdvance(
  shorePoints: ShorePoint[],
  spId: string,
  from: ShorePointStatus,
  to: ShorePointStatus,
): ShorePoint[] {
  const trigger = shorePoints.find((sp) => sp.id === spId);
  if (!trigger) return shorePoints;
  if (from === 'pending' || to === 'pending') return shorePoints; // deploy/return owns this boundary
  if (!canTransition(from, to)) return shorePoints; // single-step only
  if (trigger.status !== from) return shorePoints; // stale / out-of-order trigger

  const individual = !trigger.groupId || INDIVIDUAL_PHASE.includes(trigger.status);
  const affected = new Set(
    individual ? [trigger.id] : shorePoints.filter((sp) => sp.groupId === trigger.groupId).map((sp) => sp.id),
  );

  return shorePoints.map((m) => {
    if (!affected.has(m.id)) return m;
    if (m.status !== from) return m; // only lockstep members move; ahead/behind untouched (L-7)
    return { ...m, status: to };
  });
}

/** Apply one event to the operation projection. Pure; never mutates `state`. */
export function operationReducer(state: OperationState, event: FieldShoreEvent): OperationState {
  switch (event.type) {
    case 'OperationCreated':
      return {
        ...state,
        operation: {
          id: event.opId,
          name: event.name,
          multiBuilding: event.multiBuilding,
          inlineDeploy: event.inlineDeploy ?? true, // absent (old events) → one-step inline
          location: event.location,
          divisions: [1], // Ground level — grown via DivisionAdded, never on the wire
          status: 'active',
          createdAt: event.at,
        },
      };

    case 'OperationEdited': {
      if (!state.operation) return state;
      const op: Operation = { ...state.operation };
      if (event.name !== undefined) op.name = event.name;
      if (event.multiBuilding !== undefined) op.multiBuilding = event.multiBuilding;
      if (event.inlineDeploy !== undefined) op.inlineDeploy = event.inlineDeploy;
      if (event.location !== undefined) op.location = event.location ?? undefined; // null clears
      return { ...state, operation: op };
    }

    case 'OperationEnded':
      if (!state.operation) return state;
      return { ...state, operation: { ...state.operation, status: 'ended' } };

    case 'DivisionAdded': {
      // Idempotent: concurrent "add floor above" from two devices converges.
      if (!state.operation) return state;
      if (state.operation.divisions.includes(event.division)) return state;
      return {
        ...state,
        operation: { ...state.operation, divisions: [...state.operation.divisions, event.division] },
      };
    }

    case 'ShorePointAdded':
      return { ...state, shorePoints: [...state.shorePoints, event.shorePoint] };

    case 'ShorePointDeleted':
      // hard (structural, e.g. a strut dropped on a type change): filter it out
      // for good. Default soft-delete (#319): flag, don't filter — the point stays
      // in the array so it's restorable and its seq stays a high-water mark.
      return event.hard
        ? { ...state, shorePoints: state.shorePoints.filter((sp) => sp.id !== event.spId) }
        : {
            ...state,
            shorePoints: state.shorePoints.map((sp) =>
              sp.id === event.spId ? { ...sp, deletedAt: event.at } : sp,
            ),
          };

    case 'ShorePointRestored':
      return {
        ...state,
        shorePoints: state.shorePoints.map((sp) =>
          sp.id === event.spId ? { ...sp, deletedAt: undefined } : sp,
        ),
      };

    case 'ShorePointStatusChanged':
      return { ...state, shorePoints: groupAdvance(state.shorePoints, event.spId, event.from, event.to) };

    case 'ShorePointEdited':
    case 'StrutDeployed':
    case 'StrutReturned':
      return { ...state, shorePoints: state.shorePoints.map((sp) => shorePointReducer(sp, event)) };

    default:
      return state;
  }
}

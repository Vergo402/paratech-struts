import type { Operation, ShorePoint, ShorePointStatus, FieldShoreEvent, OrgPositions, Hazards } from '../schema';
import { shorePointReducer, canTransition, applyCuttingFields } from '../shorepoint';
import { orgReducer, seedOrgState, type PendingTransfer } from '../org';
import { hazardReducer } from '../hazard';
import { checklistReducer, type Checklists } from '../checklist';

// The projected current state of one operation: the operation record + its shore
// points in insertion order, plus the ICS org chart (#323) — the keyed position
// tree and the per-device My Role map. Built from the event log by projectOperation().
export interface OperationState {
  operation: Operation | null;
  shorePoints: ShorePoint[];
  positions: OrgPositions; //                 ICS org chart, seeded on OperationCreated
  myRoles: Record<string, string | null>; //  uid → positionId (device self-declaration)
  commandTransfer: PendingTransfer | null; //  pending command handoff (ADR-021), or null
  hazards: Hazards; //                         ICS-208 hazard register (#296), keyed by id
  checklists: Checklists; //                   doctrine-attestation state, keyed by checklistId::instanceId (#203/#204/#205)
}

export const EMPTY_OPERATION_STATE: OperationState = {
  operation: null,
  shorePoints: [],
  positions: {},
  myRoles: {},
  commandTransfer: null,
  hazards: {},
  checklists: {},
};

// The pre-runner "group zone": process ↔ strutset ↔ cutting. A grouped transition
// whose BOTH endpoints sit in this zone moves every lockstep member at once —
// which makes the strutset↔cutting edge group-wide in BOTH directions, including
// the cutting→strutset step-back (13-cutting.md; Alex's ruling 2026-06-17 — a
// 3-Post is one physical shore, so re-cutting it pulls the whole set back). The
// individual phase begins at the runner handoff: Send to Runner (cutting→runner)
// and every runner/secured move is per-card, so those edges leave the zone and
// fan out to the trigger alone. Keying on the EDGE (from+to), not the from-status,
// is what lets one `cutting` node be group-wide back yet individual forward.
const GROUP_ZONE: readonly ShorePointStatus[] = ['process', 'strutset', 'cutting'];

/**
 * L-7 group fan-out. A status change on a grouped point whose edge stays inside
 * the GROUP_ZONE (process↔strutset↔cutting) moves every group member that is IN
 * LOCKSTEP with the trigger (same current status); an edge that leaves the zone
 * (Send to Runner and beyond) or an ungrouped point moves only itself. A mate that
 * is ahead or behind is left untouched — so a grouped transition can never regress
 * a mate that has advanced (the L-7 invariant), and never force-jumps a laggard
 * across the pending/deploy boundary. Both directions are symmetric (ADR-010), so
 * the cutting→strutset step-back fans out exactly like the strutset→cutting entry.
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
  at: number,
): ShorePoint[] {
  const trigger = shorePoints.find((sp) => sp.id === spId);
  if (!trigger) return shorePoints;
  if (from === 'pending' || to === 'pending') return shorePoints; // deploy/return owns this boundary
  if (!canTransition(from, to)) return shorePoints; // single-step only
  if (trigger.status !== from) return shorePoints; // stale / out-of-order trigger

  const individual = !trigger.groupId || !(GROUP_ZONE.includes(from) && GROUP_ZONE.includes(to));
  const affected = new Set(
    individual ? [trigger.id] : shorePoints.filter((sp) => sp.groupId === trigger.groupId).map((sp) => sp.id),
  );

  return shorePoints.map((m) => {
    if (!affected.has(m.id)) return m;
    if (m.status !== from) return m; // only lockstep members move; ahead/behind untouched (L-7)
    // applyCuttingFields stamps/clears the cutting-queue bookkeeping for the
    // strutset↔cutting edges (#222); a no-op on every other transition.
    return applyCuttingFields({ ...m, status: to }, from, to, at);
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
        // Seed the ADR-008 default org chart with the founding device as IC (free on
        // re-fold for existing ops — the divisions:[1] precedent, no migration).
        ...seedOrgState(event.opId, event.by),
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

    case 'OperationReopened':
      // ADR-036 — un-archive. Folded per-op (projectOperationById/projectArchive),
      // the op's OperationEnded comes first then this, so the final status is active.
      if (!state.operation) return state;
      return { ...state, operation: { ...state.operation, status: 'active' } };

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
      return {
        ...state,
        shorePoints: groupAdvance(state.shorePoints, event.spId, event.from, event.to, event.at),
      };

    case 'ShorePointEdited':
    case 'StrutDeployed':
    case 'StrutReturned':
    case 'EquipmentDeployed':
    case 'EquipmentReturned':
    case 'EquipmentReclaimed':
    case 'ComponentResourced':
      return { ...state, shorePoints: state.shorePoints.map((sp) => shorePointReducer(sp, event)) };

    // ICS org chart (#323) — delegated to the pure orgReducer over the two org slices.
    case 'PositionAdded':
    case 'PositionRemoved':
    case 'PositionRenamed':
    case 'PositionReparented':
    case 'PositionReordered':
    case 'ResourceAssigned':
    case 'ResourceCleared':
    case 'MyRoleSet':
    case 'CommandTransferInitiated':
    case 'CommandTransferAccepted':
    case 'CommandTransferDeclined':
    case 'CommandTransferCancelled': {
      const org = orgReducer(
        { positions: state.positions, myRoles: state.myRoles, commandTransfer: state.commandTransfer },
        event,
      );
      return { ...state, positions: org.positions, myRoles: org.myRoles, commandTransfer: org.commandTransfer };
    }

    // ICS-208 hazard register (#296) — delegated to the pure hazardReducer.
    case 'HazardLogged':
    case 'HazardMitigated':
    case 'HazardReopened': {
      const h = hazardReducer({ hazards: state.hazards }, event);
      return { ...state, hazards: h.hazards };
    }

    // Checklist attestation (#203/#204/#205) — delegated to the pure checklistReducer.
    case 'ChecklistItemChecked':
    case 'ChecklistItemUnchecked': {
      const c = checklistReducer({ checklists: state.checklists }, event);
      return { ...state, checklists: c.checklists };
    }

    default:
      return state;
  }
}

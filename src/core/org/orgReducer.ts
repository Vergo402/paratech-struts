import type { FieldShoreEvent } from '../schema/event';
import type { OrgPositions } from '../schema/org';
import { subtreeIds, wouldCreateCycle, rootPosition } from './tree';
import { sameResource } from './resource';
import { canAccept, currentIC, type PendingTransfer } from './transfer';
import { buildDefaultTree, defaultPositionId } from './defaultTree';

// The org projection slices: the keyed position tree, the per-device My Role map,
// and the pending command transfer (ADR-021 — null unless a handshake is in flight).
export interface OrgState {
  positions: OrgPositions;
  myRoles: Record<string, string | null>;
  commandTransfer: PendingTransfer | null;
}

// Seeded on OperationCreated: the ADR-008 default tree, with the FOUNDING DEVICE
// holding Incident Commander (its uid is the IC node's leader, so the gold accent
// has a target from t=0 — workflow "founding device holds IC by default"). Pre-auth
// the label is "This device"; a real name drops in when the device sets one.
export function seedOrgState(opId: string, by: string): OrgState {
  const positions = buildDefaultTree(opId);
  const icId = defaultPositionId(opId, 'ic');
  const ic = positions[icId];
  if (ic) positions[icId] = { ...ic, assignedResources: [{ ref: 'device', value: by, label: 'This device' }] };
  return { positions, myRoles: { [by]: icId }, commandTransfer: null };
}

// Fold one org/My-Role event. Pure. Every illegal/stale event no-ops deterministically
// (so projection never crashes and replay is safe). Delegated to from operationReducer.
export function orgReducer(state: OrgState, event: FieldShoreEvent): OrgState {
  switch (event.type) {
    case 'PositionAdded': {
      if (state.positions[event.position.id]) return state; // idempotent by id
      return { ...state, positions: { ...state.positions, [event.position.id]: event.position } };
    }

    case 'PositionRemoved': {
      const target = state.positions[event.positionId];
      if (!target || target.builtIn) return state; // protect built-ins + missing
      const drop = new Set<string>([event.positionId, ...subtreeIds(state.positions, event.positionId)]);
      const positions: OrgPositions = {};
      for (const [id, p] of Object.entries(state.positions)) if (!drop.has(id)) positions[id] = p;
      return { ...state, positions };
    }

    case 'PositionRenamed': {
      const p = state.positions[event.positionId];
      if (!p) return state;
      return { ...state, positions: { ...state.positions, [p.id]: { ...p, title: event.title } } };
    }

    case 'PositionReparented': {
      const p = state.positions[event.positionId];
      const parent = state.positions[event.newParentId];
      if (!p || p.parentId === null || !parent) return state; // root can't move; new parent must exist
      if (wouldCreateCycle(state.positions, event.positionId, event.newParentId)) return state; // fold-time guard
      return { ...state, positions: { ...state.positions, [p.id]: { ...p, parentId: event.newParentId } } };
    }

    case 'PositionReordered': {
      const p = state.positions[event.positionId];
      if (!p) return state;
      return { ...state, positions: { ...state.positions, [p.id]: { ...p, order: event.order } } };
    }

    case 'ResourceAssigned': {
      const p = state.positions[event.positionId];
      if (!p) return state;
      if (p.assignedResources.some((r) => sameResource(r, event.resource))) return state; // dedup
      return {
        ...state,
        positions: {
          ...state.positions,
          [p.id]: { ...p, assignedResources: [...p.assignedResources, event.resource] },
        },
      };
    }

    case 'ResourceCleared': {
      const p = state.positions[event.positionId];
      if (!p) return state;
      const target = event.resource;
      const next = target ? p.assignedResources.filter((r) => !sameResource(r, target)) : [];
      return { ...state, positions: { ...state.positions, [p.id]: { ...p, assignedResources: next } } };
    }

    case 'MyRoleSet': {
      const myRoles = { ...state.myRoles };
      if (event.positionId == null) delete myRoles[event.by];
      else myRoles[event.by] = event.positionId;
      return { ...state, myRoles };
    }

    // ── Command transfer (ADR-021) — the two-party handshake. Pending state is a
    // projection field; command does NOT move until the incoming accepts.
    case 'CommandTransferInitiated': {
      // Only the current IC of record may initiate. Pre-auth soft check: when the IC
      // leader is a device, require by === that uid; an individual/apparatus IC can't
      // be uid-verified pre-auth (the UI gates the button). Replay-safe (projection only).
      const ic = currentIC(state.positions);
      if (ic && ic.ref === 'device' && ic.value !== event.by) return state;
      return {
        ...state,
        commandTransfer: {
          initiatedBy: event.by,
          toResource: event.toResource,
          at: event.at,
          ...(event.claimCode ? { claimCode: event.claimCode } : {}), // #425
        },
      };
    }

    case 'CommandTransferAccepted': {
      const pending = state.commandTransfer;
      if (!canAccept(pending, event.by)) return state; // no pending, or wrong device
      const ic = rootPosition(state.positions);
      if (!ic) return state;
      // Move command: incoming becomes the sole leader (replaces index 0 — the
      // outgoing IC steps out of the slot); any pre-existing staff at index >0 stay,
      // de-duped against the incoming. Always exactly one IC of record.
      const rest = ic.assignedResources.slice(1).filter((r) => !sameResource(r, pending!.toResource));
      return {
        ...state,
        positions: { ...state.positions, [ic.id]: { ...ic, assignedResources: [pending!.toResource, ...rest] } },
        commandTransfer: null,
      };
    }

    // Decline (incoming) / Cancel (outgoing) — identical fold (clear pending; command
    // stays with the outgoing IC). They differ only in who emits + the role-history record.
    case 'CommandTransferDeclined':
    case 'CommandTransferCancelled': {
      if (!state.commandTransfer) return state;
      return { ...state, commandTransfer: null };
    }

    default:
      return state;
  }
}

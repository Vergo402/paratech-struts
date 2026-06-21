import type { FieldShoreEvent } from '../schema/event';
import type { OrgPositions } from '../schema/org';
import { subtreeIds, wouldCreateCycle } from './tree';
import { sameResource } from './resource';
import { buildDefaultTree, defaultPositionId } from './defaultTree';

// The org projection slices: the keyed position tree + the per-device My Role map.
export interface OrgState {
  positions: OrgPositions;
  myRoles: Record<string, string | null>;
}

export const EMPTY_ORG_STATE: OrgState = { positions: {}, myRoles: {} };

// Seeded on OperationCreated: the ADR-008 default tree, with the FOUNDING DEVICE
// holding Incident Commander (its uid is the IC node's leader, so the gold accent
// has a target from t=0 — workflow "founding device holds IC by default"). Pre-auth
// the label is "This device"; a real name drops in when the device sets one.
export function seedOrgState(opId: string, by: string): OrgState {
  const positions = buildDefaultTree(opId);
  const icId = defaultPositionId(opId, 'ic');
  const ic = positions[icId];
  if (ic) positions[icId] = { ...ic, assignedResources: [{ ref: 'device', value: by, label: 'This device' }] };
  return { positions, myRoles: { [by]: icId } };
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

    default:
      return state;
  }
}

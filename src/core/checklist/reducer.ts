import type { FieldShoreEvent } from '../schema/event';

// The checklist attestation projection slice — who checked which leaf, when.
// Mirrors HazardState: a thin slice operationReducer delegates to. The TEMPLATE
// (the tree) is department config elsewhere (core/checklist/baseline.ts +, in
// Session 3, a meta-row store); this slice holds only the per-instance check state.

/** One leaf's attestation — the spelled-out role + the device uid + the time. */
export interface Attestation {
  by: string; //   device uid (event.by)
  role: string; // ICS title at check time, spelled out (ADR-008)
  at: number; //   epoch ms
}

export type ChecklistInstance = Record<string, Attestation>; // itemId -> attestation
export type Checklists = Record<string, ChecklistInstance>; //  instanceKey -> instance

export interface ChecklistState {
  checklists: Checklists;
}

export const EMPTY_CHECKLIST_STATE: ChecklistState = { checklists: {} };

// instanceKey = checklistId + instanceId. checklistId is a fixed enum value (no
// '::'), so the delimiter can never collide -- one checklist's op-instance stays
// distinct from another's.
export function checklistInstanceKey(checklistId: string, instanceId: string): string {
  return `${checklistId}::${instanceId}`;
}

// A STABLE empty instance — returned for any not-yet-attested instance so a zustand
// useSyncExternalStore selector keeps a constant reference across renders (a fresh
// `?? {}` each call is a new snapshot every render = infinite-loop warning + crash).
const EMPTY_INSTANCE: ChecklistInstance = {};

/** Read one instance's attestations (itemId -> attestation), or a stable empty. */
export function checklistInstance(
  state: ChecklistState,
  checklistId: string,
  instanceId: string,
): ChecklistInstance {
  return state.checklists[checklistInstanceKey(checklistId, instanceId)] ?? EMPTY_INSTANCE;
}

/**
 * Fold one checklist event. Pure; never mutates `state`. A check sets the leaf's
 * attestation (last-write-wins, so a re-check re-attributes); an un-check removes
 * it (idempotent -- un-checking an already-clear leaf no-ops). Delegated to from
 * operationReducer. Every other event type no-ops.
 */
export function checklistReducer(state: ChecklistState, event: FieldShoreEvent): ChecklistState {
  switch (event.type) {
    case 'ChecklistItemChecked': {
      const key = checklistInstanceKey(event.checklistId, event.instanceId);
      const inst = state.checklists[key] ?? {};
      return {
        ...state,
        checklists: {
          ...state.checklists,
          [key]: { ...inst, [event.itemId]: { by: event.by, role: event.role, at: event.at } },
        },
      };
    }

    case 'ChecklistItemUnchecked': {
      const key = checklistInstanceKey(event.checklistId, event.instanceId);
      const inst = state.checklists[key];
      if (!inst || !(event.itemId in inst)) return state; // idempotent (safe replay)
      const next = { ...inst };
      delete next[event.itemId];
      return { ...state, checklists: { ...state.checklists, [key]: next } };
    }

    default:
      return state;
  }
}

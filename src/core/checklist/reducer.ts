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

/** One ORM/TCRM briefing session — the Begin/End bracket (#205). `endedAt` absent
 *  ⟺ the session is still active. The briefing's step attestations live in
 *  `checklists` under instanceId = the briefing id. */
export interface Briefing {
  id: string;
  startedAt: number;
  startedBy: string;
  endedAt?: number;
}
export type Briefings = Record<string, Briefing>; // briefingId -> session

export interface ChecklistState {
  checklists: Checklists;
  briefings: Briefings;
}

export const EMPTY_CHECKLIST_STATE: ChecklistState = { checklists: {}, briefings: {} };

/** The most-recently-started briefing that has not been ended, or null. The ORM
 *  entry point resumes this rather than spawning a duplicate session. */
export function activeBriefing(state: ChecklistState): Briefing | null {
  let active: Briefing | null = null;
  for (const b of Object.values(state.briefings)) {
    if (b.endedAt == null && (active == null || b.startedAt > active.startedAt)) active = b;
  }
  return active;
}

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

    case 'BriefingStarted': {
      if (state.briefings[event.briefingId]) return state; // idempotent by id
      return {
        ...state,
        briefings: {
          ...state.briefings,
          [event.briefingId]: { id: event.briefingId, startedAt: event.at, startedBy: event.by },
        },
      };
    }

    case 'BriefingEnded': {
      const b = state.briefings[event.briefingId];
      if (!b || b.endedAt != null) return state; // missing / already ended
      return { ...state, briefings: { ...state.briefings, [b.id]: { ...b, endedAt: event.at } } };
    }

    default:
      return state;
  }
}

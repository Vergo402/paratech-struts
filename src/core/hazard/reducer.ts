import type { FieldShoreEvent } from '../schema/event';
import type { Hazard, Hazards, HazardSeverity } from '../schema/hazard';
import { parseDivisionNumber } from '../operation/division';

// The hazard projection slice — the keyed ICS-208 register. Mirrors OrgState: a
// thin slice the operationReducer delegates to (like shorePointReducer/orgReducer).
export interface HazardState {
  hazards: Hazards;
}

export const EMPTY_HAZARD_STATE: HazardState = { hazards: {} };

// Fold one hazard event. Pure. Every illegal/stale event no-ops deterministically
// (projection never crashes; replay is safe). Delegated to from operationReducer.
export function hazardReducer(state: HazardState, event: FieldShoreEvent): HazardState {
  switch (event.type) {
    case 'HazardLogged': {
      if (state.hazards[event.hazard.id]) return state; // idempotent by id (safe replay)
      return { ...state, hazards: { ...state.hazards, [event.hazard.id]: event.hazard } };
    }

    case 'HazardMitigated': {
      const h = state.hazards[event.hazardId];
      if (!h || h.mitigatedAt != null) return state; // missing / already mitigated
      return {
        ...state,
        hazards: { ...state.hazards, [h.id]: { ...h, mitigatedBy: event.by, mitigatedAt: event.at } },
      };
    }

    case 'HazardReopened': {
      const h = state.hazards[event.hazardId];
      if (!h || h.mitigatedAt == null) return state; // missing / already open
      // Clear the mitigation stamp (reversible, ADR-010 — not a timed undo). The
      // undefined-assignment idiom matches the operationReducer (deletedAt: undefined).
      return {
        ...state,
        hazards: { ...state.hazards, [h.id]: { ...h, mitigatedBy: undefined, mitigatedAt: undefined } },
      };
    }

    default:
      return state;
  }
}

const SEVERITY_RANK: Record<HazardSeverity, number> = { high: 3, medium: 2, low: 1 };

/** The short severity word for badges (one-tone red, distinguished by the word —
 *  Alex 2026-06-29, #394). Shared by the register rows and the SP-card badge. */
export function severityWord(sev: HazardSeverity): 'HIGH' | 'MED' | 'LOW' {
  return sev === 'high' ? 'HIGH' : sev === 'medium' ? 'MED' : 'LOW';
}

/**
 * Hazards in list order (the v3 sort): OPEN first, then by severity (high→low),
 * then by recency (newest first); mitigated hazards drop to the bottom in the same
 * inner order. The Hazard Log and the SitStat summary both read this.
 */
export function openHazardsBySeverity(hazards: Hazards): Hazard[] {
  return Object.values(hazards).sort((a, b) => {
    const am = a.mitigatedAt != null;
    const bm = b.mitigatedAt != null;
    if (am !== bm) return am ? 1 : -1; // open before mitigated
    const sev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (sev !== 0) return sev;
    return b.reportedAt - a.reportedAt; // newer first
  });
}

/**
 * Open hazards whose free-text `location` resolves to the given shore-point
 * division — what badges an SP card (P9). Resolution is the conservative
 * exact-division-number match (division.ts): a location that does NOT resolve to a
 * division matches nothing, so an unresolvable hazard shows in the log + header
 * only, NEVER on the wrong card (the v4.0 rule, hazard-log §"Two things v4 adds").
 * Mitigated hazards drop off the cards. Structured per-area binding is deferred.
 */
export function hazardsForDivision(hazards: Hazards, division: string | undefined): Hazard[] {
  const target = parseDivisionNumber(division);
  if (target === null) return [];
  return openHazardsBySeverity(hazards).filter(
    (h) => h.mitigatedAt == null && parseDivisionNumber(h.location) === target,
  );
}

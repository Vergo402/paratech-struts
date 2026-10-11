import type { FieldShoreEvent } from '../schema/event';
import type { Hazard, Hazards, HazardSeverity } from '../schema/hazard';
import { parseDivisionNumber } from '../operation/division';
import { resolveHazardDivision } from './location';

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
 * one-Division match (`resolveHazardDivision`): a bare number ("2"), "Div N" /
 * "Division N" / "DN", or "BN" / "Basement N" (sub-grade) that names exactly ONE
 * Division. A location naming two Divisions, or none, matches nothing — it shows in
 * the log + header only, NEVER on the wrong card (the v4.0 rule, hazard-log §Step 4;
 * Alex 2026-10-11, #511). Mitigated hazards drop off the cards. Structured per-area binding is deferred.
 */
export function hazardsForDivision(hazards: Hazards, division: string | undefined): Hazard[] {
  const target = parseDivisionNumber(division);
  if (target === null) return [];
  return openHazardsBySeverity(hazards).filter(
    (h) => h.mitigatedAt == null && resolveHazardDivision(h.location) === target,
  );
}

/**
 * The worst OPEN hazard severity per shore-point division — the O(1)-per-card
 * companion to `hazardsForDivision`, built once per render so the board's per-card
 * selector (#501) is a Map lookup instead of a re-sort per card. Same conservative
 * one-Division rule (`resolveHazardDivision`: "2", "Div 2", "Division 2", "D2",
 * "B1" / "Basement 1" -> -1): a `location` naming two Divisions, or none, badges
 * nothing (log + header only, never the wrong card). Mitigated hazards are skipped.
 * `openHazardsBySeverity` sorts open-first then high→low, so the first hit per
 * division is the worst.
 */
export function worstHazardByDivision(hazards: Hazards): Map<number, HazardSeverity> {
  const worst = new Map<number, HazardSeverity>();
  for (const h of openHazardsBySeverity(hazards)) {
    if (h.mitigatedAt != null) continue;
    const n = resolveHazardDivision(h.location);
    if (n === null || worst.has(n)) continue;
    worst.set(n, h.severity);
  }
  return worst;
}

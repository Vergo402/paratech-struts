import { describe, it, expect } from 'vitest';
import type { FieldShoreEvent, Hazard } from '../schema';
import { projectOperation } from '../operation/projection';
import { hazardReducer, EMPTY_HAZARD_STATE, openHazardsBySeverity, hazardsForDivision } from './reducer';

const OP = 'op1';
const DEV = 'dev1';

let n = 0;
const base = () => ({ id: `e${n++}`, opId: OP, at: 1, by: DEV });

function created(): FieldShoreEvent {
  return { type: 'OperationCreated', ...base(), name: 'Maple St.', multiBuilding: false };
}

function hz(over: Partial<Hazard> & { id: string }): Hazard {
  return {
    type: 'structural',
    location: '2',
    severity: 'medium',
    reportedBy: DEV,
    reportedAt: 1,
    ...over,
  };
}
const logged = (h: Hazard, at = 1): FieldShoreEvent => ({ type: 'HazardLogged', ...base(), at, hazard: h });

describe('hazardReducer (log / mitigate / reopen)', () => {
  it('logs a hazard; re-logging the same id no-ops (idempotent)', () => {
    let s = EMPTY_HAZARD_STATE;
    s = hazardReducer(s, logged(hz({ id: 'h1' })));
    s = hazardReducer(s, logged(hz({ id: 'h1', location: 'changed' })));
    expect(Object.keys(s.hazards)).toHaveLength(1);
    expect(s.hazards['h1']!.location).toBe('2'); // first wins
  });

  it('mitigate stamps by/at; reopen clears the stamp', () => {
    let s = hazardReducer(EMPTY_HAZARD_STATE, logged(hz({ id: 'h1' })));
    s = hazardReducer(s, { type: 'HazardMitigated', ...base(), at: 50, by: 'dev2', hazardId: 'h1' });
    expect(s.hazards['h1']!.mitigatedBy).toBe('dev2');
    expect(s.hazards['h1']!.mitigatedAt).toBe(50);
    s = hazardReducer(s, { type: 'HazardReopened', ...base(), hazardId: 'h1' });
    expect(s.hazards['h1']!.mitigatedAt).toBeUndefined();
    expect(s.hazards['h1']!.mitigatedBy).toBeUndefined();
  });

  it('mitigate on missing / already-mitigated, reopen on open / missing → no-op', () => {
    let s = hazardReducer(EMPTY_HAZARD_STATE, logged(hz({ id: 'h1' })));
    const open = s;
    expect(hazardReducer(s, { type: 'HazardReopened', ...base(), hazardId: 'h1' })).toBe(open); // already open
    expect(hazardReducer(s, { type: 'HazardMitigated', ...base(), hazardId: 'nope' })).toBe(open); // missing
    s = hazardReducer(s, { type: 'HazardMitigated', ...base(), at: 50, hazardId: 'h1' });
    const mit = s;
    expect(hazardReducer(s, { type: 'HazardMitigated', ...base(), hazardId: 'h1' })).toBe(mit); // already mitigated
  });
});

describe('openHazardsBySeverity', () => {
  it('open-first, then severity high→low, then newest first; mitigated to the bottom', () => {
    let s = EMPTY_HAZARD_STATE;
    s = hazardReducer(s, logged(hz({ id: 'lo', severity: 'low', reportedAt: 10 })));
    s = hazardReducer(s, logged(hz({ id: 'hi-old', severity: 'high', reportedAt: 10 })));
    s = hazardReducer(s, logged(hz({ id: 'hi-new', severity: 'high', reportedAt: 20 })));
    s = hazardReducer(s, logged(hz({ id: 'mit-high', severity: 'high', reportedAt: 30 })));
    s = hazardReducer(s, { type: 'HazardMitigated', ...base(), at: 99, hazardId: 'mit-high' });
    expect(openHazardsBySeverity(s.hazards).map((h) => h.id)).toEqual(['hi-new', 'hi-old', 'lo', 'mit-high']);
  });
});

describe('hazardsForDivision (SP-card resolution — never the wrong card)', () => {
  it('matches an open hazard whose numeric location resolves to the division', () => {
    let s = EMPTY_HAZARD_STATE;
    s = hazardReducer(s, logged(hz({ id: 'd2', location: '2' })));
    s = hazardReducer(s, logged(hz({ id: 'd3', location: '3' })));
    expect(hazardsForDivision(s.hazards, '2').map((h) => h.id)).toEqual(['d2']);
  });

  it('an unresolvable free-text location matches NO division (log + header only)', () => {
    let s = EMPTY_HAZARD_STATE;
    s = hazardReducer(s, logged(hz({ id: 'free', location: 'northeast stairwell' })));
    expect(hazardsForDivision(s.hazards, '2')).toEqual([]);
    expect(hazardsForDivision(s.hazards, undefined)).toEqual([]);
  });

  it('a mitigated hazard drops off the card', () => {
    let s = hazardReducer(EMPTY_HAZARD_STATE, logged(hz({ id: 'd2', location: '2' })));
    expect(hazardsForDivision(s.hazards, '2')).toHaveLength(1);
    s = hazardReducer(s, { type: 'HazardMitigated', ...base(), at: 9, hazardId: 'd2' });
    expect(hazardsForDivision(s.hazards, '2')).toEqual([]);
  });
});

describe('hazards via the operation projection (the free slice)', () => {
  it('OperationCreated seeds an empty register; events fold through', () => {
    const s = projectOperation([created(), logged(hz({ id: 'h1', location: '2' }))]);
    expect(Object.keys(s.hazards)).toEqual(['h1']);
    expect(hazardsForDivision(s.hazards, '2')).toHaveLength(1);
  });
});

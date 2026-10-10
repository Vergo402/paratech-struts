import { describe, it, expect } from 'vitest';
import { NO_DEDUCTIONS, type ShorePoint, type ShorePointStatus, type FieldShoreEvent } from '../schema';
import { deployedStrutOf } from '../shorepoint';
import { operationReducer, mapSame, EMPTY_OPERATION_STATE, type OperationState } from './reducer';
import { projectOperation } from './projection';
import { nextSeqBase } from './seq';

function sp(id: string, over: Partial<ShorePoint> = {}): ShorePoint {
  return {
    id,
    opId: 'op1',
    division: '1',
    shoreType: 't-shore',
    measurementEighths: 40 * 8,
    deductions: NO_DEDUCTIONS,
    status: 'pending',
    ...over,
  };
}

function stateWith(points: ShorePoint[]): OperationState {
  return {
    operation: { id: 'op1', name: 'Test', multiBuilding: false, inlineDeploy: false, divisions: [1], saws: ['A'], status: 'active', createdAt: 1, currentPeriod: 1, periods: [{ number: 1, startedAt: 1 }] },
    shorePoints: points,
    positions: {},
    myRoles: {},
    commandTransfer: null,
    hazards: {},
    checklists: {},
    briefings: {},
  };
}

function statusEvent(spId: string, from: ShorePointStatus, to: ShorePointStatus): FieldShoreEvent {
  return { type: 'ShorePointStatusChanged', id: 'e', opId: 'op1', at: 1, by: 't', spId, from, to };
}

const byId = (s: OperationState, id: string): ShorePoint => s.shorePoints.find((p) => p.id === id)!;

// Groups = the struts of ONE physical multi-strut shore (KB-7 per-shore
// grouping). The reducer is groupId-driven, so the fixtures stay abstract.
describe('L-7 group fan-out', () => {
  it('a pre-cutting advance moves every lockstep group member at once', () => {
    const state = stateWith([
      sp('a', { groupId: 'g', status: 'process' }),
      sp('b', { groupId: 'g', status: 'process' }),
      sp('c', { groupId: 'g', status: 'process' }),
    ]);
    const next = operationReducer(state, statusEvent('a', 'process', 'strutset'));
    expect(byId(next, 'a').status).toBe('strutset');
    expect(byId(next, 'b').status).toBe('strutset');
    expect(byId(next, 'c').status).toBe('strutset');
  });

  it('SKIPS a group member already advanced past the trigger — never regresses it', () => {
    const state = stateWith([
      sp('a', { groupId: 'g', status: 'cutting' }), // already ahead
      sp('b', { groupId: 'g', status: 'process' }),
      sp('c', { groupId: 'g', status: 'process' }),
    ]);
    const next = operationReducer(state, statusEvent('b', 'process', 'strutset'));
    expect(byId(next, 'a').status).toBe('cutting'); // untouched — not regressed
    expect(byId(next, 'b').status).toBe('strutset');
    expect(byId(next, 'c').status).toBe('strutset');
  });

  it('a group step-back (reverse) moves lockstep members, never regresses an advanced mate', () => {
    const state = stateWith([
      sp('a', { groupId: 'g', status: 'cutting' }),
      sp('b', { groupId: 'g', status: 'strutset' }),
      sp('c', { groupId: 'g', status: 'strutset' }),
    ]);
    const next = operationReducer(state, statusEvent('b', 'strutset', 'process'));
    expect(byId(next, 'a').status).toBe('cutting'); // ahead — untouched
    expect(byId(next, 'b').status).toBe('process');
    expect(byId(next, 'c').status).toBe('process');
  });

  it('Send to Runner (cutting → runner) is individual — leaves the group zone', () => {
    const state = stateWith([
      sp('a', { groupId: 'g', status: 'cutting' }),
      sp('b', { groupId: 'g', status: 'cutting' }),
    ]);
    const next = operationReducer(state, statusEvent('a', 'cutting', 'runner'));
    expect(byId(next, 'a').status).toBe('runner');
    expect(byId(next, 'b').status).toBe('cutting'); // not swept along — per-card from here
  });

  it('the cutting → strutset step-back is GROUP-wide (Alex 2026-06-17; 13-cutting.md)', () => {
    const state = stateWith([
      sp('a', { groupId: 'g', status: 'cutting' }),
      sp('b', { groupId: 'g', status: 'cutting' }),
      sp('c', { groupId: 'g', status: 'cutting' }),
    ]);
    const next = operationReducer(state, statusEvent('a', 'cutting', 'strutset'));
    expect(byId(next, 'a').status).toBe('strutset');
    expect(byId(next, 'b').status).toBe('strutset'); // whole set pulled back
    expect(byId(next, 'c').status).toBe('strutset');
  });

  it('cutting → strutset step-back never regresses a mate already sent to the runner (L-7)', () => {
    const state = stateWith([
      sp('a', { groupId: 'g', status: 'cutting' }),
      sp('b', { groupId: 'g', status: 'runner' }), // already sent — ahead
    ]);
    const next = operationReducer(state, statusEvent('a', 'cutting', 'strutset'));
    expect(byId(next, 'a').status).toBe('strutset');
    expect(byId(next, 'b').status).toBe('runner'); // untouched — only lockstep members move
  });

  it('an ungrouped point advances only itself', () => {
    const state = stateWith([sp('a', { status: 'process' }), sp('b', { status: 'process' })]);
    const next = operationReducer(state, statusEvent('a', 'process', 'strutset'));
    expect(byId(next, 'a').status).toBe('strutset');
    expect(byId(next, 'b').status).toBe('process');
  });

  it('never sweeps a still-Pending member across the deploy boundary', () => {
    const state = stateWith([
      sp('a', { groupId: 'g', status: 'process' }),
      sp('b', { groupId: 'g', status: 'pending' }), // not yet deployed
    ]);
    const next = operationReducer(state, statusEvent('a', 'process', 'strutset'));
    expect(byId(next, 'a').status).toBe('strutset');
    expect(byId(next, 'b').status).toBe('pending'); // untouched
  });

  it('ignores a raw ShorePointStatusChanged across the secured→returned boundary (audit #2)', () => {
    // That inventory boundary is owned by EquipmentReclaimed (it restores stock). A
    // raw status change would land 'returned' with stock still held (strand). No
    // in-app path drives it; a peer/replay could — the reducer no-ops it, like the
    // symmetric pending boundary.
    const state = stateWith([sp('a', { status: 'secured', deployedBom: [{ role: 'strut', model: 'LS 406', source: 'Rescue 2', inventoryId: 'i1' }] })]);
    const next = operationReducer(state, statusEvent('a', 'secured', 'returned'));
    expect(byId(next, 'a').status).toBe('secured'); // held — reclaim owns this edge
  });
});

describe('EquipmentReclaimed (#224) — terminal Remove & Return routes to the SP reducer', () => {
  const deployed = { model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv1' };
  const deployedBom = [{ role: 'strut' as const, ...deployed }];
  const reclaim = (spId: string): FieldShoreEvent => ({ type: 'EquipmentReclaimed', id: 'e', opId: 'op1', at: 1, by: 't', spId });

  it('moves Wood Shore Secured → Returned, keeping the strut, and never touches a different point', () => {
    const state = stateWith([
      sp('a', { status: 'secured', deployedBom }),
      sp('b', { status: 'secured', deployedBom }),
    ]);
    const next = operationReducer(state, reclaim('a'));
    expect(byId(next, 'a').status).toBe('returned');
    expect(deployedStrutOf(byId(next, 'a'))).toEqual({ role: 'strut', ...deployed }); // retained as history
    expect(byId(next, 'b').status).toBe('secured'); // individual — not swept
  });

  it('is individual even within a group (terminal is per-card)', () => {
    const state = stateWith([
      sp('a', { groupId: 'g', status: 'secured', deployedBom }),
      sp('b', { groupId: 'g', status: 'secured', deployedBom }),
    ]);
    const next = operationReducer(state, reclaim('a'));
    expect(byId(next, 'a').status).toBe('returned');
    expect(byId(next, 'b').status).toBe('secured');
  });
});

describe('projection — current state is a fold of the event log', () => {
  const events: FieldShoreEvent[] = [
    { type: 'OperationCreated', id: 'e1', opId: 'op1', at: 100, by: 'ic', name: 'Riverside', multiBuilding: false },
    { type: 'ShorePointAdded', id: 'e2', opId: 'op1', at: 101, by: 'officer', shorePoint: sp('sp1', { status: 'pending' }) },
    {
      type: 'EquipmentDeployed',
      id: 'e3',
      opId: 'op1',
      at: 102,
      by: 'officer',
      spId: 'sp1',
      deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv1' }],
    },
    statusEvent('sp1', 'process', 'strutset'),
  ];

  it('rebuilds the expected state from the log', () => {
    const state = projectOperation(events);
    expect(state.operation?.name).toBe('Riverside');
    expect(state.operation?.status).toBe('active');
    expect(state.shorePoints).toHaveLength(1);
    expect(byId(state, 'sp1').status).toBe('strutset');
    expect(deployedStrutOf(byId(state, 'sp1'))?.model).toBe('LS 203');
  });

  it('projecting the log equals folding the reducer incrementally (store ≡ rebuild)', () => {
    const incremental = events.reduce(operationReducer, EMPTY_OPERATION_STATE);
    expect(projectOperation(events)).toEqual(incremental);
  });

  it('ignores events that arrive before their operation exists', () => {
    const orphan = projectOperation([statusEvent('sp1', 'process', 'strutset')]);
    expect(orphan).toEqual(EMPTY_OPERATION_STATE);
  });
});

describe('soft-delete + restore (#319)', () => {
  const del = (spId: string, at = 200): FieldShoreEvent => ({ type: 'ShorePointDeleted', id: 'd', opId: 'op1', at, by: 't', spId });
  const restore = (spId: string, at = 201): FieldShoreEvent => ({ type: 'ShorePointRestored', id: 'r', opId: 'op1', at, by: 't', spId });

  it('ShorePointDeleted flags the point but keeps it in the array (status unchanged)', () => {
    const state = stateWith([sp('a', { seq: 1 }), sp('b', { seq: 2 })]);
    const next = operationReducer(state, del('b', 250));
    expect(next.shorePoints).toHaveLength(2); // retained, not filtered
    expect(byId(next, 'b').deletedAt).toBe(250);
    expect(byId(next, 'b').status).toBe('pending'); // untouched
    expect(byId(next, 'a').deletedAt).toBeUndefined();
  });

  it('ShorePointRestored clears the flag', () => {
    const state = stateWith([sp('b', { seq: 2, deletedAt: 250 })]);
    const next = operationReducer(state, restore('b'));
    expect(byId(next, 'b').deletedAt).toBeUndefined();
  });

  it('a hard ShorePointDeleted removes the point outright (structural, not soft)', () => {
    const state = stateWith([sp('a', { seq: 1 }), sp('b', { seq: 2 })]);
    const next = operationReducer(state, {
      type: 'ShorePointDeleted', id: 'd', opId: 'op1', at: 9, by: 't', spId: 'b', hard: true,
    });
    expect(next.shorePoints).toHaveLength(1); // filtered out, not flagged
    expect(next.shorePoints.find((p) => p.id === 'b')).toBeUndefined();
  });

  it('delete → restore round-trips through the event log', () => {
    const events: FieldShoreEvent[] = [
      { type: 'OperationCreated', id: 'e1', opId: 'op1', at: 1, by: 'ic', name: 'Op', multiBuilding: false },
      { type: 'ShorePointAdded', id: 'e2', opId: 'op1', at: 2, by: 'o', shorePoint: sp('sp1', { seq: 1 }) },
      del('sp1', 3),
      restore('sp1', 4),
    ];
    const state = projectOperation(events);
    expect(state.shorePoints).toHaveLength(1);
    expect(byId(state, 'sp1').deletedAt).toBeUndefined();
  });

  it('a deleted number is never reused — seq stays a high-water mark', () => {
    // #1,#2,#3 added; delete #2 → the next add must be #4, never #2.
    const state = stateWith([sp('a', { seq: 1 }), sp('b', { seq: 2 }), sp('c', { seq: 3 })]);
    const afterDelete = operationReducer(state, del('b'));
    expect(nextSeqBase(afterDelete.shorePoints)).toBe(3); // the deleted point still counts
  });
});

describe('divisions — the grow-the-building model (#220)', () => {
  const created: FieldShoreEvent = {
    type: 'OperationCreated', id: 'e1', opId: 'op1', at: 100, by: 'ic', name: 'Riverside', multiBuilding: false,
  };
  const divAdded = (id: string, division: number): FieldShoreEvent => ({
    type: 'DivisionAdded', id, opId: 'op1', at: 101, by: 'officer', division,
  });

  it('OperationCreated initializes divisions to [1] (Ground)', () => {
    const state = operationReducer(EMPTY_OPERATION_STATE, created);
    expect(state.operation?.divisions).toEqual([1]);
  });

  it('DivisionAdded appends the new floor', () => {
    const state = [created, divAdded('e2', 2), divAdded('e3', -1)].reduce(operationReducer, EMPTY_OPERATION_STATE);
    expect(state.operation?.divisions).toEqual([1, 2, -1]);
  });

  it('DivisionAdded is idempotent — concurrent adds of the same floor converge', () => {
    const state = [created, divAdded('e2', 2), divAdded('e3', 2)].reduce(operationReducer, EMPTY_OPERATION_STATE);
    expect(state.operation?.divisions).toEqual([1, 2]);
  });

  it('DivisionAdded with no operation is a no-op', () => {
    expect(operationReducer(EMPTY_OPERATION_STATE, divAdded('e1', 2))).toEqual(EMPTY_OPERATION_STATE);
  });
});

describe('operational periods — OP rollover (#395)', () => {
  const created: FieldShoreEvent = {
    type: 'OperationCreated', id: 'e1', opId: 'op1', at: 100, by: 'ic', name: 'Riverside', multiBuilding: false,
  };
  const rollover = (id: string, periodNumber: number, at: number, over: Partial<{ plannedDurationMs: number; iapRef: string }> = {}): FieldShoreEvent => ({
    type: 'OperationPeriodStarted', id, opId: 'op1', at, by: 'ic', periodNumber, ...over,
  });

  it('OperationCreated seeds period 1 at createdAt', () => {
    const state = operationReducer(EMPTY_OPERATION_STATE, created);
    expect(state.operation?.currentPeriod).toBe(1);
    expect(state.operation?.periods).toEqual([{ number: 1, startedAt: 100 }]);
  });

  it('OperationPeriodStarted appends the period, carries its planned length + IAP, and bumps currentPeriod', () => {
    const state = [created, rollover('e2', 2, 200, { plannedDurationMs: 43_200_000, iapRef: 'IAP-2' })].reduce(operationReducer, EMPTY_OPERATION_STATE);
    expect(state.operation?.currentPeriod).toBe(2);
    expect(state.operation?.periods).toEqual([
      { number: 1, startedAt: 100 },
      { number: 2, startedAt: 200, plannedDurationMs: 43_200_000, iapRef: 'IAP-2' },
    ]);
  });

  it('is idempotent — a re-applied rollover for an existing period converges', () => {
    const state = [created, rollover('e2', 2, 200), rollover('e3', 2, 999)].reduce(operationReducer, EMPTY_OPERATION_STATE);
    expect(state.operation?.periods).toHaveLength(2);
    expect(state.operation?.currentPeriod).toBe(2);
  });

  it('an out-of-order earlier period never regresses currentPeriod', () => {
    const state = [created, rollover('e2', 3, 300), rollover('e3', 2, 200)].reduce(operationReducer, EMPTY_OPERATION_STATE);
    expect(state.operation?.currentPeriod).toBe(3);
  });

  it('OperationPeriodStarted with no operation is a no-op', () => {
    expect(operationReducer(EMPTY_OPERATION_STATE, rollover('e1', 2, 200))).toEqual(EMPTY_OPERATION_STATE);
  });
});

describe('saws — the Cutting Station roster + claim (#354)', () => {
  const created: FieldShoreEvent = {
    type: 'OperationCreated', id: 'e1', opId: 'op1', at: 100, by: 'ic', name: 'Riverside', multiBuilding: false,
  };
  const sawAdded = (id: string, sawId: string): FieldShoreEvent => ({
    type: 'SawAdded', id, opId: 'op1', at: 101, by: 'lead', sawId,
  });

  it('OperationCreated seeds the roster to one saw [A]', () => {
    const state = operationReducer(EMPTY_OPERATION_STATE, created);
    expect(state.operation?.saws).toEqual(['A']);
  });

  it('SawAdded appends a saw to the roster', () => {
    const state = [created, sawAdded('e2', 'B'), sawAdded('e3', 'C')].reduce(operationReducer, EMPTY_OPERATION_STATE);
    expect(state.operation?.saws).toEqual(['A', 'B', 'C']);
  });

  it('SawAdded is idempotent — concurrent adds of the same saw converge', () => {
    const state = [created, sawAdded('e2', 'B'), sawAdded('e3', 'B')].reduce(operationReducer, EMPTY_OPERATION_STATE);
    expect(state.operation?.saws).toEqual(['A', 'B']);
  });

  it('SawAdded with no operation is a no-op', () => {
    expect(operationReducer(EMPTY_OPERATION_STATE, sawAdded('e1', 'B'))).toEqual(EMPTY_OPERATION_STATE);
  });

  it('CuttingClaimed stamps sawId onto a cutting point; a step-back out of cutting clears it', () => {
    const sp: ShorePoint = {
      id: 'a', opId: 'op1', division: '1', shoreType: 't-shore', measurementEighths: 388,
      deductions: NO_DEDUCTIONS, status: 'cutting', cuttingStartedAt: 5,
    };
    const base: OperationState = { ...EMPTY_OPERATION_STATE, shorePoints: [sp] };
    const claimed = operationReducer(base, { type: 'CuttingClaimed', id: 'e2', opId: 'op1', at: 6, by: 'lead', spId: 'a', sawId: 'B' });
    expect(claimed.shorePoints[0]!.sawId).toBe('B');
    // Step back cutting → strutset frees the claim (applyCuttingFields, #354).
    const stepped = operationReducer(claimed, statusEvent('a', 'cutting', 'strutset'));
    expect(stepped.shorePoints[0]!.status).toBe('strutset');
    expect(stepped.shorePoints[0]!.sawId).toBeUndefined();
  });

  it('CuttingClaimed against a non-cutting point no-ops (stale-claim replay safety)', () => {
    const sp: ShorePoint = {
      id: 'a', opId: 'op1', division: '1', shoreType: 't-shore', measurementEighths: 388,
      deductions: NO_DEDUCTIONS, status: 'strutset',
    };
    const base: OperationState = { ...EMPTY_OPERATION_STATE, shorePoints: [sp] };
    const next = operationReducer(base, { type: 'CuttingClaimed', id: 'e2', opId: 'op1', at: 6, by: 'lead', spId: 'a', sawId: 'B' });
    expect(next.shorePoints[0]!.sawId).toBeUndefined();
  });
});

describe('inlineDeploy — deploy mode (per-op, flippable via Edit Operation)', () => {
  const created = (inlineDeploy?: boolean): FieldShoreEvent => ({
    type: 'OperationCreated',
    id: 'e1',
    opId: 'op1',
    at: 1,
    by: 'ic',
    name: 'Test',
    multiBuilding: false,
    ...(inlineDeploy === undefined ? {} : { inlineDeploy }),
  });

  it('defaults to one-step inline when absent (old-event replay safety)', () => {
    const s = operationReducer(EMPTY_OPERATION_STATE, created());
    expect(s.operation!.inlineDeploy).toBe(true);
  });

  it('honors an explicit two-step (false) on create', () => {
    const s = operationReducer(EMPTY_OPERATION_STATE, created(false));
    expect(s.operation!.inlineDeploy).toBe(false);
  });

  it('OperationEdited flips the mode mid-incident', () => {
    const s = operationReducer(EMPTY_OPERATION_STATE, created(true));
    const flipped = operationReducer(s, {
      type: 'OperationEdited',
      id: 'e2',
      opId: 'op1',
      at: 2,
      by: 'ic',
      inlineDeploy: false,
    });
    expect(flipped.operation!.inlineDeploy).toBe(false);
  });

  it('OperationEdited without inlineDeploy leaves the mode untouched', () => {
    const s = operationReducer(EMPTY_OPERATION_STATE, created(false));
    const edited = operationReducer(s, { type: 'OperationEdited', id: 'e2', opId: 'op1', at: 2, by: 'ic', name: 'Renamed' });
    expect(edited.operation!.inlineDeploy).toBe(false);
  });
});

// ---- Cutting-queue bookkeeping (#222) — cuttingStartedAt + cuttingDone ride
// the strutset↔cutting edges; cutting↔runner preserves both (the saw ran). ----
function statusAt(spId: string, from: ShorePointStatus, to: ShorePointStatus, at: number): FieldShoreEvent {
  return { type: 'ShorePointStatusChanged', id: 'e', opId: 'op1', at, by: 't', spId, from, to };
}

describe('cutting-queue bookkeeping (#222)', () => {
  it('strutset → cutting stamps cuttingStartedAt for every lockstep group member', () => {
    const state = stateWith([
      sp('a', { groupId: 'g', status: 'strutset' }),
      sp('b', { groupId: 'g', status: 'strutset' }),
    ]);
    const next = operationReducer(state, statusAt('a', 'strutset', 'cutting', 4242));
    expect(byId(next, 'a').cuttingStartedAt).toBe(4242);
    expect(byId(next, 'b').cuttingStartedAt).toBe(4242);
  });

  it('cutting → strutset (step-back) clears cuttingStartedAt AND cuttingDone', () => {
    const state = stateWith([sp('a', { status: 'cutting', cuttingStartedAt: 100, cuttingDone: true })]);
    const next = operationReducer(state, statusAt('a', 'cutting', 'strutset', 200));
    expect(byId(next, 'a').status).toBe('strutset');
    expect(byId(next, 'a').cuttingStartedAt).toBeUndefined();
    expect(byId(next, 'a').cuttingDone).toBeUndefined();
  });

  it('cutting → runner (Send to Runner) preserves cuttingStartedAt + cuttingDone', () => {
    const state = stateWith([sp('a', { status: 'cutting', cuttingStartedAt: 100, cuttingDone: true })]);
    const next = operationReducer(state, statusAt('a', 'cutting', 'runner', 300));
    expect(byId(next, 'a').status).toBe('runner');
    expect(byId(next, 'a').cuttingStartedAt).toBe(100);
    expect(byId(next, 'a').cuttingDone).toBe(true);
  });

  it('Mark Cut Done patch sets cuttingDone on a cutting point; false clears it', () => {
    const base = stateWith([sp('a', { status: 'cutting', cuttingStartedAt: 100 })]);
    const marked = operationReducer(base, {
      type: 'ShorePointEdited', id: 'e', opId: 'op1', at: 5, by: 't', spId: 'a', patch: { cuttingDone: true },
    });
    expect(byId(marked, 'a').cuttingDone).toBe(true);
    const cleared = operationReducer(marked, {
      type: 'ShorePointEdited', id: 'e2', opId: 'op1', at: 6, by: 't', spId: 'a', patch: { cuttingDone: false },
    });
    expect(cleared.shorePoints[0]!.cuttingDone).toBeUndefined();
  });
});

describe('location coordinates — address autocomplete (Places)', () => {
  const created = (over: Partial<{ location: string; coords: { lat: number; lng: number } }> = {}): FieldShoreEvent => ({
    type: 'OperationCreated', id: 'e1', opId: 'op1', at: 100, by: 'ic', name: 'Riverside', multiBuilding: false, ...over,
  });
  const edited = (over: Record<string, unknown>): FieldShoreEvent => ({
    type: 'OperationEdited', id: 'e2', opId: 'op1', at: 200, by: 'ic', ...over,
  } as FieldShoreEvent);

  it('OperationCreated carries coords when a suggestion was picked', () => {
    const state = operationReducer(EMPTY_OPERATION_STATE, created({ location: '123 Main St', coords: { lat: 47.6, lng: -122.3 } }));
    expect(state.operation?.coords).toEqual({ lat: 47.6, lng: -122.3 });
  });

  it('OperationCreated leaves coords undefined for a hand-typed location', () => {
    const state = operationReducer(EMPTY_OPERATION_STATE, created({ location: 'behind the mall' }));
    expect(state.operation?.coords).toBeUndefined();
  });

  it('OperationEdited updates coords to the newly picked address', () => {
    const state = [created({ location: 'A', coords: { lat: 1, lng: 2 } }), edited({ location: 'B', coords: { lat: 3, lng: 4 } })].reduce(operationReducer, EMPTY_OPERATION_STATE);
    expect(state.operation?.location).toBe('B');
    expect(state.operation?.coords).toEqual({ lat: 3, lng: 4 });
  });

  it('OperationEdited clears coords when coords: null (cleared/hand-edited location)', () => {
    const state = [created({ location: 'A', coords: { lat: 1, lng: 2 } }), edited({ coords: null })].reduce(operationReducer, EMPTY_OPERATION_STATE);
    expect(state.operation?.coords).toBeUndefined();
  });

  it('OperationEdited leaves coords untouched when the field is absent from the patch', () => {
    const state = [created({ location: 'A', coords: { lat: 1, lng: 2 } }), edited({ name: 'Renamed' })].reduce(operationReducer, EMPTY_OPERATION_STATE);
    expect(state.operation?.coords).toEqual({ lat: 1, lng: 2 });
  });
});

// ── ADR-041 — reducer discipline: a no-effect fold returns the INPUT state reference.
describe('mapSame (ADR-041)', () => {
  it('returns the same array when no element changed', () => {
    const arr = [{ v: 1 }, { v: 2 }];
    expect(mapSame(arr, (x) => x)).toBe(arr);
  });

  it('returns a new array carrying the changed element and the untouched ones by reference', () => {
    const arr = [{ v: 1 }, { v: 2 }, { v: 3 }];
    const out = mapSame(arr, (x) => (x.v === 2 ? { v: 20 } : x));
    expect(out).not.toBe(arr);
    expect(out.map((x) => x.v)).toEqual([1, 20, 3]);
    expect(out[0]).toBe(arr[0]);
    expect(out[2]).toBe(arr[2]);
    expect(arr.map((x) => x.v)).toEqual([1, 2, 3]); // input untouched
  });

  it('handles an empty array', () => {
    const arr: number[] = [];
    expect(mapSame(arr, (x) => x + 1)).toBe(arr);
  });
});

describe('ShorePointDeleted — the holder rule is a fold-time guard (ADR-041)', () => {
  const BOM = [{ role: 'strut' as const, model: 'LS 406', source: 'Rescue 2', inventoryId: 'i1' }];
  const del = (spId: string, hard?: boolean): FieldShoreEvent => ({
    type: 'ShorePointDeleted', id: 'd', opId: 'op1', at: 300, by: 't', spId, ...(hard ? { hard } : {}),
  });

  for (const hard of [false, true]) {
    const kind = hard ? 'hard' : 'soft';
    it(`${kind} delete of a point HOLDING equipment is no effect (identical state)`, () => {
      for (const status of ['process', 'strutset', 'cutting', 'runner', 'secured'] as const) {
        const state = stateWith([sp('a', { status, deployedBom: BOM })]);
        expect(operationReducer(state, del('a', hard))).toBe(state);
      }
    });

    it(`${kind} delete of an unknown point is no effect`, () => {
      const state = stateWith([sp('a')]);
      expect(operationReducer(state, del('ghost', hard))).toBe(state);
    });

    it(`${kind} delete of a RETURNED point (BOM kept as history) applies`, () => {
      const state = stateWith([sp('a', { status: 'returned', deployedBom: BOM })]);
      const next = operationReducer(state, del('a', hard));
      expect(next).not.toBe(state);
      if (hard) expect(next.shorePoints).toHaveLength(0);
      else expect(byId(next, 'a').deletedAt).toBe(300);
    });

    it(`${kind} delete of a PENDING point applies`, () => {
      const state = stateWith([sp('a'), sp('b')]);
      const next = operationReducer(state, del('a', hard));
      expect(next).not.toBe(state);
      if (hard) expect(next.shorePoints.map((p) => p.id)).toEqual(['b']);
      else expect(byId(next, 'a').deletedAt).toBe(300);
    });
  }

  it('a repeat soft delete keeps the first deletedAt and is no effect', () => {
    const state = stateWith([sp('a', { deletedAt: 250 })]);
    expect(operationReducer(state, del('a'))).toBe(state);
  });

  it('restoring a point that is not deleted is no effect', () => {
    const state = stateWith([sp('a')]);
    expect(
      operationReducer(state, { type: 'ShorePointRestored', id: 'r', opId: 'op1', at: 1, by: 't', spId: 'a' }),
    ).toBe(state);
  });
});

describe('the Edited / Equipment* family returns the identical state when nothing changed (ADR-041)', () => {
  const BOM = [{ role: 'strut' as const, model: 'LS 406', source: 'Rescue 2', inventoryId: 'i1' }];
  const ev = (e: Record<string, unknown>) => ({ id: 'x', opId: 'op1', at: 5, by: 't', ...e }) as FieldShoreEvent;
  const state = stateWith([
    sp('pend'),
    sp('proc', { status: 'process', deployedBom: BOM }),
    sp('sec', { status: 'secured', deployedBom: BOM }),
    sp('cut', { status: 'cutting', sawId: 'A' }),
  ]);

  it('ShorePointEdited with values the point already has', () => {
    expect(operationReducer(state, ev({ type: 'ShorePointEdited', spId: 'pend', patch: { division: '1', deductions: { ...NO_DEDUCTIONS } } }))).toBe(state);
    expect(operationReducer(state, ev({ type: 'ShorePointEdited', spId: 'pend', patch: { label: null } }))).toBe(state);
    expect(operationReducer(state, ev({ type: 'ShorePointEdited', spId: 'ghost', patch: { label: 'x' } }))).toBe(state);
  });

  it('ShorePointEdited carrying only #220-locked sizing on a post-Pending ungrouped point', () => {
    expect(operationReducer(state, ev({ type: 'ShorePointEdited', spId: 'proc', patch: { measurementEighths: 999 } }))).toBe(state);
  });

  it('a real edit still applies', () => {
    const next = operationReducer(state, ev({ type: 'ShorePointEdited', spId: 'pend', patch: { label: 'Alpha' } }));
    expect(next).not.toBe(state);
    expect(byId(next, 'pend').label).toBe('Alpha');
  });

  it('EquipmentDeployed / StrutDeployed on a point that is not Pending', () => {
    expect(operationReducer(state, ev({ type: 'EquipmentDeployed', spId: 'proc', deployedBom: BOM }))).toBe(state);
    expect(
      operationReducer(state, ev({ type: 'StrutDeployed', spId: 'sec', deployedStrut: { model: 'LS 406', source: 'R2' } })),
    ).toBe(state);
  });

  it('EquipmentReturned / StrutReturned on a point that is not in process', () => {
    expect(operationReducer(state, ev({ type: 'EquipmentReturned', spId: 'pend' }))).toBe(state);
    expect(operationReducer(state, ev({ type: 'StrutReturned', spId: 'sec' }))).toBe(state);
  });

  it('EquipmentReclaimed on a point that is not secured', () => {
    expect(operationReducer(state, ev({ type: 'EquipmentReclaimed', spId: 'proc' }))).toBe(state);
  });

  it('ComponentResourced to the source it already draws from', () => {
    expect(
      operationReducer(state, ev({ type: 'ComponentResourced', spId: 'proc', componentIndex: 0, source: 'Rescue 2', inventoryId: 'i1' })),
    ).toBe(state);
    expect(
      operationReducer(state, ev({ type: 'ComponentResourced', spId: 'proc', componentIndex: 0, source: 'Engine 9', inventoryId: 'i9' })),
    ).not.toBe(state);
  });

  it('CuttingClaimed by the saw that already holds the claim, or on a non-cutting point', () => {
    expect(operationReducer(state, ev({ type: 'CuttingClaimed', spId: 'cut', sawId: 'A' }))).toBe(state);
    expect(operationReducer(state, ev({ type: 'CuttingClaimed', spId: 'pend', sawId: 'B' }))).toBe(state);
    expect(byId(operationReducer(state, ev({ type: 'CuttingClaimed', spId: 'cut', sawId: 'B' })), 'cut').sawId).toBe('B');
  });

  it('a stale ShorePointStatusChanged', () => {
    expect(operationReducer(state, statusEvent('proc', 'strutset', 'cutting'))).toBe(state);
  });
});

describe('OperationEnded.stockReleased (ADR-041 / D5)', () => {
  const created: FieldShoreEvent = { type: 'OperationCreated', id: 'c', opId: 'op1', at: 1, by: 'ic', name: 'Op', multiBuilding: false };
  const ended = (stockReleased?: boolean): FieldShoreEvent => ({
    type: 'OperationEnded', id: `end-${String(stockReleased)}`, opId: 'op1', at: 10, by: 'ic',
    ...(stockReleased === undefined ? {} : { stockReleased }),
  });
  const reopened: FieldShoreEvent = { type: 'OperationReopened', id: 'ro', opId: 'op1', at: 20, by: 'ic' };
  const fold = (events: FieldShoreEvent[]) => events.reduce(operationReducer, EMPTY_OPERATION_STATE);

  it('rides the end onto the projection and reopening sets it back to false', () => {
    const released = fold([created, ended(true)]);
    expect(released.operation?.status).toBe('ended');
    expect(released.operation?.stockReleased).toBe(true);
    const back = operationReducer(released, reopened);
    expect(back.operation?.status).toBe('active');
    expect(back.operation?.stockReleased).toBe(false);
  });

  it('an end without the box (legacy / unchecked) keeps the stock held', () => {
    expect(fold([created, ended()]).operation?.stockReleased).toBe(false);
    expect(fold([created, ended(false)]).operation?.stockReleased).toBe(false);
  });

  it('the LATEST end of an ended op decides; a repeat with the same answer is no effect', () => {
    const held = fold([created, ended(false)]);
    expect(operationReducer(held, ended(false))).toBe(held);
    expect(operationReducer(held, ended(true)).operation?.stockReleased).toBe(true);
  });

  it('reopening an op that is already active is no effect', () => {
    const active = fold([created]);
    expect(operationReducer(active, reopened)).toBe(active);
  });
});

describe('ADR-041 — a closed operation accepts no further work', () => {
  const base = { opId: 'op-x', at: 1, by: 'dev' } as const;
  const created = { type: 'OperationCreated' as const, id: 'c', ...base, name: 'X', multiBuilding: false };
  const ended = { type: 'OperationEnded' as const, id: 'e', ...base, at: 2 };
  it('a status change / add after OperationEnded folds as no-effect (same reference); Reopened re-enables', () => {
    let s = operationReducer(EMPTY_OPERATION_STATE, created);
    s = operationReducer(s, ended);
    const add = { type: 'ShorePointAdded' as const, id: 'a', ...base, at: 3, shorePoint: sp('sp-late') };
    expect(operationReducer(s, add)).toBe(s);
    const reopened = { type: 'OperationReopened' as const, id: 'r', ...base, at: 4 };
    const back = operationReducer(s, reopened);
    expect(back.operation?.status).toBe('active');
    expect(operationReducer(back, add).shorePoints.some((p) => p.id === 'sp-late')).toBe(true);
  });
  it('a repeat OperationEnded may still change stockReleased on an ended op', () => {
    let s = operationReducer(EMPTY_OPERATION_STATE, created);
    s = operationReducer(s, ended);
    const released = operationReducer(s, { ...ended, id: 'e2', at: 5, stockReleased: true });
    expect(released.operation?.stockReleased).toBe(true);
  });
});


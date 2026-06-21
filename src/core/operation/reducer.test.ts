import { describe, it, expect } from 'vitest';
import { NO_DEDUCTIONS, type ShorePoint, type ShorePointStatus, type FieldShoreEvent } from '../schema';
import { deployedStrutOf } from '../shorepoint';
import { operationReducer, EMPTY_OPERATION_STATE, type OperationState } from './reducer';
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
    operation: { id: 'op1', name: 'Test', multiBuilding: false, inlineDeploy: false, divisions: [1], status: 'active', createdAt: 1 },
    shorePoints: points,
    positions: {},
    myRoles: {},
    commandTransfer: null,
    hazards: {},
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

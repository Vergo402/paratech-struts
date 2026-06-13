import { describe, it, expect } from 'vitest';
import { NO_DEDUCTIONS, type ShorePoint, type ShorePointStatus, type FieldShoreEvent } from '../schema';
import { operationReducer, EMPTY_OPERATION_STATE, type OperationState } from './reducer';
import { projectOperation } from './projection';

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

  it('once at cutting, transitions are individual (cutting onward is per-card)', () => {
    const state = stateWith([
      sp('a', { groupId: 'g', status: 'cutting' }),
      sp('b', { groupId: 'g', status: 'cutting' }),
    ]);
    const next = operationReducer(state, statusEvent('a', 'cutting', 'runner'));
    expect(byId(next, 'a').status).toBe('runner');
    expect(byId(next, 'b').status).toBe('cutting'); // not swept along
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

describe('projection — current state is a fold of the event log', () => {
  const events: FieldShoreEvent[] = [
    { type: 'OperationCreated', id: 'e1', opId: 'op1', at: 100, by: 'ic', name: 'Riverside', multiBuilding: false },
    { type: 'ShorePointAdded', id: 'e2', opId: 'op1', at: 101, by: 'officer', shorePoint: sp('sp1', { status: 'pending' }) },
    {
      type: 'StrutDeployed',
      id: 'e3',
      opId: 'op1',
      at: 102,
      by: 'officer',
      spId: 'sp1',
      deployedStrut: { model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv1' },
    },
    statusEvent('sp1', 'process', 'strutset'),
  ];

  it('rebuilds the expected state from the log', () => {
    const state = projectOperation(events);
    expect(state.operation?.name).toBe('Riverside');
    expect(state.operation?.status).toBe('active');
    expect(state.shorePoints).toHaveLength(1);
    expect(byId(state, 'sp1').status).toBe('strutset');
    expect(byId(state, 'sp1').deployedStrut?.model).toBe('LS 203');
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

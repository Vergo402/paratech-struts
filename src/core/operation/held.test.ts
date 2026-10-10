import { describe, it, expect } from 'vitest';
import {
  NO_DEDUCTIONS,
  type DeployedComponent,
  type FieldShoreEvent,
  type ShorePoint,
  type ShorePointStatus,
} from '../schema';
import { projectOperationById } from './projection';
import { operationReducer, EMPTY_OPERATION_STATE, type OperationState } from './reducer';
import { heldCounts, heldInShorePoints, heldOf, withAvailability } from './held';

// Local factories (fixture style of reducer.test.ts / transfer.test.ts).
let n = 0;
const base = (opId = 'op1') => ({ id: `h${n++}`, opId, at: n, by: 'dev-a' });

const created = (opId = 'op1'): FieldShoreEvent => ({
  type: 'OperationCreated',
  ...base(opId),
  name: `Op ${opId}`,
  multiBuilding: false,
});
const ended = (opId = 'op1', stockReleased?: boolean): FieldShoreEvent => ({
  type: 'OperationEnded',
  ...base(opId),
  ...(stockReleased === undefined ? {} : { stockReleased }),
});
const reopened = (opId = 'op1'): FieldShoreEvent => ({ type: 'OperationReopened', ...base(opId) });
function added(spId: string, opId = 'op1'): FieldShoreEvent {
  const shorePoint: ShorePoint = {
    id: spId,
    opId,
    division: '1',
    shoreType: 't-shore',
    measurementEighths: 40 * 8,
    deductions: NO_DEDUCTIONS,
    status: 'pending',
  };
  return { type: 'ShorePointAdded', ...base(opId), shorePoint };
}
const strut = (inventoryId?: string): DeployedComponent => ({
  role: 'strut',
  model: 'LS 203',
  source: inventoryId ? 'Rescue 1' : 'untracked',
  ...(inventoryId ? { inventoryId } : {}),
});
const deploy = (spId: string, bom: DeployedComponent[], opId = 'op1'): FieldShoreEvent => ({
  type: 'EquipmentDeployed',
  ...base(opId),
  spId,
  deployedBom: bom,
});
const returned = (spId: string): FieldShoreEvent => ({ type: 'EquipmentReturned', ...base(), spId });
const reclaimed = (spId: string): FieldShoreEvent => ({ type: 'EquipmentReclaimed', ...base(), spId });
const status = (spId: string, from: ShorePointStatus, to: ShorePointStatus): FieldShoreEvent => ({
  type: 'ShorePointStatusChanged',
  ...base(),
  spId,
  from,
  to,
});
const resourced = (spId: string, componentIndex: number, inventoryId?: string): FieldShoreEvent => ({
  type: 'ComponentResourced',
  ...base(),
  spId,
  componentIndex,
  source: inventoryId ? 'Engine 2' : 'untracked',
  ...(inventoryId ? { inventoryId } : {}),
});

const heldFrom = (events: FieldShoreEvent[], opIds = ['op1']) =>
  heldCounts(opIds.map((id) => projectOperationById(events, id)));

describe('heldInShorePoints', () => {
  it('counts each tracked BOM component once; untracked never counts', () => {
    const log = [
      created(),
      added('a'),
      deploy('a', [
        strut('inv-strut'),
        { role: 'top-plate', plateId: 'flat', source: 'Rescue 1', inventoryId: 'inv-plate' },
        { role: 'bottom-plate', plateId: 'flat', source: 'Rescue 1', inventoryId: 'inv-plate' },
        { role: 'extension', length: 12, source: 'untracked' },
      ]),
    ];
    const { shorePoints } = projectOperationById(log, 'op1');
    expect(heldInShorePoints(shorePoints)).toEqual({ 'inv-strut': 1, 'inv-plate': 2 });
  });

  it('a pending point (no BOM) and a returned point hold nothing; deletedAt is ignored', () => {
    const pts: ShorePoint[] = [
      { id: 'p', opId: 'op1', division: '1', shoreType: 't-shore', measurementEighths: 320, deductions: NO_DEDUCTIONS, status: 'pending' },
      { id: 'r', opId: 'op1', division: '1', shoreType: 't-shore', measurementEighths: 320, deductions: NO_DEDUCTIONS, status: 'returned', deployedBom: [strut('inv-1')] },
      { id: 'd', opId: 'op1', division: '1', shoreType: 't-shore', measurementEighths: 320, deductions: NO_DEDUCTIONS, status: 'process', deployedBom: [strut('inv-1')], deletedAt: 5 },
    ];
    expect(heldInShorePoints(pts)).toEqual({ 'inv-1': 1 });
  });
});

describe('heldCounts — traces built from events', () => {
  it('deploy holds; EquipmentReturned releases', () => {
    const log = [created(), added('a'), deploy('a', [strut('inv-1')])];
    expect(heldFrom(log)).toEqual({ 'inv-1': 1 });
    expect(heldFrom([...log, returned('a')])).toEqual({});
  });

  it('EquipmentReclaimed (secured → returned) releases, keeping the BOM as history', () => {
    const log = [
      created(),
      added('a'),
      deploy('a', [strut('inv-1')]),
      status('a', 'process', 'strutset'),
      status('a', 'strutset', 'cutting'),
      status('a', 'cutting', 'runner'),
      status('a', 'runner', 'secured'),
    ];
    expect(heldFrom(log)).toEqual({ 'inv-1': 1 });
    const done = [...log, reclaimed('a')];
    expect(projectOperationById(done, 'op1').shorePoints[0]!.deployedBom).toBeDefined();
    expect(heldFrom(done)).toEqual({});
  });

  it('ComponentResourced moves the hold to the new row; to untracked drops it', () => {
    const log = [created(), added('a'), deploy('a', [strut('inv-1')]), resourced('a', 0, 'inv-2')];
    expect(heldFrom(log)).toEqual({ 'inv-2': 1 });
    expect(heldFrom([...log, resourced('a', 0)])).toEqual({});
  });

  it('a legacy StrutDeployed holds like a one-component BOM', () => {
    const log: FieldShoreEvent[] = [
      created(),
      added('a'),
      { type: 'StrutDeployed', ...base(), spId: 'a', deployedStrut: { model: 'LS 203', source: 'Rescue 1', inventoryId: 'inv-1' } },
    ];
    expect(heldFrom(log)).toEqual({ 'inv-1': 1 });
  });

  it('an ended operation still holds its deployed equipment', () => {
    const log = [created(), added('a'), deploy('a', [strut('inv-1')]), ended()];
    expect(heldFrom(log)).toEqual({ 'inv-1': 1 });
  });

  it('sums across operations', () => {
    const log = [
      created('op1'),
      added('a', 'op1'),
      deploy('a', [strut('inv-1')], 'op1'),
      ended('op1'),
      created('op2'),
      added('b', 'op2'),
      deploy('b', [strut('inv-1')], 'op2'),
    ];
    expect(heldFrom(log, ['op1', 'op2'])).toEqual({ 'inv-1': 2 });
  });

  // Relies on the reducer: OperationEnded{stockReleased} sets the flag, OperationReopened clears it.
  it('End with stockReleased releases; Reopened holds again', () => {
    const log = [created(), added('a'), deploy('a', [strut('inv-1')]), ended('op1', true)];
    expect(heldFrom(log)).toEqual({});
    expect(heldFrom([...log, reopened()])).toEqual({ 'inv-1': 1 });
  });

  it('the stockReleased exclusion itself (state-level, independent of the reducer)', () => {
    const s = projectOperationById([created(), added('a'), deploy('a', [strut('inv-1')])], 'op1');
    const released = { ...s, operation: { ...s.operation!, status: 'ended' as const, stockReleased: true } } as OperationState;
    const notReleased = { ...s, operation: { ...s.operation!, status: 'ended' as const, stockReleased: false } } as OperationState;
    expect(heldCounts([released])).toEqual({});
    expect(heldCounts([notReleased])).toEqual({ 'inv-1': 1 });
  });

  it('#500 — two deploys of the last unit on two points hold 2, in either order', () => {
    const head = [created(), added('a'), added('b')];
    const da = deploy('a', [strut('inv-last')]);
    const db = deploy('b', [strut('inv-last')]);
    expect(heldFrom([...head, da, db])).toEqual({ 'inv-last': 2 });
    expect(heldFrom([...head, db, da])).toEqual({ 'inv-last': 2 });
  });

  it('two deploys of the SAME point hold 1 in either order (the second is a no-op)', () => {
    const head = [created(), added('a')];
    const d1 = deploy('a', [strut('inv-1')]);
    const d2 = deploy('a', [strut('inv-2')]);
    expect(heldFrom([...head, d1, d2])).toEqual({ 'inv-1': 1 });
    expect(heldFrom([...head, d2, d1])).toEqual({ 'inv-2': 1 });
  });

  // Relies on the ADR-041 reducer contract (same reference on a no-effect fold).
  it('the second deploy of the same point returns the identical state reference', () => {
    const s = [created(), added('a'), deploy('a', [strut('inv-1')])].reduce(operationReducer, EMPTY_OPERATION_STATE);
    expect(operationReducer(s, deploy('a', [strut('inv-2')]))).toBe(s);
  });
});

describe('withAvailability', () => {
  it('available = quantity − held, signed (over-allocation reads negative)', () => {
    const rows = [
      { id: 'inv-1', quantity: 2, model: 'LS 203' },
      { id: 'inv-2', quantity: 1, model: 'LS 204' },
      { id: 'inv-3', quantity: 4, model: 'LS 205' },
    ];
    const out = withAvailability(rows, { 'inv-1': 1, 'inv-2': 2 });
    expect(out.map((r) => r.available)).toEqual([1, -1, 4]);
    expect(out[0]).toMatchObject({ model: 'LS 203', quantity: 2 }); // row fields carried
  });

  it('prototype-named ids read as 0, never an inherited property', () => {
    expect(heldOf({}, 'constructor')).toBe(0);
    expect(withAvailability([{ id: '__proto__', quantity: 1 }], {})[0]!.available).toBe(1);
  });
});

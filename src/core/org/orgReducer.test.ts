import { describe, it, expect } from 'vitest';
import type { FieldShoreEvent, OrgPosition } from '../schema';
import { projectOperation } from '../operation/projection';
import { defaultPositionId } from './defaultTree';
import { orgReducer, seedOrgState } from './orgReducer';

const OP = 'op1';
const DEV = 'dev-creator';
const id = (k: Parameters<typeof defaultPositionId>[1]) => defaultPositionId(OP, k);

let n = 0;
const base = () => ({ id: `e${n++}`, opId: OP, at: 1, by: DEV });

function created(by = DEV): FieldShoreEvent {
  return { type: 'OperationCreated', ...base(), by, name: 'Maple St.', multiBuilding: false };
}
function customPos(over: Partial<OrgPosition> & { id: string; parentId: string | null }): OrgPosition {
  return { title: over.id, kind: 'group', builtIn: false, order: 0, assignedResources: [], ...over };
}

describe('org projection seeding (no migration)', () => {
  it('OperationCreated seeds the ADR-008 default tree + founding IC', () => {
    const s = projectOperation([created()]);
    expect(Object.keys(s.positions)).toHaveLength(7);
    expect(s.positions[id('ic')]!.assignedResources[0]).toEqual({ ref: 'device', value: DEV, label: 'This device' });
    expect(s.myRoles[DEV]).toBe(id('ic'));
  });

  it('an op with NO org events still folds to the full tree (the free re-fold)', () => {
    const divisionAdded: FieldShoreEvent = { type: 'DivisionAdded', ...base(), division: 2 };
    const s = projectOperation([created(), divisionAdded]);
    expect(Object.keys(s.positions)).toHaveLength(7);
  });
});

describe('orgReducer (structural folds)', () => {
  it('PositionAdded is idempotent by id', () => {
    let s = seedOrgState(OP, DEV);
    const pos = customPos({ id: 'c1', parentId: id('ops') });
    s = orgReducer(s, { type: 'PositionAdded', ...base(), position: pos });
    s = orgReducer(s, { type: 'PositionAdded', ...base(), position: { ...pos, title: 'changed' } });
    expect(s.positions['c1']!.title).toBe('c1'); // first wins; re-add no-ops
    expect(Object.keys(s.positions)).toHaveLength(8);
  });

  it('PositionRemoved drops the whole subtree; built-ins are protected', () => {
    let s = seedOrgState(OP, DEV);
    s = orgReducer(s, { type: 'PositionAdded', ...base(), position: customPos({ id: 'br', parentId: id('ops'), kind: 'branch' }) });
    s = orgReducer(s, { type: 'PositionAdded', ...base(), position: customPos({ id: 'g', parentId: 'br' }) });
    s = orgReducer(s, { type: 'PositionRemoved', ...base(), positionId: id('ops') }); // built-in → no-op
    expect(s.positions[id('ops')]).toBeDefined();
    s = orgReducer(s, { type: 'PositionRemoved', ...base(), positionId: 'br' }); // custom → subtree gone
    expect(s.positions['br']).toBeUndefined();
    expect(s.positions['g']).toBeUndefined();
  });

  it('PositionReparented blocks a cycle but applies a legal move', () => {
    let s = seedOrgState(OP, DEV);
    const before = s.positions[id('ops')]!.parentId;
    s = orgReducer(s, { type: 'PositionReparented', ...base(), positionId: id('ops'), newParentId: id('rescue') });
    expect(s.positions[id('ops')]!.parentId).toBe(before); // cycle blocked, unchanged
    s = orgReducer(s, { type: 'PositionReparented', ...base(), positionId: id('rescue'), newParentId: id('shoring') });
    expect(s.positions[id('rescue')]!.parentId).toBe(id('shoring'));
  });

  it('ResourceAssigned dedups; ResourceCleared removes one or all', () => {
    let s = seedOrgState(OP, DEV);
    const r1 = { ref: 'apparatus' as const, value: 'a1', label: 'Rescue 2' };
    const r2 = { ref: 'individual' as const, value: 'FF Lopez', label: 'FF Lopez' };
    s = orgReducer(s, { type: 'ResourceAssigned', ...base(), positionId: id('rescue'), resource: r1 });
    s = orgReducer(s, { type: 'ResourceAssigned', ...base(), positionId: id('rescue'), resource: r1 }); // dup → no-op
    s = orgReducer(s, { type: 'ResourceAssigned', ...base(), positionId: id('rescue'), resource: r2 });
    expect(s.positions[id('rescue')]!.assignedResources).toHaveLength(2);
    s = orgReducer(s, { type: 'ResourceCleared', ...base(), positionId: id('rescue'), resource: r1 });
    expect(s.positions[id('rescue')]!.assignedResources).toEqual([r2]);
    s = orgReducer(s, { type: 'ResourceCleared', ...base(), positionId: id('rescue') }); // clear all
    expect(s.positions[id('rescue')]!.assignedResources).toEqual([]);
  });

  it('MyRoleSet is per-device; null clears', () => {
    let s = seedOrgState(OP, DEV);
    s = orgReducer(s, { type: 'MyRoleSet', ...base(), by: 'dev2', positionId: id('shoring') });
    expect(s.myRoles['dev2']).toBe(id('shoring'));
    expect(s.myRoles[DEV]).toBe(id('ic')); // founder unchanged
    s = orgReducer(s, { type: 'MyRoleSet', ...base(), by: 'dev2', positionId: null });
    expect(s.myRoles['dev2']).toBeUndefined();
  });

  it('concurrent reparents in different branches converge (order-independent)', () => {
    let a = seedOrgState(OP, DEV);
    a = orgReducer(a, { type: 'PositionAdded', ...base(), position: customPos({ id: 'x', parentId: id('ops') }) });
    a = orgReducer(a, { type: 'PositionAdded', ...base(), position: customPos({ id: 'y', parentId: id('ops') }) });
    const e1: FieldShoreEvent = { type: 'PositionReparented', ...base(), positionId: 'x', newParentId: id('rescue') };
    const e2: FieldShoreEvent = { type: 'PositionReparented', ...base(), positionId: 'y', newParentId: id('shoring') };
    const fwd = orgReducer(orgReducer(a, e1), e2);
    const rev = orgReducer(orgReducer(a, e2), e1);
    expect(fwd.positions).toEqual(rev.positions);
  });
});

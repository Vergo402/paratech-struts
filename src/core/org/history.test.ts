import { describe, it, expect } from 'vitest';
import type { FieldShoreEvent, OrgPosition, OrgResourceRef } from '../schema';
import { defaultPositionId } from './defaultTree';
import { roleHistory, isOrgEvent } from './history';

const OP = 'op1';
const IC = defaultPositionId(OP, 'ic');
const RESCUE = defaultPositionId(OP, 'rescue');
const DEV = 'dev1';

let n = 0;
const base = (opId = OP) => ({ id: `e${n++}`, opId, at: n, by: DEV });
const RIG: OrgResourceRef = { ref: 'apparatus', value: 'a1', label: 'Rescue 2' };
const pos: OrgPosition = { id: 'c1', title: 'Search Group Supervisor', kind: 'group', parentId: defaultPositionId(OP, 'ops'), builtIn: false, order: 0, assignedResources: [] };

const log: FieldShoreEvent[] = [
  { type: 'OperationCreated', ...base(), name: 'Maple St.', multiBuilding: false }, // not org
  { type: 'ShorePointAdded', ...base(), shorePoint: {} as never }, // not org (filtered out)
  { type: 'PositionAdded', ...base(), position: pos }, // names c1
  { type: 'ResourceAssigned', ...base(), positionId: RESCUE, resource: RIG }, // names rescue
  { type: 'PositionReparented', ...base(), positionId: 'c1', newParentId: RESCUE }, // names c1 AND rescue
  { type: 'CommandTransferInitiated', ...base(), toResource: { ref: 'individual', value: 'BC', label: 'BC' } }, // IC only
  { type: 'CommandTransferAccepted', ...base(), by: 'dev2' }, // IC only
  { type: 'PositionAdded', ...base('other-op'), position: { ...pos, id: 'x' } }, // wrong op
];

describe('isOrgEvent', () => {
  it('accepts org-domain events, rejects the rest', () => {
    expect(isOrgEvent(log[2]!)).toBe(true); // PositionAdded
    expect(isOrgEvent(log[5]!)).toBe(true); // CommandTransferInitiated
    expect(isOrgEvent(log[0]!)).toBe(false); // OperationCreated
    expect(isOrgEvent(log[1]!)).toBe(false); // ShorePointAdded
  });
});

describe('roleHistory', () => {
  it('whole-op timeline: every org event for this op, append order, transfers included, other ops excluded', () => {
    const h = roleHistory(log, OP);
    expect(h.map((e) => e.type)).toEqual([
      'PositionAdded',
      'ResourceAssigned',
      'PositionReparented',
      'CommandTransferInitiated',
      'CommandTransferAccepted',
    ]);
  });

  it('per-node: only events naming that node (reparent counts for moved AND new parent)', () => {
    expect(roleHistory(log, OP, 'c1').map((e) => e.type)).toEqual(['PositionAdded', 'PositionReparented']);
    expect(roleHistory(log, OP, RESCUE).map((e) => e.type)).toEqual(['ResourceAssigned', 'PositionReparented']);
  });

  it('command transfers belong to the IC node only', () => {
    expect(roleHistory(log, OP, IC).map((e) => e.type)).toEqual([
      'CommandTransferInitiated',
      'CommandTransferAccepted',
    ]);
    expect(roleHistory(log, OP, RESCUE).some((e) => e.type.startsWith('CommandTransfer'))).toBe(false);
  });
});

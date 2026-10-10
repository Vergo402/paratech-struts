import { describe, it, expect } from 'vitest';
import { FieldShoreEvent, NO_DEDUCTIONS, type DeployedBom, type ShorePoint } from '../schema';
import { defaultPositionId } from '../org';
import { operationReducer, EMPTY_OPERATION_STATE, type OperationState } from './reducer';

// ADR-041 — the reference-identity sweep. The canonical event log records each event's
// outcome (applied / no-effect) by whether the fold returned the SAME state object, and
// the device that lost a race is told which of its changes had no effect. So for EVERY
// event type there must be a state the event cannot change, and folding it there must
// return the input reference — not an equal copy.
//
// The witness table is typed `Record<FieldShoreEvent['type'], …>` (a new event type fails
// to compile until it is covered) AND checked against the runtime union (a new type also
// fails this test). Every witness event is run through FieldShoreEvent.parse first, so a
// witness can never "pass" by being malformed.

const OP = 'op1';
const DEV = 'dev-ic';
const IC = defaultPositionId(OP, 'ic');
const OPS = defaultPositionId(OP, 'ops');

let n = 0;
const meta = (at = 50) => ({ id: `w${n++}`, opId: OP, at, by: DEV });
const BOM: DeployedBom = [{ role: 'strut', model: 'LS 406', source: 'Rescue 2', inventoryId: 'i1' }];

function point(id: string, over: Partial<ShorePoint> = {}): ShorePoint {
  return {
    id,
    opId: OP,
    division: '1',
    shoreType: 't-shore',
    measurementEighths: 468,
    deductions: NO_DEDUCTIONS,
    status: 'pending',
    ...over,
  };
}

const parse = (e: Record<string, unknown>): FieldShoreEvent => FieldShoreEvent.parse(e);
const fold = (events: Record<string, unknown>[], from: OperationState = EMPTY_OPERATION_STATE): OperationState =>
  events.map(parse).reduce(operationReducer, from);

// A realistic active operation: points in every relevant status, an open and a mitigated
// hazard, a checked checklist leaf, a running briefing, OP 2 started.
const CHECK = { checklistId: 'ic-command', instanceId: OP, itemId: 'size-up', role: 'Incident Commander' };
const rich = fold([
  { type: 'OperationCreated', ...meta(1), name: 'Maple St.', multiBuilding: false },
  { type: 'OperationPeriodStarted', ...meta(2), periodNumber: 2 },
  { type: 'ShorePointAdded', ...meta(3), shorePoint: point('pend', { label: 'Alpha', building: 'B1' }) },
  { type: 'ShorePointAdded', ...meta(4), shorePoint: point('proc', { status: 'process', deployedBom: BOM }) },
  { type: 'ShorePointAdded', ...meta(5), shorePoint: point('cut', { status: 'cutting', sawId: 'A', deployedBom: BOM }) },
  { type: 'ShorePointAdded', ...meta(6), shorePoint: point('sec', { status: 'secured', deployedBom: BOM }) },
  {
    type: 'HazardLogged',
    ...meta(7),
    hazard: { id: 'h-open', type: 'structural', location: '1', severity: 'high', reportedBy: DEV, reportedAt: 7 },
  },
  {
    type: 'HazardLogged',
    ...meta(8),
    hazard: { id: 'h-mit', type: 'utility', location: '1', severity: 'low', reportedBy: DEV, reportedAt: 8 },
  },
  { type: 'HazardMitigated', ...meta(9), hazardId: 'h-mit' },
  { type: 'ChecklistItemChecked', ...meta(10), ...CHECK },
  { type: 'BriefingStarted', ...meta(11), briefingId: 'b1' },
]);

const ended = fold([{ type: 'OperationEnded', ...meta(90) }], rich);
const INIT_ID = 'init-1';
const pending = fold(
  [{ type: 'CommandTransferInitiated', ...meta(60), id: INIT_ID, toResource: { ref: 'individual', value: 'BC Smith', label: 'BC Smith' } }],
  rich,
);

interface Witness {
  /** Why this state cannot be changed by the event (read in a failure message). */
  why: string;
  state?: OperationState; // default: `rich`
  event: Record<string, unknown>;
}

const WITNESSES: Record<FieldShoreEvent['type'], Witness[]> = {
  OperationCreated: [{ why: 'duplicate create of the op already held', event: { type: 'OperationCreated', ...meta(), name: 'Other', multiBuilding: true } }],
  OperationEdited: [
    { why: 'same name', event: { type: 'OperationEdited', ...meta(), name: 'Maple St.' } },
    { why: 'clear an absent location', event: { type: 'OperationEdited', ...meta(), location: null } },
  ],
  OperationEnded: [{ why: 'already ended, same stockReleased', state: ended, event: { type: 'OperationEnded', ...meta(), stockReleased: false } }],
  OperationReopened: [{ why: 'already active', event: { type: 'OperationReopened', ...meta() } }],
  DivisionAdded: [{ why: 'division already on the list', event: { type: 'DivisionAdded', ...meta(), division: 1 } }],
  SawAdded: [{ why: 'saw already on the roster', event: { type: 'SawAdded', ...meta(), sawId: 'A' } }],
  OperationPeriodStarted: [{ why: 'period already started', event: { type: 'OperationPeriodStarted', ...meta(), periodNumber: 2 } }],
  ShorePointAdded: [{ why: 'a point with that id exists', event: { type: 'ShorePointAdded', ...meta(), shorePoint: point('pend', { label: 'Dupe' }) } }],
  ShorePointEdited: [
    { why: 'same values', event: { type: 'ShorePointEdited', ...meta(), spId: 'pend', patch: { label: 'Alpha', building: 'B1', deductions: { ...NO_DEDUCTIONS } } } },
    { why: '#220-locked sizing on a post-Pending ungrouped point', event: { type: 'ShorePointEdited', ...meta(), spId: 'proc', patch: { measurementEighths: 999 } } },
    { why: 'unknown point', event: { type: 'ShorePointEdited', ...meta(), spId: 'ghost', patch: { label: 'x' } } },
  ],
  ShorePointDeleted: [
    { why: 'soft delete of a holder', event: { type: 'ShorePointDeleted', ...meta(), spId: 'proc' } },
    { why: 'hard delete of a holder', event: { type: 'ShorePointDeleted', ...meta(), spId: 'sec', hard: true } },
    { why: 'unknown point (hard)', event: { type: 'ShorePointDeleted', ...meta(), spId: 'ghost', hard: true } },
  ],
  ShorePointRestored: [{ why: 'point is not deleted', event: { type: 'ShorePointRestored', ...meta(), spId: 'pend' } }],
  ShorePointStatusChanged: [
    { why: 'stale premise (from ≠ current)', event: { type: 'ShorePointStatusChanged', ...meta(), spId: 'proc', from: 'strutset', to: 'cutting' } },
    { why: 'pending boundary owned by deploy/return', event: { type: 'ShorePointStatusChanged', ...meta(), spId: 'proc', from: 'process', to: 'pending' } },
  ],
  CuttingClaimed: [
    { why: 'same saw already holds the claim', event: { type: 'CuttingClaimed', ...meta(), spId: 'cut', sawId: 'A' } },
    { why: 'point is not cutting', event: { type: 'CuttingClaimed', ...meta(), spId: 'pend', sawId: 'B' } },
  ],
  StrutDeployed: [{ why: 'point is not pending', event: { type: 'StrutDeployed', ...meta(), spId: 'proc', deployedStrut: { model: 'LS 406', source: 'Rescue 2', inventoryId: 'i1' } } }],
  StrutReturned: [{ why: 'point is not in process', event: { type: 'StrutReturned', ...meta(), spId: 'pend' } }],
  EquipmentDeployed: [{ why: 'point is not pending', event: { type: 'EquipmentDeployed', ...meta(), spId: 'sec', deployedBom: BOM } }],
  EquipmentReturned: [{ why: 'point is not in process', event: { type: 'EquipmentReturned', ...meta(), spId: 'cut' } }],
  EquipmentReclaimed: [{ why: 'point is not secured', event: { type: 'EquipmentReclaimed', ...meta(), spId: 'proc' } }],
  ComponentResourced: [
    { why: 'same source + inventoryId', event: { type: 'ComponentResourced', ...meta(), spId: 'proc', componentIndex: 0, source: 'Rescue 2', inventoryId: 'i1' } },
    { why: 'no such component', event: { type: 'ComponentResourced', ...meta(), spId: 'proc', componentIndex: 7, source: 'Engine 9' } },
  ],
  PositionAdded: [
    {
      why: 'position id already exists',
      event: { type: 'PositionAdded', ...meta(), position: { id: IC, parentId: null, title: 'X', kind: 'command', builtIn: true, order: 0, assignedResources: [] } },
    },
  ],
  PositionRemoved: [{ why: 'built-in position is protected', event: { type: 'PositionRemoved', ...meta(), positionId: OPS } }],
  PositionRenamed: [{ why: 'same title', event: { type: 'PositionRenamed', ...meta(), positionId: OPS, title: rich.positions[OPS]!.title } }],
  PositionReparented: [{ why: 'already under that parent', event: { type: 'PositionReparented', ...meta(), positionId: OPS, newParentId: rich.positions[OPS]!.parentId } }],
  PositionReordered: [{ why: 'same order', event: { type: 'PositionReordered', ...meta(), positionId: OPS, order: rich.positions[OPS]!.order } }],
  ResourceAssigned: [{ why: 'resource already assigned', event: { type: 'ResourceAssigned', ...meta(), positionId: IC, resource: { ref: 'device', value: DEV, label: 'This device' } } }],
  ResourceCleared: [{ why: 'no matching resource', event: { type: 'ResourceCleared', ...meta(), positionId: IC, resource: { ref: 'individual', value: 'Nobody', label: 'Nobody' } } }],
  MyRoleSet: [{ why: 'same role already held', event: { type: 'MyRoleSet', ...meta(), positionId: IC } }],
  CommandTransferInitiated: [
    { why: 'initiator is not the IC', event: { type: 'CommandTransferInitiated', ...meta(), by: 'intruder', toResource: { ref: 'individual', value: 'X', label: 'X' } } },
  ],
  CommandTransferAccepted: [
    { why: 'names a different handshake', state: pending, event: { type: 'CommandTransferAccepted', ...meta(), by: 'anyone', transferId: 'other' } },
    { why: 'nothing pending', event: { type: 'CommandTransferAccepted', ...meta(), by: 'anyone' } },
  ],
  CommandTransferDeclined: [
    { why: 'names a different handshake', state: pending, event: { type: 'CommandTransferDeclined', ...meta(), transferId: 'other' } },
    { why: 'nothing pending', event: { type: 'CommandTransferDeclined', ...meta() } },
  ],
  CommandTransferCancelled: [
    { why: 'names a different handshake', state: pending, event: { type: 'CommandTransferCancelled', ...meta(), transferId: 'other' } },
    { why: 'nothing pending', event: { type: 'CommandTransferCancelled', ...meta() } },
  ],
  HazardLogged: [
    {
      why: 'hazard id already logged',
      event: { type: 'HazardLogged', ...meta(), hazard: { id: 'h-open', type: 'other', location: '2', severity: 'low', reportedBy: DEV, reportedAt: 1 } },
    },
  ],
  HazardMitigated: [{ why: 'already mitigated', event: { type: 'HazardMitigated', ...meta(), hazardId: 'h-mit' } }],
  HazardReopened: [{ why: 'already open', event: { type: 'HazardReopened', ...meta(), hazardId: 'h-open' } }],
  ChecklistItemChecked: [{ why: 'identical attestation on record', event: { type: 'ChecklistItemChecked', ...meta(10), ...CHECK } }],
  ChecklistItemUnchecked: [{ why: 'leaf not checked', event: { type: 'ChecklistItemUnchecked', ...meta(), ...CHECK, itemId: 'other-leaf' } }],
  BriefingStarted: [{ why: 'briefing id already started', event: { type: 'BriefingStarted', ...meta(), briefingId: 'b1' } }],
  BriefingEnded: [{ why: 'unknown briefing', event: { type: 'BriefingEnded', ...meta(), briefingId: 'nope' } }],
};

describe('reference-identity sweep — every event type has a no-effect fold (ADR-041)', () => {
  it('the witness table covers exactly the FieldShoreEvent union', () => {
    const union = FieldShoreEvent.options.map((o) => o.shape.type.value).sort();
    expect(Object.keys(WITNESSES).sort()).toEqual(union);
  });

  it('the fixture states are what the witnesses assume', () => {
    expect(rich.operation?.status).toBe('active');
    expect(ended.operation?.status).toBe('ended');
    expect(pending.commandTransfer?.transferId).toBe(INIT_ID);
    expect(rich.shorePoints.map((p) => p.id)).toEqual(['pend', 'proc', 'cut', 'sec']);
  });

  for (const [type, witnesses] of Object.entries(WITNESSES)) {
    for (const w of witnesses) {
      it(`${type} — ${w.why} → the identical state`, () => {
        const state = w.state ?? rich;
        const event = parse(w.event);
        expect(event.type).toBe(type);
        expect(operationReducer(state, event)).toBe(state);
      });
    }
  }
});

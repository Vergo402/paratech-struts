import { describe, it, expect } from 'vitest';
import { describeEventLog, describeAuditLog } from './describe';
import { auditRowsToCsv } from './csv';
import type { AuditEntry } from './describe';
import type { FieldShoreEvent, ShorePoint, OrgPosition, Hazard, OrgResourceRef } from '@core/schema';
import { NO_DEDUCTIONS } from '@core/schema';
import { STATUS_LABELS } from '@core/shorepoint';

const opId = 'op1';

const sp: ShorePoint = {
  id: 'sp1',
  opId,
  seq: 7,
  division: '2',
  shoreType: 't-shore',
  measurementEighths: 800,
  deductions: NO_DEDUCTIONS,
  status: 'pending',
};
const pos: OrgPosition = { id: 'pos1', title: 'Logistics Section Chief', kind: 'section', parentId: null, order: 0, builtIn: false, assignedResources: [] };
const hazard: Hazard = { id: 'h1', type: 'structural', location: 'A-side parapet', severity: 'high', reportedBy: 'dev1', reportedAt: 10 };
const dev: OrgResourceRef = { ref: 'device', value: 'dev1', label: 'Rescue 2' };

let seq = 0;
const at = () => ++seq;

// One event of every FieldShoreEvent type. If a new type is added, the union's
// `never` backstop fails the build in describe.ts; this list keeps the runtime honest.
const events: FieldShoreEvent[] = [
  { type: 'OperationCreated', id: 'e', opId, at: at(), by: 'dev1', name: 'Maple St', multiBuilding: false },
  { type: 'OperationEdited', id: 'e', opId, at: at(), by: 'dev1', name: 'Maple St 2' },
  { type: 'OperationEnded', id: 'e', opId, at: at(), by: 'dev1' },
  { type: 'OperationReopened', id: 'e', opId, at: at(), by: 'dev1' },
  { type: 'DivisionAdded', id: 'e', opId, at: at(), by: 'dev1', division: 3 },
  { type: 'SawAdded', id: 'e', opId, at: at(), by: 'dev1', sawId: 'B' },
  { type: 'ShorePointAdded', id: 'e', opId, at: at(), by: 'dev1', shorePoint: sp },
  { type: 'ShorePointEdited', id: 'e', opId, at: at(), by: 'dev1', spId: 'sp1', patch: { assignedResource: 'Rescue 2' } },
  { type: 'ShorePointDeleted', id: 'e', opId, at: at(), by: 'dev1', spId: 'sp1' },
  { type: 'ShorePointRestored', id: 'e', opId, at: at(), by: 'dev1', spId: 'sp1' },
  { type: 'ShorePointStatusChanged', id: 'e', opId, at: at(), by: 'dev1', spId: 'sp1', from: 'process', to: 'cutting' },
  { type: 'CuttingClaimed', id: 'e', opId, at: at(), by: 'dev1', spId: 'sp1', sawId: 'B' },
  { type: 'StrutDeployed', id: 'e', opId, at: at(), by: 'dev1', spId: 'sp1', deployedStrut: { model: 'LS 203', source: 'Rescue 2', inventoryId: 'i1' } },
  { type: 'StrutReturned', id: 'e', opId, at: at(), by: 'dev1', spId: 'sp1' },
  { type: 'EquipmentDeployed', id: 'e', opId, at: at(), by: 'dev1', spId: 'sp1', deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'i1' }, { role: 'top-plate', plateId: 'p1', source: 'Rescue 2', inventoryId: 'i2' }] },
  { type: 'EquipmentReturned', id: 'e', opId, at: at(), by: 'dev1', spId: 'sp1' },
  { type: 'EquipmentReclaimed', id: 'e', opId, at: at(), by: 'dev1', spId: 'sp1' },
  { type: 'ComponentResourced', id: 'e', opId, at: at(), by: 'dev1', spId: 'sp1', componentIndex: 0, source: 'Engine 7' },
  { type: 'PositionAdded', id: 'e', opId, at: at(), by: 'dev1', position: pos },
  { type: 'PositionRemoved', id: 'e', opId, at: at(), by: 'dev1', positionId: 'pos1' },
  { type: 'PositionRenamed', id: 'e', opId, at: at(), by: 'dev1', positionId: 'pos1', title: 'Logistics' },
  { type: 'PositionReparented', id: 'e', opId, at: at(), by: 'dev1', positionId: 'pos1', newParentId: `${opId}:pos-ops` },
  { type: 'PositionReordered', id: 'e', opId, at: at(), by: 'dev1', positionId: 'pos1', order: 1 },
  { type: 'ResourceAssigned', id: 'e', opId, at: at(), by: 'dev1', positionId: `${opId}:pos-ic`, resource: dev },
  { type: 'ResourceCleared', id: 'e', opId, at: at(), by: 'dev1', positionId: `${opId}:pos-ic` },
  { type: 'MyRoleSet', id: 'e', opId, at: at(), by: 'dev1', positionId: `${opId}:pos-ops` },
  { type: 'CommandTransferInitiated', id: 'e', opId, at: at(), by: 'dev1', toResource: { ref: 'individual', value: 'Doyle', label: 'Capt. Doyle' } },
  { type: 'CommandTransferAccepted', id: 'e', opId, at: at(), by: 'dev1' },
  { type: 'CommandTransferDeclined', id: 'e', opId, at: at(), by: 'dev1' },
  { type: 'CommandTransferCancelled', id: 'e', opId, at: at(), by: 'dev1' },
  { type: 'HazardLogged', id: 'e', opId, at: at(), by: 'dev1', hazard },
  { type: 'HazardMitigated', id: 'e', opId, at: at(), by: 'dev1', hazardId: 'h1' },
  { type: 'HazardReopened', id: 'e', opId, at: at(), by: 'dev1', hazardId: 'h1' },
  { type: 'ChecklistItemChecked', id: 'e', opId, at: at(), by: 'dev1', checklistId: 'c', instanceId: 'op1', itemId: 'i', role: 'Safety Officer' },
  { type: 'ChecklistItemUnchecked', id: 'e', opId, at: at(), by: 'dev1', checklistId: 'c', instanceId: 'op1', itemId: 'i', role: 'Safety Officer' },
  { type: 'BriefingStarted', id: 'e', opId, at: at(), by: 'dev1', briefingId: 'b1' },
  { type: 'BriefingEnded', id: 'e', opId, at: at(), by: 'dev1', briefingId: 'b1' },
].map((e, i) => ({ ...e, id: `e${i}` }) as FieldShoreEvent);

describe('describeEventLog', () => {
  const rows = describeEventLog(events, opId);

  it('produces one readable, non-generic row per event with a badge + tone', () => {
    expect(rows).toHaveLength(events.length);
    for (const r of rows) {
      expect(r.text.length).toBeGreaterThan(0);
      expect(r.badge.length).toBeGreaterThan(0);
      expect(r.text).not.toBe('Logged event'); // the never-backstop fallback
    }
  });

  it('resolves a shore point to its radio handle across later events', () => {
    const status = rows.find((r) => r.badge === 'Status')!;
    expect(status.text).toContain('Shore point 7');
    expect(status.text).toContain(STATUS_LABELS.cutting); // the to-status label
    expect(status.detail).toContain(STATUS_LABELS.process); // from-status in the detail
  });

  it('summarizes a deployed bill of materials', () => {
    const deploy = rows.find((r) => r.text.startsWith('Equipment deployed'))!;
    expect(deploy.detail).toContain('1 strut');
    expect(deploy.detail).toContain('1 plate');
  });

  it('attributes a device to its roster label (the only actor name an event log holds)', () => {
    // ResourceAssigned mapped dev1 → "Rescue 2", so every dev1 row carries that actor.
    const status = rows.find((r) => r.badge === 'Status')!;
    expect(status.actor).toBe('Rescue 2');
  });

  it('names a hazard on mitigate/reopen via the logged hazard', () => {
    const mit = rows.find((r) => r.text.startsWith('Hazard mitigated'))!;
    expect(mit.text).toContain('A-side parapet');
  });
});

describe('describeAuditLog', () => {
  const entries: AuditEntry[] = [
    { id: 'a1', type: 'roleAssigned', at: 1, by: 'devA', actor: 'Alex', targetUid: 'uX', roleId: 'r9' },
    { id: 'a2', type: 'memberRevoked', at: 2, by: 'devA', actor: 'Alex', targetUid: 'uX' },
    { id: 'a3', type: 'memberReactivated', at: 3, by: 'devA', actor: 'Alex', targetUid: 'uX' },
    { id: 'a4', type: 'roleCreated', at: 4, by: 'devA', actor: 'Alex', roleId: 'r9', roleName: 'Logistics Chief' },
    { id: 'a5', type: 'roleEdited', at: 5, by: 'devA', actor: 'Alex', roleId: 'default', roleName: 'Default' },
    { id: 'a6', type: 'roleDeleted', at: 6, by: 'devA', actor: 'Alex', roleId: 'r9', reassigned: 2 },
  ];
  const names = { member: (u: string) => (u === 'uX' ? 'T. Okafor' : undefined), role: (id: string) => (id === 'r9' ? 'Logistics Chief' : undefined) };
  const rows = describeAuditLog(entries, names);

  it('produces a readable, non-generic row per entry', () => {
    expect(rows).toHaveLength(entries.length);
    for (const r of rows) {
      expect(r.text.length).toBeGreaterThan(0);
      expect(r.text).not.toContain('Governance action:'); // the unknown-type fallback
    }
  });

  it('resolves member + role names and carries the denormalized actor', () => {
    expect(rows[0]!.text).toBe('T. Okafor assigned role: Logistics Chief');
    expect(rows[0]!.actor).toBe('Alex');
    expect(rows[1]!.text).toContain('access revoked');
    expect(rows[1]!.tone).toBe('danger');
    expect(rows[3]!.text).toContain('Logistics Chief');
    expect(rows[5]!.text).toContain('2 reassigned');
  });

  it('degrades to "a member" when no name is supplied', () => {
    const bare = describeAuditLog([{ id: 'x', type: 'memberRevoked', at: 1, by: 'd', targetUid: 'uX' }]);
    expect(bare[0]!.text).toContain('a member');
  });
});

describe('auditRowsToCsv', () => {
  it('writes a header + a row per entry, using the resolved actor', () => {
    const rows = describeAuditLog([{ id: 'a', type: 'roleCreated', at: 1, by: 'devA', actor: 'Alex', roleName: 'Ops' }]);
    const csv = auditRowsToCsv(rows);
    expect(csv).toContain('When,Type,Action,Detail,By');
    expect(csv).toContain('Alex'); // the actor, not the raw uid
    expect(csv.trimEnd().split('\r\n')).toHaveLength(2);
  });

  it('quotes fields containing commas (RFC-4180)', () => {
    const rows = describeAuditLog([{ id: 'a', type: 'unknownThing', at: 1, by: 'd, x', actor: 'A, B' }]);
    const csv = auditRowsToCsv(rows);
    expect(csv).toContain('"A, B"');
  });
});

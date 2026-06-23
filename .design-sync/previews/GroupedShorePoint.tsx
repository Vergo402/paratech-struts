import { GroupedShorePoint } from 'fieldshore-v4';
import type { ShorePoint } from 'fieldshore-v4';

// GroupedShorePoint — the rolodex stack for a multi-strut shore (a 3-Post writes
// three points sharing a groupId). Collapsed = the active member's full card up
// front with the others fallen left as status-striped tabs; expanded = an
// indented list of all member cards.

const groupBase = {
  opId: 'op-1',
  division: '2',
  area: 'East Stairwell',
  shoreType: '3-post' as const,
  label: 'B-2',
  groupId: 'grp-3post',
  groupTotal: 3,
  seq: 14,
  measurementEighths: 379, // 47 3/8"
  assignedResource: 'Rescue 1',
  deductions: { headerWood: '6x6', footerWood: '6x6', topPlate: 'none', bottomPlate: 'none' },
} as const;

const bom = [
  { role: 'strut' as const, model: 'LS 610', system: 'LongShore' as const, source: 'Rescue 1', inventoryId: 'inv-r1' },
];

const members: ShorePoint[] = [
  { ...groupBase, id: 'sp-14a', groupIndex: 1, status: 'strutset', deployedBom: bom },
  { ...groupBase, id: 'sp-14b', groupIndex: 2, status: 'strutset', deployedBom: bom },
  { ...groupBase, id: 'sp-14c', groupIndex: 3, status: 'process', deployedBom: bom },
];

export const CollapsedStack = () => (
  <div style={{ width: 420, paddingLeft: 8 }}>
    <GroupedShorePoint members={members} onAdvance={() => {}} onStepBack={() => {}} onOpenDetail={() => {}} />
  </div>
);

export const Expanded = () => (
  <div style={{ width: 380 }}>
    <GroupedShorePoint
      members={members}
      defaultExpanded
      onAdvance={() => {}}
      onStepBack={() => {}}
      onOpenDetail={() => {}}
    />
  </div>
);

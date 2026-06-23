import { ShorePointCard } from 'fieldshore-v4';
import type { ShorePoint } from 'fieldshore-v4';

// ShorePointCard — the lifecycle card (card.md). Left-aligned identity, the #N
// system-colored corner tab, the one promoted length number, and per-status
// slide/button controls. These cells walk the lifecycle on realistic USAR points.

const base = {
  opId: 'op-1',
  division: '2',
  area: 'West Wall',
  deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' },
} as const;

// Pending, waiting on inventory — the amber "Waiting" presentation + Assign Equipment.
const pending: ShorePoint = {
  ...base,
  id: 'sp-14',
  seq: 14,
  label: 'B-2',
  shoreType: '3-post',
  measurementEighths: 379, // 47 3/8"
  estimatedLoad: 9000,
  status: 'pending',
  pendingReason: 'no-inventory',
};

// Strut Set — deployed LongShore 812 from Rescue 1, slide to send to Cutting.
const strutset: ShorePoint = {
  ...base,
  id: 'sp-09',
  seq: 9,
  label: 'A-1',
  shoreType: 't-shore',
  measurementEighths: 752, // 94"
  assignedResource: 'Rescue 1',
  status: 'strutset',
  deployedBom: [
    { role: 'strut', model: 'LS 812', system: 'LongShore', source: 'Rescue 1', inventoryId: 'inv-1' },
  ],
};

// Cutting Station card — cut length is the one number; cut-done flag set.
const cutting: ShorePoint = {
  ...base,
  id: 'sp-22',
  seq: 22,
  label: 'C-3',
  shoreType: '3-post',
  measurementEighths: 640, // 80"
  assignedResource: 'Engine 7',
  status: 'cutting',
  cuttingDone: true,
  groupId: 'g-22',
  groupIndex: 1,
  groupTotal: 3,
  deployedBom: [
    { role: 'strut', model: 'LS 610', system: 'LongShore', source: 'Engine 7', inventoryId: 'inv-2' },
  ],
};

// Wood Shore Secured — Remove & Return Equipment is the only forward path.
const secured: ShorePoint = {
  ...base,
  id: 'sp-07',
  seq: 7,
  label: 'D-4',
  shoreType: 't-shore',
  measurementEighths: 564, // 70 1/2"
  assignedResource: 'Squad 5',
  status: 'secured',
  deployedBom: [
    { role: 'strut', model: 'LK 36-57', system: 'LockStroke', source: 'Squad 5', inventoryId: 'inv-3' },
  ],
};

export const PendingWaiting = () => (
  <div style={{ width: 360 }}>
    <ShorePointCard shorePoint={pending} onAssignEquipment={() => {}} onEdit={() => {}} onDelete={() => {}} />
  </div>
);

export const StrutSet = () => (
  <div style={{ width: 360 }}>
    <ShorePointCard shorePoint={strutset} onAdvance={() => {}} onStepBack={() => {}} onOpenDetail={() => {}} />
  </div>
);

export const CuttingStation = () => (
  <div style={{ width: 360 }}>
    <ShorePointCard
      shorePoint={cutting}
      cuttingStation
      onMarkCutDone={() => {}}
      onClearCutDone={() => {}}
      onAdvance={() => {}}
      onStepBack={() => {}}
    />
  </div>
);

export const Secured = () => (
  <div style={{ width: 360 }}>
    <ShorePointCard shorePoint={secured} onRemoveReturn={() => {}} onStepBack={() => {}} onOpenDetail={() => {}} />
  </div>
);

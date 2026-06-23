import { CuttingStation } from 'fieldshore-v4';
import type { ShorePoint } from 'fieldshore-v4';

// CuttingStation — the cut-to-length workstation (#222/#354). A FIFO queue of
// `cutting` shore points: a big "Cut this now" hero (cut length the one promoted
// number) over a compact read-only "up next" list, then the sent-to-runner tail.

const cutBase = {
  opId: 'op-1',
  division: '2',
  area: 'West Wall',
  shoreType: '3-post' as const,
  deductions: { headerWood: '6x6', footerWood: '6x6', topPlate: 'none', bottomPlate: 'none' },
  status: 'cutting' as const,
} as const;

const bom = (rig: string) => [
  { role: 'strut' as const, model: 'LS 610', system: 'LongShore' as const, source: rig, inventoryId: `inv-${rig}` },
];

const queue: ShorePoint[] = [
  {
    ...cutBase,
    id: 'sp-22',
    seq: 22,
    label: 'B-2',
    measurementEighths: 640, // 80"
    assignedResource: 'Engine 7',
    cuttingStartedAt: 1000,
    cuttingDone: false,
    deployedBom: bom('Engine 7'),
  },
  {
    ...cutBase,
    id: 'sp-23',
    seq: 23,
    label: 'C-3',
    area: 'East Stairwell',
    measurementEighths: 564, // 70 1/2"
    assignedResource: 'Rescue 1',
    cuttingStartedAt: 2000,
    deployedBom: bom('Rescue 1'),
  },
  {
    ...cutBase,
    id: 'sp-24',
    seq: 24,
    label: 'D-4',
    shoreType: 't-shore',
    measurementEighths: 752, // 94"
    assignedResource: 'Squad 5',
    cuttingStartedAt: 3000,
    deployedBom: bom('Squad 5'),
  },
];

const sent: ShorePoint[] = [
  {
    ...cutBase,
    id: 'sp-19',
    seq: 19,
    label: 'A-1',
    status: 'runner',
    measurementEighths: 480, // 60"
    assignedResource: 'Ladder 3',
    deployedBom: bom('Ladder 3'),
  },
];

const noop = () => {};

export const Queue = () => (
  <div style={{ width: 420 }}>
    <CuttingStation
      queue={queue}
      sent={sent}
      onMarkCutDone={noop}
      onClearCutDone={noop}
      onSendToRunner={noop}
      onStepBack={noop}
    />
  </div>
);

// (No empty-state cell: CuttingStation renders nothing when the queue is empty —
//  the workstation only exists while there are cuts. A blank card isn't a design state.)

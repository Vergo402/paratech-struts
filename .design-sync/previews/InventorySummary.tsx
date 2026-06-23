import { InventorySummary } from 'fieldshore-v4';
import type { InventoryItem, Apparatus } from 'fieldshore-v4';

// InventorySummary — the per-apparatus stock rollup. Each rig groups its struts,
// extensions, and plates; the available/quantity count tones depleted (0) / low
// (1) / ok. External (off-roster) rigs sink to the bottom with an "External" tag.

const roster: Apparatus[] = [
  { id: 'r1', name: 'Rescue 1', type: 'Rescue' },
  { id: 'e7', name: 'Engine 7', type: 'Engine' },
];

const items: InventoryItem[] = [
  { id: 'i1', type: 'strut', model: 'LS 812', system: 'LongShore', apparatus: 'Rescue 1', apparatusId: 'r1', quantity: 4, available: 2 },
  { id: 'i2', type: 'strut', model: 'LK 36-57', system: 'LockStroke', apparatus: 'Rescue 1', apparatusId: 'r1', quantity: 6, available: 1 },
  { id: 'i3', type: 'extension', length: 12, system: 'LongShore', apparatus: 'Rescue 1', apparatusId: 'r1', quantity: 4, available: 4 },
  { id: 'i4', type: 'plate', plateId: 'swivel6', apparatus: 'Rescue 1', apparatusId: 'r1', quantity: 8, available: 0 },
  { id: 'i5', type: 'strut', model: 'LS 610', system: 'LongShore', apparatus: 'Engine 7', apparatusId: 'e7', quantity: 4, available: 3 },
  { id: 'i6', type: 'plate', plateId: 'hinged6', apparatus: 'Engine 7', apparatusId: 'e7', quantity: 6, available: 5 },
  // An off-roster (external) cache.
  { id: 'i7', type: 'strut', model: 'LS 1016', system: 'LongShore', apparatus: 'TF-2 Cache', apparatusId: 'ext-tf2', quantity: 2, available: 2 },
];

export const TwoRigsPlusExternal = () => (
  <div style={{ width: 380 }}>
    <InventorySummary items={items} roster={roster} />
  </div>
);

export const Empty = () => (
  <div style={{ width: 380 }}>
    <InventorySummary items={[]} roster={roster} />
  </div>
);

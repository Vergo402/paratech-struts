import { ApparatusScopeTabs } from 'fieldshore-v4';

// ApparatusScopeTabs — the inventory apparatus scope selector: a real horizontal
// tablist (roving tabindex, arrow-key nav) that scrolls so a 20-rig task force
// still works on a phone. Each tab names a rig + its item count. Controlled on the
// selected rig id; static onChange.
const noop = () => {};

export const TwoRigs = () => (
  <ApparatusScopeTabs
    rigs={[
      { id: 'all', name: 'All apparatus', count: 42 },
      { id: 'e7', name: 'Engine 7', count: 18 },
    ]}
    value="e7"
    onChange={noop}
  />
);

export const TaskForceScroll = () => (
  // Federal task-force scale — the strip scrolls; Rescue 1 is the selected scope.
  <ApparatusScopeTabs
    rigs={[
      { id: 'all', name: 'All apparatus', count: 168 },
      { id: 'r1', name: 'Rescue 1', count: 36 },
      { id: 'e7', name: 'Engine 7', count: 18 },
      { id: 'l3', name: 'Ladder 3', count: 24 },
      { id: 'sq2', name: 'Squad 2', count: 22 },
      { id: 'tf1', name: 'Task Force 1', count: 48 },
    ]}
    value="r1"
    onChange={noop}
  />
);

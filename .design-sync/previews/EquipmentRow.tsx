import { EquipmentRow } from 'fieldshore-v4';

// EquipmentRow — one stock row on an apparatus: identity (+ collapsed/extended
// span for struts), a deployed-count dot badge when quantity − available > 0, and
// a ± stepper showing available / quantity. Static handlers — the screenshot
// freezes the count.
const noop = () => {};

export const StrutInStock = () => (
  <EquipmentRow
    item={{ id: 's1', type: 'strut', model: 'LS 812', quantity: 6, available: 6 }}
    onIncrement={noop}
    onDecrement={noop}
  />
);

export const StrutPartlyDeployed = () => (
  // 2 of 6 deployed on this rig — the deployed badge and the available count agree.
  <EquipmentRow
    item={{ id: 's2', type: 'strut', model: 'LS 812', quantity: 6, available: 4 }}
    onIncrement={noop}
    onDecrement={noop}
  />
);

export const Extension = () => (
  <EquipmentRow
    item={{ id: 'e1', type: 'extension', length: 36, quantity: 8, available: 5 }}
    onIncrement={noop}
    onDecrement={noop}
  />
);

export const PlateAllOut = () => (
  // Every Multi-Base deployed — minus is disabled, the deployed badge reads full.
  <EquipmentRow
    item={{ id: 'p1', type: 'plate', plateId: 'multi', quantity: 4, available: 0 }}
    onIncrement={noop}
    onDecrement={noop}
  />
);

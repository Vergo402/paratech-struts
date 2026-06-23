import { SystemFilter } from 'fieldshore-v4';

// SystemFilter — the v3 Quick Find strut-system chips (Gold / Grey / LockStroke)
// carried to v4 as multi-select. Empty set = no filter (all systems). The dot
// color matches the RecommendationCard stripe so the chip reads as field identity.
// Controlled on a Set of system keys; static onChange freezes the selection.
const noop = () => {};

export const NoFilter = () => (
  // Default cold-open: nothing selected, every system shown.
  <SystemFilter value={new Set()} onChange={noop} />
);

export const GoldOnly = () => (
  // Narrowed to the Gold system (LongShore / LK struts).
  <SystemFilter value={new Set(['gold'])} onChange={noop} />
);

export const TwoSystems = () => (
  // Gold + LockStroke both active — Grey filtered out.
  <SystemFilter value={new Set(['gold', 'lockstroke'])} onChange={noop} />
);
